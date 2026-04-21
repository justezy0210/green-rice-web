#!/usr/bin/env python3
"""Regenerate docs/generated/phenotype-groups.md from Firestore groupings.

Reads `groupings/{traitId}` documents, `cultivars/{cultivarId}` display
names, and the trait registry in `data/traits.json`, and writes a
markdown summary of the active auto-grouping into
`docs/generated/phenotype-groups.md`.

Re-run whenever the grouping pipeline emits a new `groupings/*` state.

Fails fast on:
  - trait-set mismatch between Firestore and `data/traits.json`
  - assignment `groupLabel` not in the trait's `labels.{low,high}` set
  - malformed summary/quality shapes

Usage:
  python3 scripts/build-phenotype-groups-doc.py
  python3 scripts/build-phenotype-groups-doc.py --out <path>
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore

    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(sa)))
    return firestore.client()


def _as_float(value, field: str, trait_id: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise SystemExit(
            f"{trait_id}: expected numeric {field!r}, got {value!r} ({exc})"
        )


def _validate_trait_sets(groupings: dict, trait_meta: dict) -> None:
    firestore_ids = set(groupings.keys())
    registry_ids = set(trait_meta.keys())
    missing_in_firestore = registry_ids - firestore_ids
    extra_in_firestore = firestore_ids - registry_ids
    if missing_in_firestore or extra_in_firestore:
        msg = ["trait-set mismatch between Firestore groupings and data/traits.json:"]
        if missing_in_firestore:
            msg.append(f"  missing in Firestore: {sorted(missing_in_firestore)}")
        if extra_in_firestore:
            msg.append(f"  extra in Firestore:   {sorted(extra_in_firestore)}")
        raise SystemExit("\n".join(msg))


def _validate_labels(trait_id: str, doc: dict, low_label: str, high_label: str) -> None:
    allowed = {low_label, high_label}
    observed = {
        a.get("groupLabel")
        for a in (doc.get("assignments") or {}).values()
        if a.get("groupLabel")
    }
    unknown = observed - allowed
    if unknown:
        raise SystemExit(
            f"{trait_id}: assignment groupLabel(s) {sorted(unknown)} not in "
            f"registry labels {sorted(allowed)}. Re-sync data/traits.json with "
            f"the grouping pipeline, or re-run grouping."
        )


def _version_header(groupings: dict) -> tuple[str, list[str]]:
    versions = [int(d.get("summary", {}).get("version") or 0) for d in groupings.values()]
    counter = Counter(versions)
    warnings: list[str] = []
    if len(counter) == 1:
        (only_version,) = counter.keys()
        return f"v{only_version}", warnings
    majority, _ = counter.most_common(1)[0]
    warnings.append(
        f"Mixed grouping versions across traits: {dict(counter)}. The "
        f"header shows the majority version (v{majority}); re-run the "
        "grouping pipeline before trusting downstream Mann-Whitney U results."
    )
    return f"mixed (majority v{majority})", warnings


def format_doc(
    groupings: dict[str, dict],
    trait_meta: dict[str, dict],
    cultivar_name: dict[str, str],
) -> str:
    _validate_trait_sets(groupings, trait_meta)

    version_label, warnings = _version_header(groupings)
    updated_at_values = {
        d.get("summary", {}).get("updatedAt") for d in groupings.values()
    }
    updated_at_values.discard(None)
    latest_updated = max(updated_at_values) if updated_at_values else "?"
    panel_size = len(cultivar_name)

    lines: list[str] = []
    lines.append(f"# Phenotype Groups — auto-grouping ({version_label})")
    lines.append("")
    lines.append(
        f"Auto-generated from Firestore `groupings/{{traitId}}` "
        f"(latest update {latest_updated}). Panel size: {panel_size} cultivars "
        "(including IRGSP reference if present)."
    )
    for w in warnings:
        lines.append(f"> ⚠ {w}")
    lines.append("")
    lines.append(
        "Most traits use a Gaussian Mixture Model over observed cultivar "
        "values (`summary.method == 'gmm'`); some traits use an explicit "
        "fixed-class labelling (`fixed-class`) when the phenotype is binary "
        "(e.g. resistance). Inactive groupings appear as `none` and are not "
        "used downstream."
    )
    lines.append("")
    lines.append(
        "**Scope caveat.** Group membership is a *proposed* grouping, not a "
        "biological ground truth. With at most 11 annotated cultivars the "
        "silhouette is informative but the sample size cannot support "
        "population-scale claims. See `docs/product-specs/scope.md` for "
        "banned framings."
    )
    lines.append("")
    lines.append("## Legend")
    lines.append("")
    lines.append(
        "- Each trait has two group labels, named for the trait semantics "
        "(e.g. early/late, short/tall, susceptible/resistant). The labels "
        "come from `data/traits.json`."
    )
    lines.append(
        "- **borderline** — GMM posterior probability is not decisively "
        "≥ 0.7 for either group; the cultivar is still assigned to a label "
        "but flagged, and downstream tests (Mann-Whitney U, candidate scoring) "
        "exclude it."
    )
    lines.append(
        "- **n** — number of cultivars used in the grouping fit; the remaining "
        f"({panel_size} − n) lack a measurement for this trait."
    )
    lines.append("")

    for trait_id in sorted(groupings.keys()):
        doc = groupings[trait_id]
        tm = trait_meta[trait_id]  # presence asserted by _validate_trait_sets
        summary = doc.get("summary") or {}
        quality = doc.get("quality") or {}
        labels = tm.get("labels") or {}
        low_label = labels.get("low", "low")
        high_label = labels.get("high", "high")

        _validate_labels(trait_id, doc, low_label, high_label)

        method = summary.get("method") or "none"
        score_metric = summary.get("scoreMetric") or "none"
        usable = bool(quality.get("usable", True))

        lines.append(f'## {tm.get("label", trait_id)} &mdash; `{trait_id}`')
        lines.append("")
        lines.append(f'- Direction: {tm.get("direction", "?")}')
        lines.append(f'- Method: `{method}` · Usable: {"yes" if usable else "no"}')
        lines.append(
            f"- Group labels: `{low_label}` (low side) / `{high_label}` (high side)"
        )
        lines.append(
            f'- n (observed / used): {quality.get("nObserved")} / {quality.get("nUsedInModel")}'
        )
        miss = _as_float(quality.get("missingRate", 0.0), "missingRate", trait_id)
        lines.append(f"- Missing rate: {miss * 100:.1f}%")
        if score_metric == "silhouette" and summary.get("scoreValue") is not None:
            silhouette = _as_float(summary["scoreValue"], "scoreValue", trait_id)
            lines.append(f"- Silhouette: {silhouette:.3f}")
        elif score_metric != "none":
            lines.append(f"- Score ({score_metric}): {summary.get('scoreValue')}")
        if method == "fixed-class":
            lines.append(
                "- Note: fixed-class labelling — silhouette does not apply; the "
                "two groups are assigned by an explicit rule rather than GMM."
            )
        if method == "none" or not usable:
            lines.append(
                "- Note: grouping is not active for this trait; downstream "
                "MWU / candidate scoring skip it."
            )
        if quality.get("note"):
            lines.append(f'- Note: {quality["note"]}')
        lines.append("")

        by_group: dict[str, list] = defaultdict(list)
        borderline: list = []
        for cid, a in (doc.get("assignments") or {}).items():
            label = a.get("groupLabel", "?")
            if a.get("borderline"):
                borderline.append((cid, a))
            else:
                by_group[label].append((cid, a))

        for label in [low_label, high_label]:
            rows = sorted(
                by_group.get(label, []),
                key=lambda r: cultivar_name.get(r[0], r[0]).lower(),
            )
            if not rows:
                continue
            names = ", ".join(cultivar_name.get(cid, cid) for cid, _ in rows)
            lines.append(f"- **{label}** ({len(rows)}): {names}")

        if borderline:
            entries = []
            for cid, a in sorted(
                borderline, key=lambda r: cultivar_name.get(r[0], r[0]).lower()
            ):
                p = _as_float(a.get("probability", 0.0), "probability", trait_id)
                lbl = a.get("groupLabel", "?")
                entries.append(
                    f"{cultivar_name.get(cid, cid)} (→{lbl}, p={p:.2f})"
                )
            lines.append(f"- **borderline** ({len(borderline)}): {', '.join(entries)}")

        # Warn on highly skewed splits (one group ≤ 1 after borderline exclusion).
        active_counts = [len(by_group.get(low_label, [])), len(by_group.get(high_label, []))]
        if min(active_counts) <= 1 and method == "gmm":
            lines.append(
                f"- ⚠ Skewed split ({active_counts[0]}:{active_counts[1]}); "
                "treat as discovery hint only."
            )
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=PROJECT_ROOT / "docs/generated/phenotype-groups.md",
    )
    ap.add_argument(
        "--traits-json",
        type=Path,
        default=PROJECT_ROOT / "data/traits.json",
    )
    args = ap.parse_args()

    db = init_firebase()

    cultivar_name: dict[str, str] = {}
    for snap in db.collection("cultivars").stream():
        data = snap.to_dict() or {}
        cultivar_name[snap.id] = data.get("name") or snap.id

    groupings: dict[str, dict] = {}
    for snap in db.collection("groupings").stream():
        groupings[snap.id] = snap.to_dict() or {}

    if not groupings:
        raise SystemExit("no documents in groupings/ — nothing to write")

    traits_payload = json.loads(args.traits_json.read_text(encoding="utf-8"))
    trait_meta = {t["id"]: t for t in traits_payload.get("traits", [])}

    body = format_doc(groupings, trait_meta, cultivar_name)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(body, encoding="utf-8", newline="\n")
    print(f"wrote {args.out} ({len(body):,} bytes, {body.count(chr(10)) + 1} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
