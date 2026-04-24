"""Smoke tests for scripts/build-gene-sv-index.py overlap classification.

Run: python3 scripts/tests/test_build_gene_sv_index.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

# `build-gene-sv-index` has a dash — importlib must load by path.
import importlib.util
_mod_path = REPO / "scripts" / "build-gene-sv-index.py"
spec = importlib.util.spec_from_file_location("gene_sv_index_builder", _mod_path)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)

classify_gene = mod.classify_gene


def make_gene(
    *,
    start: int,
    end: int,
    utr5: list[tuple[int, int]] | None = None,
    cds: list[tuple[int, int]] | None = None,
    utr3: list[tuple[int, int]] | None = None,
    strand: str = "+",
) -> dict:
    return {
        "cultivar": "test",
        "chr": "chr01",
        "start": start,
        "end": end,
        "strand": strand,
        "transcript": {
            "id": "g1.t1",
            "utr5": [{"start": s, "end": e} for s, e in (utr5 or [])],
            "cds":  [{"start": s, "end": e} for s, e in (cds  or [])],
            "utr3": [{"start": s, "end": e} for s, e in (utr3 or [])],
        },
        "annotation": {},
    }


def sv(eventId: str, pos: int, refLen: int, svType: str) -> dict:
    return {"eventId": eventId, "pos": pos, "refLen": refLen, "svType": svType}


def sort_svs(svs: list[dict]) -> list[dict]:
    return sorted(svs, key=lambda x: x["pos"])


def expect(label: str, got, want) -> bool:
    ok = got == want
    mark = "✓" if ok else "✗"
    print(f"  {mark} {label}: {got}" + ("" if ok else f"  (want {want})"))
    return ok


failures = 0


def case(label: str, fn):
    global failures
    print(f"\n[{label}]")
    if not fn():
        failures += 1


# ─────────────────────────────────────────────────────────────
# Gene geometry used by most tests:
#   exons: [100,200] (UTR5 100-109 + CDS 110-200), intron, [300,400] (CDS),
#   intron, [500,600] (CDS 500-589 + UTR3 590-600)
#   → CDS exons: [110,200], [300,400], [500,589]
#   → Canonical splice sites (intronic ±2 bp):
#     intron 1: [201, 202] donor, [298, 299] acceptor
#     intron 2: [401, 402] donor, [498, 499] acceptor
# ─────────────────────────────────────────────────────────────
BASE_GENE = make_gene(
    start=100, end=600,
    utr5=[(100, 109)],
    cds=[(110, 200), (300, 400), (500, 589)],
    utr3=[(590, 600)],
)


def test_ins_cds_hit() -> bool:
    # INS with refLen=1 (anchor only) at pos=250 — footprint [251,251]
    # Not in CDS (intron). Move to pos=150 where footprint [151,151] is in CDS.
    svs = sort_svs([sv("ev1", 150, 1, "INS")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("hit recorded", entry is not None, True)
        and expect("strong", entry["s"], 1)
        and expect("weak", entry["w"], 0)
        and expect("n locus", entry["n"], 1)
        and expect("types = I", entry["t"], "I")
    )


def test_del_cds_breakpoint() -> bool:
    # DEL breakpoint at pos=350 (inside CDS exon 2). refLen ignored
    # for DEL (sample-frame has no span).
    svs = sort_svs([sv("ev1", 350, 500, "DEL")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("hit recorded", entry is not None, True)
        and expect("strong", entry["s"], 1)
        and expect("types = D", entry["t"], "D")
    )


def test_complex_spanning_intron() -> bool:
    # COMPLEX at pos=295, refLen=20 → footprint [296, 315] spans intron 1
    # acceptor site [298,299] and lands in CDS exon 2 [300,400].
    svs = sort_svs([sv("ev1", 295, 20, "COMPLEX")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("hit recorded", entry is not None, True)
        and expect("strong", entry["s"], 1)
        and expect("types = C", entry["t"], "C")
    )


def test_ins_anchor_only_boundary() -> bool:
    # INS with refLen=1 (anchor-only) at pos=200. VCF left-anchor
    # normalization → footprint [201,201]. That lands in the donor
    # splice site [201,202] → STRONG (splice-site counted).
    # The prior interval-overlap naive rule would have also matched
    # CDS via anchor_in_CDS; the normalized rule lands in splice.
    svs = sort_svs([sv("ev1", 200, 1, "INS")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("strong (splice donor)", entry is not None and entry["s"] == 1, True)
    )


def test_ins_anchor_false_positive_avoided() -> bool:
    # INS at pos=203 (first bp AFTER the donor site), refLen=1
    # footprint [204,204]. Lands in intron interior → WEAK only.
    svs = sort_svs([sv("ev1", 203, 1, "INS")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("no strong", entry is not None and entry["s"] == 0, True)
        and expect("weak", entry and entry["w"] == 1, True)
    )


def test_del_adjacent_splice() -> bool:
    # DEL breakpoint at pos=203. Intron donor site is [201,202].
    # DEL_BP_WINDOW=5 means pos within splice_site ±5bp → strong.
    svs = sort_svs([sv("ev1", 203, 100, "DEL")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("strong (DEL adj splice)", entry is not None and entry["s"] == 1, True)
    )


def test_weak_only_utr() -> bool:
    # INS footprint [102, 105] lands in UTR5 only (not CDS).
    svs = sort_svs([sv("ev1", 101, 4, "INS")])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("hit", entry is not None, True)
        and expect("weak only", entry["s"] == 0 and entry["w"] == 1, True)
    )


def test_flanking() -> bool:
    # DEL breakpoint 1 kb upstream of gene (gene start = 100 → pos=-900
    # not valid; use gene starting at 2000). Build a custom gene.
    gene = make_gene(
        start=2000, end=3000,
        cds=[(2100, 2900)],
    )
    # DEL at pos=1000 → 1000 bp upstream, within ±2 kb flank
    svs = sort_svs([sv("ev1", 1000, 200, "DEL")])
    entry = classify_gene(gene, svs)
    return (
        expect("hit", entry is not None, True)
        and expect("weak only", entry["s"] == 0 and entry["w"] == 1, True)
    )


def test_far_flank_skipped() -> bool:
    # SV 3 kb upstream → outside flank window → no entry.
    gene = make_gene(start=10000, end=11000, cds=[(10100, 10900)])
    svs = sort_svs([sv("ev1", 5000, 100, "DEL")])
    entry = classify_gene(gene, svs)
    return expect("skipped", entry, None)


def test_locus_dedup() -> bool:
    # Two INS at pos=150 and pos=155 (same 100-bp bucket) → locus count 1.
    svs = sort_svs([
        sv("ev1", 150, 1, "INS"),
        sv("ev2", 155, 1, "INS"),
    ])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("strong", entry is not None and entry["s"] == 1, True)
        and expect("n=1 (bucket dedup)", entry and entry["n"] == 1, True)
    )


def test_multi_type_strong() -> bool:
    # INS in exon 1, DEL in exon 2, COMPLEX in exon 3 → all three types.
    svs = sort_svs([
        sv("ev1", 150, 1, "INS"),
        sv("ev2", 350, 100, "DEL"),
        sv("ev3", 520, 5, "COMPLEX"),
    ])
    entry = classify_gene(BASE_GENE, svs)
    return (
        expect("types = CDI", entry is not None and entry["t"] == "CDI", True)
        and expect("n>=3 distinct buckets", entry and entry["n"] >= 3, True)
    )


case("INS inside CDS", test_ins_cds_hit)
case("DEL breakpoint in CDS", test_del_cds_breakpoint)
case("COMPLEX spanning intron into CDS", test_complex_spanning_intron)
case("INS anchor normalization → splice site", test_ins_anchor_only_boundary)
case("INS anchor beyond splice → weak only", test_ins_anchor_false_positive_avoided)
case("DEL adjacent to splice within ±5bp", test_del_adjacent_splice)
case("UTR-only hit → weak", test_weak_only_utr)
case("Flanking ±2kb → weak", test_flanking)
case("Far flank skipped entirely", test_far_flank_skipped)
case("Locus dedup by 100bp bucket", test_locus_dedup)
case("Multi-type strong tier", test_multi_type_strong)

print(f"\n{'=' * 40}")
if failures:
    print(f"{failures} case(s) failed")
    sys.exit(1)
print("all cases passed")
