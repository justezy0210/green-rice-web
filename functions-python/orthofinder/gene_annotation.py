"""
TEMPORARY gene annotation via baegilmi GFF3.
To be replaced with proper functional annotation (InterProScan / KEGG / etc.) later.

Two entry points:
  - load_baegilmi_gene_annotation()  : live read from genomes/baegilmi/gene.gff3 (used at commit time)
  - load_annotation_for_version(N)   : read the versioned snapshot artifact (used by diff recompute + drawer)
"""

import re
from firebase_admin import storage

from . import uploader

BAEGILMI_GFF3_PATH = "genomes/baegilmi/gene.gff3"
TRANSCRIPT_SUFFIX_RE = re.compile(r"\.t\d+$")


def version_annotation_path(version: int) -> str:
    return f"orthofinder/v{version}/baegilmi_gene_annotation.json"


def load_annotation_for_version(version: int) -> dict:
    """
    Load the versioned GFF3 snapshot artifact.
    Returns empty dict if the artifact is missing (legacy version without snapshot).
    """
    try:
        return uploader.download_json(version_annotation_path(version))
    except Exception:
        return {}


def parse_gff3_attributes(col9: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for pair in col9.split(";"):
        pair = pair.strip()
        if not pair or "=" not in pair:
            continue
        k, v = pair.split("=", 1)
        result[k.strip()] = v.strip()
    return result


def load_baegilmi_gene_annotation() -> dict[str, dict]:
    """
    Returns: gene_id → { chromosome, start, end, strand, attributes }
    Resolves transcript IDs to gene IDs using mRNA Parent links.

    Returns empty dict if GFF3 is not uploaded.
    """
    bucket = storage.bucket()
    blob = bucket.blob(BAEGILMI_GFF3_PATH)
    if not blob.exists():
        return {}

    text = blob.download_as_text()
    genes: dict[str, dict] = {}
    transcript_to_gene: dict[str, str] = {}

    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        cols = line.split("\t")
        if len(cols) < 9:
            continue
        feat_type = cols[2]
        if feat_type not in ("gene", "mRNA", "transcript"):
            continue

        attrs = parse_gff3_attributes(cols[8])
        feat_id = attrs.get("ID", "")
        # Strip common prefixes
        if feat_id.startswith("gene:"):
            feat_id = feat_id[5:]
        if feat_id.startswith("transcript:"):
            feat_id = feat_id[11:]

        if feat_type == "gene":
            chrom = cols[0]
            try:
                start = int(cols[3])
                end = int(cols[4])
            except ValueError:
                continue
            strand = cols[6] if cols[6] in ("+", "-", ".") else "."
            # Exclude ID from attributes map
            clean_attrs = {k: v for k, v in attrs.items() if k != "ID"}
            genes[feat_id] = {
                "chromosome": chrom,
                "start": start,
                "end": end,
                "strand": strand,
                "attributes": clean_attrs,
            }
        else:  # mRNA / transcript
            parent = attrs.get("Parent", "")
            if parent.startswith("gene:"):
                parent = parent[5:]
            if feat_id and parent:
                transcript_to_gene[feat_id] = parent

    return {"genes": genes, "transcript_to_gene": transcript_to_gene}


# Note: representative lookup (baegilmi-based) has been removed.
# Representatives now come from IRGSP descriptions in og_descriptions.json.
# The baegilmi GFF3 annotation artifact is still produced and consumed by the
# frontend drawer to show gene locations per-cultivar when drilling into an OG.

