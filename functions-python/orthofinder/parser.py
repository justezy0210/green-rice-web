"""Parse OrthoFinder TSV files into normalized JSON."""

import csv
import io
from typing import Iterator
from urllib.parse import unquote

CULTIVAR_SUFFIX = "_longest"
IRGSP_COL = "IRGSP-1.0"
IRGSP_DESC_COL = "IRGSP_description"


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


def _parse_irgsp_descriptions(cell: str) -> dict[str, str]:
    """
    Parse the IRGSP_description cell format:
      "Os01t0391600-00: Conserved hypothetical protein.; Os01t0553901-01: NA"

    Description text originates from a GFF3 attribute, so literal `,`, `;`, `=`
    in the value are URL-encoded (`%2C`, `%3B`, `%3D`). We split on the
    structural `;` / `:` first, THEN percent-decode each tid + desc so encoded
    separators in the decoded text don't break the split.

    Returns { transcript_id: description_text }.
    """
    result: dict[str, str] = {}
    if not cell:
        return result
    for chunk in cell.split(";"):
        chunk = chunk.strip()
        if not chunk or ":" not in chunk:
            continue
        tid, desc = chunk.split(":", 1)
        tid = unquote(tid.strip())
        desc = unquote(desc.strip())
        if tid:
            result[tid] = desc
    return result


def iter_orthogroups_with_desc_rows(
    tsv_text: str,
) -> Iterator[tuple[str, dict[str, list[str]], dict]]:
    """
    Stream rows from Orthogroups_with_description.tsv.

    Expected columns:
      Orthogroup | IRGSP-1.0 | {cultivar}_longest ... | IRGSP_description

    For each OG, yield:
      (
        og_id,
        {cultivar_id: [gene_ids]},           # cultivar-only members (no IRGSP, no description)
        {
          "transcripts": [irgsp_ids...],      # IRGSP transcripts for this OG
          "descriptions": {tid: desc_text},   # parsed from IRGSP_description cell
        },
      )
    """
    reader = csv.reader(io.StringIO(tsv_text), delimiter="\t")
    header = next(reader)
    if not header or header[0] != "Orthogroup":
        raise ValueError("Expected first column to be 'Orthogroup'")

    irgsp_col: int | None = None
    desc_col: int | None = None
    cultivar_ids: list[str] = []
    cultivar_col_indices: list[int] = []

    for i, col in enumerate(header):
        if i == 0:
            continue
        if col == IRGSP_COL:
            irgsp_col = i
        elif col == IRGSP_DESC_COL:
            desc_col = i
        elif col.endswith(CULTIVAR_SUFFIX):
            cid = col[: -len(CULTIVAR_SUFFIX)]
            cultivar_ids.append(cid)
            cultivar_col_indices.append(i)
        # Unknown columns are ignored silently

    for row in reader:
        if not row or not row[0]:
            continue
        og_id = row[0]

        # Per-cultivar gene members
        members: dict[str, list[str]] = {}
        for col_idx, cid in zip(cultivar_col_indices, cultivar_ids):
            if col_idx >= len(row):
                continue
            cell = row[col_idx].strip()
            if not cell:
                continue
            genes = [g.strip() for g in cell.split(",") if g.strip()]
            if genes:
                members[cid] = genes

        # IRGSP transcripts + descriptions
        irgsp_transcripts: list[str] = []
        if irgsp_col is not None and irgsp_col < len(row):
            cell = row[irgsp_col].strip()
            if cell:
                irgsp_transcripts = [t.strip() for t in cell.split(",") if t.strip()]

        descriptions: dict[str, str] = {}
        if desc_col is not None and desc_col < len(row):
            descriptions = _parse_irgsp_descriptions(row[desc_col])

        irgsp = {
            "transcripts": irgsp_transcripts,
            "descriptions": descriptions,
        }

        # Skip OGs with no member data at all (rare but possible)
        if not members and not irgsp_transcripts:
            continue

        yield og_id, members, irgsp
