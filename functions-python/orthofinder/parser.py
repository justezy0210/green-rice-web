"""Parse OrthoFinder TSV files into normalized JSON."""

import csv
import io

CULTIVAR_SUFFIX = "_longest"


def parse_gene_count_tsv(tsv_text: str) -> tuple[list[str], dict[str, dict[str, int]]]:
    """
    Parse Orthogroups.GeneCount.tsv.

    Returns:
      cultivar_ids: list of cultivar IDs (suffix stripped, "Total" excluded)
      ogs: { "OG0000000": { "baegilmi": 21, "chamdongjin": 44, ... }, ... }
    """
    reader = csv.reader(io.StringIO(tsv_text), delimiter="\t")
    header = next(reader)
    if not header or header[0] != "Orthogroup":
        raise ValueError("Expected first column to be 'Orthogroup'")

    # Normalize column headers, identify cultivar columns
    cultivar_ids: list[str] = []
    cultivar_col_indices: list[int] = []
    for i, col in enumerate(header[1:], start=1):
        if col == "Total":
            continue
        cid = col[: -len(CULTIVAR_SUFFIX)] if col.endswith(CULTIVAR_SUFFIX) else col
        cultivar_ids.append(cid)
        cultivar_col_indices.append(i)

    ogs: dict[str, dict[str, int]] = {}
    for row in reader:
        if not row or not row[0]:
            continue
        og_id = row[0]
        counts: dict[str, int] = {}
        for col_idx, cid in zip(cultivar_col_indices, cultivar_ids):
            try:
                counts[cid] = int(row[col_idx])
            except (ValueError, IndexError):
                counts[cid] = 0
        ogs[og_id] = counts

    return cultivar_ids, ogs


def parse_orthogroups_tsv_baegilmi_only(tsv_text: str) -> dict[str, list[str]]:
    """
    Parse Orthogroups.tsv and extract only baegilmi gene IDs per orthogroup.
    Keeps memory footprint small instead of loading all cultivars.

    Returns: { "OG0000000": ["baegilmi_g16604.t1", "baegilmi_g16941.t1", ...], ... }
    """
    reader = csv.reader(io.StringIO(tsv_text), delimiter="\t")
    header = next(reader)

    baegilmi_col: int | None = None
    for i, col in enumerate(header):
        cid = col[: -len(CULTIVAR_SUFFIX)] if col.endswith(CULTIVAR_SUFFIX) else col
        if cid == "baegilmi":
            baegilmi_col = i
            break
    if baegilmi_col is None:
        return {}

    result: dict[str, list[str]] = {}
    for row in reader:
        if not row or not row[0]:
            continue
        og_id = row[0]
        if baegilmi_col >= len(row):
            continue
        cell = row[baegilmi_col].strip()
        if not cell:
            continue
        genes = [g.strip() for g in cell.split(",") if g.strip()]
        if genes:
            result[og_id] = genes

    return result
