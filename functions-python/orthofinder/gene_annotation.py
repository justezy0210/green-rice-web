"""
TEMPORARY gene annotation via baegilmi GFF3.
To be replaced with proper functional annotation (InterProScan / KEGG / etc.) later.
"""

import re
from firebase_admin import storage

BAEGILMI_GFF3_PATH = "genomes/baegilmi/gene.gff3"
TRANSCRIPT_SUFFIX_RE = re.compile(r"\.t\d+$")


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


def resolve_to_gene_id(transcript_or_gene_id: str, annotation: dict) -> str | None:
    """
    Given an OrthoFinder gene ID (which is usually a transcript ID like "baegilmi_g123.t1"),
    resolve to a gene ID present in the annotation dict.
    """
    if not annotation:
        return None
    genes = annotation.get("genes", {})
    tmap = annotation.get("transcript_to_gene", {})

    # Direct hit
    if transcript_or_gene_id in genes:
        return transcript_or_gene_id
    # Via transcript map
    if transcript_or_gene_id in tmap:
        gid = tmap[transcript_or_gene_id]
        return gid if gid in genes else None
    # Fall back to stripping ".tN" suffix
    stripped = TRANSCRIPT_SUFFIX_RE.sub("", transcript_or_gene_id)
    if stripped in genes:
        return stripped
    return None


def lookup_representative(
    baegilmi_genes: list[str], annotation: dict
) -> dict | None:
    """
    Given baegilmi gene IDs from an orthogroup, return the first resolvable gene's annotation dict.
    Returns None if no annotation available or no match.
    """
    if not annotation or not baegilmi_genes:
        return None
    genes = annotation.get("genes", {})
    for gene_ref in baegilmi_genes:
        gene_id = resolve_to_gene_id(gene_ref, annotation)
        if gene_id and gene_id in genes:
            info = genes[gene_id]
            return {
                "source": "baegilmi_gff3",
                "geneId": gene_id,
                "chromosome": info["chromosome"],
                "start": info["start"],
                "end": info["end"],
                "strand": info["strand"],
                "attributes": info["attributes"],
            }
    return None
