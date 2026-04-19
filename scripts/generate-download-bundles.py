#!/usr/bin/env python3
"""Generate the discovery-download bundles into a staging directory.

Reads the active (orthofinderVersion, groupingVersion) pair from
`data/download_versions.json`, pulls per-trait diff + grouping state
from Firestore, pulls supporting artifacts from Storage, and writes the
per-trait + cross-trait bundles plus a staging `_manifest.json` into a
run-scoped staging prefix.

This script DOES NOT publish the manifest or overwrite any final
prefix. Promote is a separate step (`scripts/promote-download-bundles.py`
or manual `gsutil`-equivalent) that runs only after
`scripts/verify-download-bundles.ts` is green.

Usage:
  # Dry-run to a local directory (no Firebase writes):
  python scripts/generate-download-bundles.py --dry-run --out /tmp/dl_staging

  # Upload staging to Firebase Storage (requires service-account.json):
  python scripts/generate-download-bundles.py --out-bucket
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.candidates import classify, effect_sign  # noqa: E402
from shared.manifests import (  # noqa: E402
    load_cultivars,
    load_download_versions,
    load_traits,
)
from shared.reference import IRGSP_DISPLAY_NAME, IRGSP_LONG_NAME  # noqa: E402
from shared.storage_paths import (  # noqa: E402
    download_cross_trait_dir,
    download_manifest_path,
    download_staging_dir,
    download_trait_dir,
    orthofinder_og_descriptions_path,
)

# ─────────────────────────────────────────────────────────────
# Column schema — mirrors rev2 §4a
# ─────────────────────────────────────────────────────────────

CANDIDATES_COLUMNS = [
    "trait", "ogId", "rank", "pValue", "pValueAdjBH", "log2FC",
    "effectSize", "effectSizeSign", "groupLabels", "nPerGroup", "nMissing",
    "irgspRepresentative", "description", "llmCategory", "analysisStatus",
    "orthofinderVersion", "groupingVersion",
]

CROSS_TRAIT_COLUMNS = [
    "trait", "ogId", "rank", "pValue", "pValueAdjBH", "log2FC",
    "effectSize", "effectSizeSign", "irgspRepresentative", "description",
    "orthofinderVersion", "groupingVersion",
]

BED_COLUMNS = [
    "chrom", "start", "end", "name", "score", "strand",
    "ogId", "transcriptId", "source",
]

NA = "NA"


# ─────────────────────────────────────────────────────────────
# Formatting helpers
# ─────────────────────────────────────────────────────────────


def fmt_pvalue(v: float | None) -> str:
    if v is None:
        return NA
    if v == 0:
        return "0.00000e+00"
    return f"{v:.5e}"


def fmt_float4(v: float | None) -> str:
    if v is None:
        return NA
    return f"{v:.4f}"


def strip_ws(s: str | None) -> str:
    if s is None or s == "":
        return NA
    return re.sub(r"[\t\r\n]+", " ", s).strip() or NA


def pipe_join(parts: Iterable[Any]) -> str:
    return "|".join(str(p) for p in parts)


def write_tsv(path: Path, header_comments: list[str], columns: list[str], rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for line in header_comments:
            f.write(line + "\n")
        f.write("\t".join(columns) + "\n")
        for row in rows:
            f.write("\t".join(row) + "\n")


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ─────────────────────────────────────────────────────────────
# IRGSP GFF3 index (transcript id → gene coordinates)
# ─────────────────────────────────────────────────────────────

_TRANSCRIPT_VARIANTS_RE = re.compile(r"Transcript variants=([^;]+)")


@dataclass(frozen=True)
class GeneCoord:
    chrom: str
    start: int      # 1-based inclusive from GFF
    end: int        # 1-based inclusive
    strand: str


def build_transcript_index(gff_path: Path) -> dict[str, GeneCoord]:
    """Map transcript id (e.g. Os01t0100100-01) to its parent gene's coords.

    The supplied IRGSP GFF3 has only `gene` rows; transcript ids appear in
    the `Transcript variants=` attribute. All transcripts of a gene share
    the gene's span — this is a limitation of the source annotation. The
    README documents it.
    """
    index: dict[str, GeneCoord] = {}
    with open(gff_path) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 9 or parts[2] != "gene":
                continue
            chrom, _, _, start_s, end_s, _, strand, _, attrs = parts
            m = _TRANSCRIPT_VARIANTS_RE.search(attrs)
            if not m:
                continue
            start = int(start_s)
            end = int(end_s)
            coord = GeneCoord(chrom=chrom, start=start, end=end, strand=strand or ".")
            for t in m.group(1).split(","):
                t = t.strip()
                if t:
                    index[t] = coord
    return index


# ─────────────────────────────────────────────────────────────
# Diff / grouping / descriptions sources
# ─────────────────────────────────────────────────────────────


@dataclass
class DiffEntry:
    og_id: str
    p_value: float
    p_value_adj_bh: float | None
    log2_fc: float | None
    effect_size: float | None
    irgsp_transcripts: list[str]
    description: str | None
    llm_category: str | None


@dataclass
class GroupingSummary:
    usable: bool
    method: str
    group_labels: list[str]
    group_sizes: list[int]
    n_observed: int
    n_missing: int
    note: str


def load_diff_from_firestore(db, bucket, trait: str) -> list[DiffEntry]:
    """Read per-trait diff. If the Firestore doc carries a Storage payload
    path, fetch entries from there; otherwise fall back to the doc's
    legacy `top[]` field."""
    doc = db.collection("orthogroup_diffs").document(trait).get()
    if not doc.exists:
        return []
    data = doc.to_dict()
    entries_raw: list[dict]
    storage_path = data.get("storagePath")
    if storage_path:
        blob = bucket.blob(storage_path)
        if blob.exists():
            payload = json.loads(blob.download_as_text())
            entries_raw = payload.get("entries", [])
        else:
            entries_raw = []
    else:
        entries_raw = data.get("top") or []

    out: list[DiffEntry] = []
    for e in entries_raw:
        rep = e.get("representative") or {}
        transcripts = list(rep.get("transcripts") or [])
        descriptions_map = rep.get("descriptions") or {}
        # Prefer first non-"NA" description, else first available, else None
        description: str | None = None
        for tx in transcripts:
            d = descriptions_map.get(tx)
            if d and d != "NA":
                description = d
                break
        if description is None and transcripts:
            description = descriptions_map.get(transcripts[0])
        out.append(
            DiffEntry(
                og_id=e["orthogroup"],
                p_value=float(e.get("pValue", 1.0)),
                p_value_adj_bh=e.get("pValueAdj") if e.get("pValueAdj") is not None else None,
                log2_fc=e.get("log2FC") if e.get("log2FC") is not None else None,
                effect_size=e.get("effectSize") if e.get("effectSize") is not None else None,
                irgsp_transcripts=transcripts,
                description=description,
                llm_category=e.get("llmCategory"),
            )
        )
    return out


def load_grouping_from_firestore(db, trait: str) -> GroupingSummary:
    doc = db.collection("groupings").document(trait).get()
    if not doc.exists:
        return GroupingSummary(
            usable=False, method="none", group_labels=[], group_sizes=[],
            n_observed=0, n_missing=0, note="no grouping document",
        )
    data = doc.to_dict()
    summary = data.get("summary") or {}
    quality = data.get("quality") or {}
    assignments = data.get("assignments") or {}

    # Derive group sizes from non-borderline assignments
    sizes: dict[str, int] = {}
    for a in assignments.values():
        lbl = a.get("groupLabel")
        if not lbl or a.get("borderline"):
            continue
        sizes[lbl] = sizes.get(lbl, 0) + 1

    labels = sorted(sizes.keys())
    return GroupingSummary(
        usable=bool(quality.get("usable", False)),
        method=summary.get("method", "none"),
        group_labels=labels,
        group_sizes=[sizes[l] for l in labels],
        n_observed=int(quality.get("nObserved", 0)),
        n_missing=max(0, int(quality.get("nObserved", 0)) - int(quality.get("nUsedInModel", 0))),
        note=str(quality.get("note", "")),
    )


# ─────────────────────────────────────────────────────────────
# Copy-count matrix loader
# ─────────────────────────────────────────────────────────────


def load_copycount_tsv(bucket, active_of: int) -> tuple[list[str], dict[str, dict[str, int]]]:
    """Load Orthogroups.GeneCount.tsv (active-version output). Returns
    (cultivar ids as they appear in the TSV header, {ogId: {cultivar: count}}).
    """
    blob_path = f"orthofinder/v{active_of}/Orthogroups.GeneCount.tsv"
    blob = bucket.blob(blob_path)
    if not blob.exists():
        raise RuntimeError(
            f"Missing {blob_path}. Upload Orthogroups.GeneCount.tsv for v{active_of} first."
        )
    text = blob.download_as_text()
    lines = text.rstrip("\n").split("\n")
    header = lines[0].split("\t")
    # First column is Orthogroup; last column may be 'Total'.
    cultivar_cols = [
        c.replace("_longest", "") for c in header[1:] if c != "Total"
    ]
    counts: dict[str, dict[str, int]] = {}
    for line in lines[1:]:
        cells = line.split("\t")
        if len(cells) < 2:
            continue
        og = cells[0]
        per = {}
        for i, c in enumerate(cultivar_cols, start=1):
            try:
                per[c] = int(cells[i])
            except (IndexError, ValueError):
                per[c] = 0
        counts[og] = per
    return cultivar_cols, counts


# ─────────────────────────────────────────────────────────────
# Writers — per-trait files
# ─────────────────────────────────────────────────────────────


def panel_comment_lines(kind: str, trait: str | None, of: int, g: int) -> list[str]:
    header = [
        f"#green_rice_db_{kind}  v{of}_g{g}"
        + (f"  trait={trait}" if trait else ""),
        "#panel: 16 Korean temperate japonica cultivars in this panel — not pan-Korean rice",
        "#pangenome_coverage: 11 of 16 cultivars present in Cactus pangenome VCF",
        "#not_marker_ready  not_primer_ready  not_causal",
    ]
    return header


def write_candidates_tsv(
    out_path: Path, trait: str, of: int, g: int, grouping: GroupingSummary, entries: list[DiffEntry]
) -> None:
    comments = panel_comment_lines("candidates", trait, of, g) + [
        "#coords_source: IRGSP-1.0 reference coordinates where applicable",
        "#reading this file: header is the first non-# line",
    ]
    rows: list[list[str]] = []
    if grouping.usable and entries:
        labels_str = pipe_join(grouping.group_labels)
        sizes_str = pipe_join(grouping.group_sizes)
        # Rank: asc pValue with tie-break ogId asc
        sorted_entries = sorted(entries, key=lambda e: (e.p_value, e.og_id))
        for i, e in enumerate(sorted_entries, start=1):
            status = classify(e.p_value, e.p_value_adj_bh, e.effect_size)
            rows.append([
                trait, e.og_id, str(i),
                fmt_pvalue(e.p_value), fmt_pvalue(e.p_value_adj_bh),
                fmt_float4(e.log2_fc), fmt_float4(e.effect_size),
                effect_sign(e.effect_size),
                labels_str, sizes_str, str(grouping.n_missing),
                (",".join(e.irgsp_transcripts) if e.irgsp_transcripts else NA),
                strip_ws(e.description),
                strip_ws(e.llm_category),
                status,
                str(of), str(g),
            ])
    write_tsv(out_path, comments, CANDIDATES_COLUMNS, rows)


def write_bed(
    out_path: Path, trait: str, of: int, g: int, grouping: GroupingSummary,
    entries: list[DiffEntry], transcript_index: dict[str, GeneCoord],
) -> None:
    comments = panel_comment_lines("bed", trait, of, g) + [
        "#coords: IRGSP-1.0, 0-based half-open (BED convention)",
        "#extras_after_bed6: ogId transcriptId source",
        "#score_rule: clamp(round(-log10(pValue) * 100), 0, 1000)",
    ]
    rows: list[list[str]] = []
    if grouping.usable and entries:
        for e in entries:
            # Score: clamp(round(-log10(p) * 100), 0, 1000)
            if e.p_value and e.p_value > 0:
                score = min(1000, max(0, round(-math.log10(e.p_value) * 100)))
            else:
                score = 1000
            for tx in e.irgsp_transcripts:
                coord = transcript_index.get(tx)
                if coord is None:
                    continue
                # GFF is 1-based inclusive; BED is 0-based half-open
                start_bed = coord.start - 1
                end_bed = coord.end
                rows.append([
                    coord.chrom, str(start_bed), str(end_bed),
                    f"{e.og_id}:{tx}", str(score), coord.strand,
                    e.og_id, tx, "irgsp_representative",
                ])
        # Sort: chrom ASCII asc, start asc
        rows.sort(key=lambda r: (r[0], int(r[1])))
    write_tsv(out_path, comments, BED_COLUMNS, rows)


def write_copycount_matrix(
    out_path: Path, trait: str, of: int, g: int, grouping: GroupingSummary,
    entries: list[DiffEntry], pangenome_cultivars: list[str],
    og_counts: dict[str, dict[str, int]],
) -> None:
    comments = panel_comment_lines("copycount_matrix", trait, of, g) + [
        f"#panel_row_denominator: {len(pangenome_cultivars)} cultivars (Cactus pangenome participants only)",
        "#panel_all_16_cultivars_phenotype_is_in_candidates.tsv_not_this_file",
        "#source: Orthogroups.GeneCount.tsv",
    ]
    cols = ["ogId"] + list(pangenome_cultivars)
    rows: list[list[str]] = []
    if grouping.usable and entries:
        for e in sorted(entries, key=lambda x: (x.p_value, x.og_id)):
            per = og_counts.get(e.og_id, {})
            rows.append([e.og_id] + [str(int(per.get(c, 0))) for c in pangenome_cultivars])
    write_tsv(out_path, comments, cols, rows)


# ─────────────────────────────────────────────────────────────
# Cross-trait file
# ─────────────────────────────────────────────────────────────


def write_cross_trait(
    out_path: Path, of: int, g: int,
    per_trait_ranked: dict[str, list[tuple[int, DiffEntry]]],
) -> None:
    comments = panel_comment_lines("cross_trait_candidates", None, of, g) + [
        "#warning: ranks are per-trait and NOT comparable across traits",
        "#warning: an OG appearing under multiple traits does not imply pleiotropy — each row is an independent analysis",
    ]
    rows: list[list[str]] = []
    for trait in sorted(per_trait_ranked.keys()):
        for rank, e in sorted(per_trait_ranked[trait], key=lambda x: (x[0], x[1].og_id)):
            rows.append([
                trait, e.og_id, str(rank),
                fmt_pvalue(e.p_value), fmt_pvalue(e.p_value_adj_bh),
                fmt_float4(e.log2_fc), fmt_float4(e.effect_size),
                effect_sign(e.effect_size),
                (",".join(e.irgsp_transcripts) if e.irgsp_transcripts else NA),
                strip_ws(e.description),
                str(of), str(g),
            ])
    write_tsv(out_path, comments, CROSS_TRAIT_COLUMNS, rows)


# ─────────────────────────────────────────────────────────────
# README rendering
# ─────────────────────────────────────────────────────────────


def render_readme(
    template_path: Path, bundle_dir: Path, *,
    bundle_kind: str, trait: str | None, of: int, g: int,
    generated_at: str, app_version: str, bundle_status: str,
    file_sizes: list[tuple[str, int]],
) -> str:
    text = template_path.read_text()

    # {{#trait}}...{{/trait}} conditional
    trait_block = re.compile(r"\{\{#trait\}\}(.*?)\{\{/trait\}\}", re.DOTALL)
    if trait:
        text = trait_block.sub(lambda m: m.group(1).replace("{{traitId}}", trait), text)
    else:
        text = trait_block.sub("", text)

    # File table
    lines = ["| File | Size (bytes) |", "|---|---|"]
    for name, size in file_sizes:
        lines.append(f"| `{name}` | {size} |")
    file_table = "\n".join(lines)

    replacements = {
        "{{bundleKind}}": bundle_kind,
        "{{traitId}}": trait or "",
        "{{orthofinderVersion}}": str(of),
        "{{groupingVersion}}": str(g),
        "{{generatedAt}}": generated_at,
        "{{appVersion}}": app_version,
        "{{fileTable}}": file_table,
        "{{bundleStatus}}": bundle_status,
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


# ─────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────


def git_short_hash() -> str:
    try:
        import subprocess
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=PROJECT_ROOT,
        ).decode().strip()
        return out
    except Exception:
        return os.environ.get("APP_VERSION", "unknown")


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage

    sa_path = PROJECT_ROOT / "service-account.json"
    if not sa_path.exists():
        raise RuntimeError(
            "service-account.json missing. Either run with --dry-run or "
            "place the service account key at the repo root."
        )
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(
            cred, {"storageBucket": "green-rice-db.firebasestorage.app"}
        )
    return firestore.client(), storage.bucket()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true",
                    help="Write to --out-dir only; no Firebase reads/writes.")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp_downloads",
                    help="Local staging directory (always used for write).")
    ap.add_argument("--pair", type=str, default=None,
                    help="Override active pair as 'of,g'; else read download_versions.json")
    args = ap.parse_args()

    versions = load_download_versions()
    of = versions["activeOrthofinderVersion"]
    g = versions["activeGroupingVersion"]
    if args.pair:
        of_s, g_s = args.pair.split(",")
        of, g = int(of_s), int(g_s)

    traits = load_traits()
    cultivars = load_cultivars()
    pangenome_cultivars = [c["id"] for c in cultivars if c.get("pangenome")]

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    app_version = git_short_hash()
    run_id = f"v{of}_g{g}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"

    staging_root = args.out_dir / run_id
    staging_root.mkdir(parents=True, exist_ok=True)

    # ── IRGSP transcript index (coords for BED) ────────────────
    gff_path = PROJECT_ROOT / "data" / "irgsp-1.0.gff"
    transcript_index: dict[str, GeneCoord] = {}
    if gff_path.exists():
        transcript_index = build_transcript_index(gff_path)
        print(f"Indexed {len(transcript_index)} IRGSP transcript ids from GFF")
    else:
        print(f"WARN: {gff_path} missing — BED files will be header-only")

    # ── Firebase handles (skipped in dry-run) ──────────────────
    db = None
    bucket = None
    og_counts: dict[str, dict[str, int]] = {}
    if not args.dry_run:
        db, bucket = init_firebase()
        print("Loading Orthogroups.GeneCount.tsv …")
        _header_cultivars, og_counts = load_copycount_tsv(bucket, of)
        print(f"  loaded {len(og_counts)} OGs")
    else:
        print("DRY RUN: Firestore + Storage reads skipped; outputs will be header-only")

    # ── Per-trait generation ───────────────────────────────────
    manifest_traits: dict[str, dict] = {}
    per_trait_ranked: dict[str, list[tuple[int, DiffEntry]]] = {}

    for t in traits:
        trait_id = t["id"]
        entries: list[DiffEntry] = []
        grouping = GroupingSummary(
            usable=False, method="none", group_labels=[], group_sizes=[],
            n_observed=0, n_missing=0, note="(dry-run — not fetched)",
        )
        if not args.dry_run:
            grouping = load_grouping_from_firestore(db, trait_id)
            entries = load_diff_from_firestore(db, bucket, trait_id)

        trait_dir = staging_root / "traits" / trait_id / f"v{of}_g{g}"
        trait_dir.mkdir(parents=True, exist_ok=True)

        write_candidates_tsv(trait_dir / "candidates.tsv", trait_id, of, g, grouping, entries)
        write_bed(trait_dir / "candidate_irgsp_coords.bed",
                  trait_id, of, g, grouping, entries, transcript_index)
        write_copycount_matrix(trait_dir / "candidate_copycount_matrix.tsv",
                               trait_id, of, g, grouping, entries,
                               pangenome_cultivars, og_counts)

        # README last — needs file sizes
        file_names = ["candidates.tsv", "candidate_irgsp_coords.bed",
                      "candidate_copycount_matrix.tsv"]
        sizes = [(n, (trait_dir / n).stat().st_size) for n in file_names]
        status_line = (
            "Usable trait: signals ranked by raw p-value; see `candidates.tsv`."
            if grouping.usable
            else f"**usable=false** — note: {grouping.note or '(no grouping)'}"
        )
        readme = render_readme(
            PROJECT_ROOT / "scripts" / "download_readme_template.md",
            trait_dir,
            bundle_kind="per_trait", trait=trait_id, of=of, g=g,
            generated_at=generated_at, app_version=app_version,
            bundle_status=status_line, file_sizes=sizes,
        )
        (trait_dir / "README.md").write_text(readme)

        file_entry: dict[str, dict] = {}
        all_files = file_names + ["README.md"]
        for name in all_files:
            p = trait_dir / name
            file_entry[name] = {"size": p.stat().st_size, "sha256": sha256_of(p)}
        manifest_traits[trait_id] = {"files": file_entry, "usable": grouping.usable}

        if grouping.usable and entries:
            per_trait_ranked[trait_id] = [
                (i, e) for i, e in enumerate(
                    sorted(entries, key=lambda x: (x.p_value, x.og_id)), start=1,
                )
            ]

        print(f"  {trait_id}: usable={grouping.usable} entries={len(entries)}")

    # ── Cross-trait ────────────────────────────────────────────
    cross_dir = staging_root / "cross-trait" / f"v{of}_g{g}"
    cross_dir.mkdir(parents=True, exist_ok=True)
    write_cross_trait(cross_dir / "cross_trait_candidates.tsv", of, g, per_trait_ranked)
    cross_files = ["cross_trait_candidates.tsv"]
    cross_sizes = [(n, (cross_dir / n).stat().st_size) for n in cross_files]
    cross_readme = render_readme(
        PROJECT_ROOT / "scripts" / "download_readme_template.md",
        cross_dir,
        bundle_kind="cross_trait", trait=None, of=of, g=g,
        generated_at=generated_at, app_version=app_version,
        bundle_status="Long-format master across all usable traits.",
        file_sizes=cross_sizes,
    )
    (cross_dir / "README.md").write_text(cross_readme)
    cross_entry: dict[str, dict] = {}
    for name in cross_files + ["README.md"]:
        p = cross_dir / name
        cross_entry[name] = {"size": p.stat().st_size, "sha256": sha256_of(p)}

    # ── Staging manifest ───────────────────────────────────────
    manifest = {
        "orthofinderVersion": of,
        "groupingVersion": g,
        "generatedAt": generated_at,
        "appVersion": app_version,
        "reference": {"displayName": IRGSP_DISPLAY_NAME, "longName": IRGSP_LONG_NAME},
        "traits": manifest_traits,
        "crossTrait": {"files": cross_entry},
    }
    manifest_path = staging_root / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    print(f"\nStaging bundle written to: {staging_root}")
    print(f"  traits with usable=true: {sum(1 for t in manifest_traits.values() if t['usable'])}")
    print(f"  cross-trait rows written: {sum(len(v) for v in per_trait_ranked.values())}")
    print(f"  manifest: {manifest_path}")
    print(f"\nNext: run `npm run check:download-bundles -- {staging_root}` to verify,")
    print(f"      then promote to final prefixes (see plan §2).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
