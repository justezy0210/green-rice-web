"""Firebase Storage path builders for the Python write-side.

Read-side counterpart: src/lib/storage-paths.ts. Every path surfaced on
the TS side must also be buildable here. A few paths (matrix,
og_descriptions) are write-only and have no TS counterpart — intentional.
"""


def og_gene_coords_path(chunk_key: str) -> str:
    return f"og_gene_coords/chunk_{chunk_key}.json"


def og_tubemap_path(og_id: str) -> str:
    return f"og_tubemap/{og_id}.json"


def og_region_path(og_id: str, cluster_id: str) -> str:
    return f"og_region/{og_id}/{cluster_id}.json"


def og_region_manifest_path() -> str:
    return "og_region/_manifest.json"


def og_allele_freq_path(orthofinder_version: int, grouping_version: int, trait_id: str) -> str:
    return f"og_allele_freq/v{orthofinder_version}/g{grouping_version}/{trait_id}.json"


def orthofinder_og_members_path(version: int, chunk_key: str) -> str:
    return f"orthofinder/v{version}/og-members/chunk_{chunk_key}.json"


def orthofinder_baegilmi_annotation_path(version: int) -> str:
    return f"orthofinder/v{version}/baegilmi_gene_annotation.json"


def orthofinder_og_categories_path(version: int) -> str:
    return f"orthofinder/v{version}/og_categories.json"


def orthofinder_matrix_path(version: int) -> str:
    return f"orthofinder/v{version}/_matrix.json"


def orthofinder_og_descriptions_path(version: int) -> str:
    return f"orthofinder/v{version}/og_descriptions.json"


# ─────────────────────────────────────────────────────────────
# Discovery download bundles (/download page artifacts)
# ─────────────────────────────────────────────────────────────

def _version_tag(orthofinder_version: int, grouping_version: int) -> str:
    return f"v{orthofinder_version}_g{grouping_version}"


def download_trait_dir(orthofinder_version: int, grouping_version: int, trait_id: str) -> str:
    return f"downloads/traits/{trait_id}/{_version_tag(orthofinder_version, grouping_version)}"


def download_cross_trait_dir(orthofinder_version: int, grouping_version: int) -> str:
    return f"downloads/cross-trait/{_version_tag(orthofinder_version, grouping_version)}"


def download_staging_dir(run_id: str) -> str:
    return f"downloads/_staging/{run_id}"


def download_manifest_path() -> str:
    return "downloads/_manifest.json"
