import numpy as np
from .collaborative_filtering import CollaborativeFiltering

class ALSRecommender(CollaborativeFiltering):
    """Implicit-feedback matrix factorization (ALS-WR, Hu/Koren/Volinsky 2008) on the same deduplicated matrix as CF.

    Every observed pair is a positive with confidence 1 + confidence * weight; unobserved pairs are weak negatives.
    Pure NumPy and seeded, so a given interaction history always yields the same factors.
    Defaults are deliberately small (low rank, strong regularization): the demo data has ~50 users, where larger models overfit.
    """
    def __init__(self, factors=4, regularization=10.0, iterations=15, confidence=1.0, seed=42):
        self.factors, self.regularization, self.iterations, self.confidence, self.seed = factors, regularization, iterations, confidence, seed

    def fit(self, interactions, product_ids):
        super().fit(interactions, product_ids)
        users, items = self.matrix.shape
        rng = np.random.default_rng(self.seed)
        self.user_factors = rng.normal(0, 0.1, (users, self.factors))
        self.item_factors = rng.normal(0, 0.1, (items, self.factors))
        if self.matrix.nnz:
            by_item = self.matrix.T.tocsr()
            for _ in range(self.iterations):
                self.user_factors = self._solve(self.matrix, self.item_factors)
                self.item_factors = self._solve(by_item, self.user_factors)
        return self

    def _solve(self, ratings, fixed):
        # Closed-form least squares per row: (YtY + Yu' diag(c-1) Yu + reg I) x = Yu' c, with preference p = 1 on observed entries.
        gram = fixed.T @ fixed + self.regularization * np.eye(self.factors)
        solved = np.zeros((ratings.shape[0], self.factors))
        for row in range(ratings.shape[0]):
            start, end = ratings.indptr[row], ratings.indptr[row + 1]
            if start == end:
                continue
            observed = fixed[ratings.indices[start:end]]
            confidence = 1 + self.confidence * ratings.data[start:end]
            solved[row] = np.linalg.solve(gram + (observed.T * (confidence - 1)) @ observed, observed.T @ confidence)
        return solved

    def scores(self, user_id):
        if user_id not in self.user_index:
            return np.zeros(len(self.product_ids), dtype=np.float32)
        return (self.user_factors[self.user_index[user_id]] @ self.item_factors.T).astype(np.float32)
