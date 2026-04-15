"""GMM clustering using scikit-learn."""

import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score

N_COMPONENTS = 2  # k=2 only for initial scope
RANDOM_STATE = 42


def fit_gmm(X: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """
    Fit a 2-component GMM on 1D data.
    Returns (labels, probabilities, silhouette_score).
    """
    X_2d = X.reshape(-1, 1)
    gmm = GaussianMixture(
        n_components=N_COMPONENTS,
        covariance_type="diag",
        random_state=RANDOM_STATE,
        n_init=5,
    )
    gmm.fit(X_2d)
    labels = gmm.predict(X_2d)
    probs = gmm.predict_proba(X_2d)

    if len(np.unique(labels)) < 2:
        score = 0.0
    else:
        score = float(silhouette_score(X_2d, labels))

    return labels, probs, score
