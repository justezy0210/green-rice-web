#!/usr/bin/env python3
"""Build sv_releases/sv_v1 — event-normalized SV matrix from the Cactus pangenome VCF.

Input:  data/green-rice-pg.vcf.gz   (vg deconstruct → vcfbub clip → bcftools concat,
                                     11 panel samples + IRGSP reference)

Output:
  Firestore
    sv_releases/{svReleaseId}                         release header

  Storage
    sv_matrix/{svReleaseId}/manifest.json             chr/type summary
    sv_matrix/{svReleaseId}/events/by_chr/{chr}.json.gz
                                                      per-chr event list
                                                      (event metadata + per-cultivar GT)
    sv_matrix/{svReleaseId}/group_freq/by_trait/{trait}.json.gz
                                                      per-event per-group allele freq
                                                      for one trait's grouping

Event selection:
  - Top-level snarl only (LV=0).
  - |len(REF) - len(ALT0)| >= 50 bp.
  - SV type from REF/ALT length (INS / DEL / COMPLEX). Inversions fall
    into COMPLEX because vg deconstruct resolves them as equivalent paths
    rather than explicit INV records.

Usage:
  python3 scripts/build-sv-matrix.py --dry-run
  python3 scripts/build-sv-matrix.py                 # live
  python3 scripts/build-sv-matrix.py --sv-version 1  # override release id
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
import re
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

BUCKET = "green-rice-db.firebasestorage.app"
DEFAULT_VCF = PROJECT_ROOT / "data" / "green-rice-pg.vcf.gz"
SV_MIN_LEN_BP = 50
SCHEMA_VERSION = 1


@dataclass
class RawRecord:
    chrom: str
    pos: int
    vid: str
    ref: str
    alt: str  # primary alt (first)
    lv: int
    parent_snarl: str | None
    gts: list[str]


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage

    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            credentials.Certificate(str(sa)), {"storageBucket": BUCKET}
        )
    return firestore.client(), storage.bucket()


def parse_vcf(path: Path):
    """Return (sample_names, RawRecord generator). The generator owns the
    file handle and closes it on exhaustion; the caller must consume it to
    completion."""
    lv_re = re.compile(r"(?:^|;)LV=(\d+)")
    ps_re = re.compile(r"(?:^|;)PS=([^;]+)")
    fh = gzip.open(path, "rt")
    samples: list[str] | None = None
    for line in fh:
        if line.startswith("##"):
            continue
        if line.startswith("#CHROM"):
            parts = line.rstrip("\n").split("\t")
            samples = parts[9:]
            break
    if samples is None:
        fh.close()
        raise RuntimeError("VCF header missing #CHROM line")

    def gen():
        try:
            for line in fh:
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 10:
                    continue
                chrom = parts[0]
                pos = int(parts[1])
                vid = parts[2]
                ref = parts[3]
                alt = parts[4].split(",")[0]
                info = parts[7]
                m_lv = lv_re.search(info)
                lv = int(m_lv.group(1)) if m_lv else -1
                m_ps = ps_re.search(info)
                parent = m_ps.group(1) if m_ps else None
                gts = [p.split(":", 1)[0] for p in parts[9:]]
                yield RawRecord(chrom, pos, vid, ref, alt, lv, parent, gts)
        finally:
            fh.close()

    return samples, gen()


def classify_event(ref: str, alt: str) -> tuple[str, int] | None:
    ref_len = len(ref)
    alt_len = len(alt)
    diff = alt_len - ref_len
    if abs(diff) < SV_MIN_LEN_BP and (ref_len < SV_MIN_LEN_BP or alt_len < SV_MIN_LEN_BP):
        return None
    if diff >= SV_MIN_LEN_BP:
        return "INS", diff
    if -diff >= SV_MIN_LEN_BP:
        return "DEL", diff
    if ref_len >= SV_MIN_LEN_BP and alt_len >= SV_MIN_LEN_BP:
        return "COMPLEX", diff
    return None


def load_grouping_docs(db) -> dict[str, dict]:
    docs: dict[str, dict] = {}
    for snap in db.collection("groupings").stream():
        docs[snap.id] = snap.to_dict() or {}
    return docs


def compute_group_freq(
    event_gts: list[str],
    sample_names: list[str],
    cultivar_to_group: dict[str, str],
) -> dict[str, dict]:
    """Return {groupLabel: {alt: int, total: int, freq: float}}."""
    out: dict[str, dict] = defaultdict(lambda: {"alt": 0, "total": 0})
    for gt, sample in zip(event_gts, sample_names):
        group = cultivar_to_group.get(sample)
        if not group:
            continue
        alleles = gt.replace("|", "/").split("/")
        for a in alleles:
            if a in ("", "."):
                continue
            out[group]["total"] += 1
            if a != "0":
                out[group]["alt"] += 1
    result: dict[str, dict] = {}
    for group, d in out.items():
        freq = d["alt"] / d["total"] if d["total"] else 0.0
        result[group] = {"alt": d["alt"], "total": d["total"], "freq": round(freq, 4)}
    return result


def write_storage_json_gz(bucket, path: str, body: dict, *, dry_run: bool, out_dir: Path):
    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, compresslevel=6)
    if dry_run:
        target = out_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        print(f"  dry-run wrote {path}  raw {len(raw)/1024:.1f} KB · gz {len(gz)/1024:.1f} KB")
        return
    blob = bucket.blob(path)
    blob.content_encoding = "gzip"
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_string(gz, content_type="application/json; charset=utf-8")
    print(f"  uploaded {path}  raw {len(raw)/1024:.1f} KB · gz {len(gz)/1024:.1f} KB")


def write_storage_json(bucket, path: str, body: dict, *, dry_run: bool, out_dir: Path):
    raw = json.dumps(body, indent=2).encode("utf-8")
    if dry_run:
        target = out_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        print(f"  dry-run wrote {path}  raw {len(raw)/1024:.1f} KB")
        return
    blob = bucket.blob(path)
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_string(raw, content_type="application/json; charset=utf-8")
    print(f"  uploaded {path}  raw {len(raw)/1024:.1f} KB")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vcf", type=Path, default=DEFAULT_VCF)
    ap.add_argument("--sv-version", type=int, default=1)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp")
    args = ap.parse_args()

    sv_release_id = f"sv_v{args.sv_version}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if not args.vcf.exists():
        raise SystemExit(f"VCF not found: {args.vcf}")

    db, bucket = init_firebase()

    print(f"Loading grouping documents…")
    groupings = load_grouping_docs(db) if not args.dry_run else load_grouping_docs(db)
    print(f"  {len(groupings)} trait groupings loaded")

    # Single streaming pass over the VCF:
    # - emit per-chr event lists (with per-sample GT)
    # - for each event, compute per-trait group freq on the fly
    print(f"Streaming {args.vcf}…")
    samples, record_iter = parse_vcf(args.vcf)
    print(f"  samples: {samples}")

    events_by_chr: dict[str, list[dict]] = defaultdict(list)
    trait_group_freq: dict[str, list[dict]] = defaultdict(list)
    type_counts: dict[str, int] = defaultdict(int)
    chr_counts: dict[str, int] = defaultdict(int)

    # Precompute cultivar → group maps per trait (once)
    cultivar_to_group_per_trait: dict[str, dict[str, str]] = {}
    for trait_id, doc in groupings.items():
        assignments = doc.get("assignments") or {}
        cultivar_to_group_per_trait[trait_id] = {
            cid: a.get("groupLabel")
            for cid, a in assignments.items()
            if a.get("groupLabel") and not a.get("borderline", False)
        }

    total_read = 0
    event_counter = 0
    t_start = time.time()
    for r in record_iter:
        total_read += 1
        if total_read % 500_000 == 0:
            elapsed = time.time() - t_start
            print(f"  scanned {total_read:,} records · {event_counter:,} SV events · {elapsed:.1f}s")
        if r.lv != 0:
            continue
        cls = classify_event(r.ref, r.alt)
        if cls is None:
            continue
        sv_type, diff = cls
        event_counter += 1
        event_id = f"EV{event_counter:07d}"
        event = {
            "eventId": event_id,
            "chr": r.chrom,
            "pos": r.pos,
            "refLen": len(r.ref),
            "altLen": len(r.alt),
            "svLen": diff,                     # signed
            "svLenAbs": abs(diff),
            "svType": sv_type,
            "parentSnarl": r.parent_snarl,
            "originalId": r.vid,
            "gts": dict(zip(samples, r.gts)),
        }
        events_by_chr[r.chrom].append(event)
        type_counts[sv_type] += 1
        chr_counts[r.chrom] += 1
        # Per-trait group freq for this event — light enough to do inline
        for trait_id, c2g in cultivar_to_group_per_trait.items():
            gf = compute_group_freq(r.gts, samples, c2g)
            if not gf:
                continue
            trait_group_freq[trait_id].append({"eventId": event_id, "byGroup": gf})

    print(
        f"Done scan. {total_read:,} records → {event_counter:,} SV events "
        f"in {time.time() - t_start:.1f}s"
    )
    print(f"  Type counts: {dict(type_counts)}")
    print(f"  Chr distribution: {dict(chr_counts)}")

    # ─── Write Storage artifacts ────────────────────────────────────────────

    # per-chr event bundles
    for chrom, evs in sorted(events_by_chr.items()):
        write_storage_json_gz(
            bucket,
            f"sv_matrix/{sv_release_id}/events/by_chr/{chrom}.json.gz",
            {
                "schemaVersion": SCHEMA_VERSION,
                "svReleaseId": sv_release_id,
                "chr": chrom,
                "samples": samples,
                "count": len(evs),
                "events": evs,
            },
            dry_run=args.dry_run,
            out_dir=args.out_dir,
        )

    # per-trait group-freq bundles
    for trait_id, rows in sorted(trait_group_freq.items()):
        doc = groupings[trait_id]
        group_labels = sorted(
            {a.get("groupLabel") for a in (doc.get("assignments") or {}).values() if a.get("groupLabel")}
        )
        write_storage_json_gz(
            bucket,
            f"sv_matrix/{sv_release_id}/group_freq/by_trait/{trait_id}.json.gz",
            {
                "schemaVersion": SCHEMA_VERSION,
                "svReleaseId": sv_release_id,
                "traitId": trait_id,
                "groupingVersion": int(doc.get("summary", {}).get("version") or 0),
                "groupLabels": group_labels,
                "count": len(rows),
                "byEvent": rows,
            },
            dry_run=args.dry_run,
            out_dir=args.out_dir,
        )

    # manifest
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "svReleaseId": sv_release_id,
        "sourceVcf": str(args.vcf.name),
        "samples": samples,
        "sampleCount": len(samples),
        "normalizationMethod": "vg_deconstruct + vcfbub_clip + bcftools_concat, LV=0 filter + len >= 50 bp",
        "eventCount": event_counter,
        "typeCounts": dict(type_counts),
        "chrCounts": dict(chr_counts),
        "traitsWithGroupFreq": sorted(trait_group_freq.keys()),
        "builtAt": now_iso,
    }
    write_storage_json(
        bucket,
        f"sv_matrix/{sv_release_id}/manifest.json",
        manifest,
        dry_run=args.dry_run,
        out_dir=args.out_dir,
    )

    # ─── Firestore release header ───────────────────────────────────────────
    release_doc = {
        "svReleaseId": sv_release_id,
        "normalizationMethod": manifest["normalizationMethod"],
        "sourceVcf": manifest["sourceVcf"],
        "sampleSet": samples,
        "eventCount": event_counter,
        "chunkManifestPath": f"sv_matrix/{sv_release_id}/manifest.json",
        "status": "ready",
        "createdAt": now_iso,
    }
    if args.dry_run:
        out = args.out_dir / f"sv_releases/{sv_release_id}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(release_doc, indent=2))
        print(f"  dry-run wrote sv_releases/{sv_release_id}.json")
    else:
        db.collection("sv_releases").document(sv_release_id).set(release_doc)
        print(f"  wrote Firestore sv_releases/{sv_release_id}")

    print(f"\nDone. sv_release_id={sv_release_id} · events={event_counter} · dry_run={args.dry_run}")
    return 0


_ = io  # keep import even if not used
if __name__ == "__main__":
    sys.exit(main())
