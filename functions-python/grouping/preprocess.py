"""Preprocess trait values into a 1D numpy array for GMM."""

import numpy as np
from .models import TraitMetadata
from .quality_check import extract_values


def preprocess_trait(
    cultivar_docs: list[dict], trait: TraitMetadata
) -> tuple[np.ndarray, list[str], float]:
    """
    Returns (X, cultivar_ids_used, variance).
    X is a 1D numpy array of z-scored values.
    """
    raw_values = extract_values(cultivar_docs, trait)
    cultivar_ids = [doc["_id"] for doc in cultivar_docs]

    scalars: list[tuple[str, float]] = []
    for cid, val in zip(cultivar_ids, raw_values):
        scalar = _reduce_to_scalar(val, trait)
        if scalar is not None:
            scalars.append((cid, scalar))

    if len(scalars) < 2:
        return np.array([]), [], 0.0

    values = np.array([s[1] for s in scalars], dtype=float)
    ids_used = [s[0] for s in scalars]

    # Z-score
    mean = values.mean()
    std = values.std()
    variance = float(values.var())

    if std < 1e-9:
        return values, ids_used, variance

    z_values = (values - mean) / std
    return z_values, ids_used, variance


def _reduce_to_scalar(value, trait: TraitMetadata) -> float | None:
    """Reduce a raw trait value to a single scalar for GMM input."""
    if value is None:
        return None
    if trait.type == "multi-env":
        if not isinstance(value, dict):
            return None
        envs = [value.get(k) for k in trait.keys]
        present = [e for e in envs if isinstance(e, (int, float))]
        if not present:
            return None
        return float(sum(present) / len(present))
    if trait.type == "single-continuous":
        if isinstance(value, (int, float)):
            return float(value)
        return None
    # binary handled separately (not via preprocess)
    return None
