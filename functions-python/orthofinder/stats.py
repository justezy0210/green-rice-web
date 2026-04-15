"""Statistical helpers for orthogroup differential analysis."""

import numpy as np


def bh_correction(p_values: list[float]) -> list[float]:
    """
    Benjamini-Hochberg FDR correction.
    Input: list of raw p-values.
    Output: list of q-values in the same order as input.
    """
    n = len(p_values)
    if n == 0:
        return []
    p_arr = np.asarray(p_values, dtype=float)
    sorted_idx = np.argsort(p_arr)
    sorted_p = p_arr[sorted_idx]
    ranks = np.arange(1, n + 1)
    raw_q = sorted_p * n / ranks
    # Walk from largest rank backward and take running minimum.
    monotonic = np.minimum.accumulate(raw_q[::-1])[::-1]
    final_q = np.minimum(monotonic, 1.0)
    result = np.empty(n)
    result[sorted_idx] = final_q
    return result.tolist()
