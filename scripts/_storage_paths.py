"""Re-export shim → functions-python/shared/storage_paths.py (SSOT)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "functions-python"))

from shared.storage_paths import (  # noqa: E402,F401
    og_allele_freq_path,
    og_gene_coords_path,
    og_region_af_manifest_path,
    og_region_af_path,
    og_region_af_summary_manifest_path,
    og_region_graph_manifest_path,
    og_region_graph_path,
    og_region_pointer_path,
    orthofinder_baegilmi_annotation_path,
    orthofinder_matrix_path,
    orthofinder_og_categories_path,
    orthofinder_og_descriptions_path,
    orthofinder_og_members_path,
)
