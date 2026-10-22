import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

class CollaborativeFiltering:
    """Item-based implicit CF. Repeated user/item/action events are capped per UTC day."""
    def fit(self, interactions, product_ids):
        self.product_ids = list(product_ids)
        self.item_index = {p: i for i, p in enumerate(self.product_ids)}
        self.user_ids = sorted({r.user_id for r in interactions})
        self.user_index = {u: i for i, u in enumerate(self.user_ids)}
        dedup = {}
        for row in interactions:
            if row.product_id not in self.item_index:
                continue
            key = (row.user_id, row.product_id, row.interaction_type, row.created_at.date())
            dedup[key] = max(dedup.get(key, 0), row.interaction_weight)
        rows, cols, values = [], [], []
        for (user, product, _, _), weight in dedup.items():
            rows.append(self.user_index[user]); cols.append(self.item_index[product]); values.append(weight)
        self.matrix = csr_matrix((values, (rows, cols)), shape=(len(self.user_ids), len(self.product_ids)), dtype=np.float32)
        self.similarity = cosine_similarity(self.matrix.T, dense_output=True) if rows else np.zeros((len(product_ids), len(product_ids)), dtype=np.float32)
        np.fill_diagonal(self.similarity, 0)
        self.popularity = np.asarray(self.matrix.sum(axis=0)).ravel()
        return self

    def scores(self, user_id):
        if user_id not in self.user_index:
            return np.zeros(len(self.product_ids), dtype=np.float32)
        profile = self.matrix.getrow(self.user_index[user_id]).toarray().ravel()
        numerator = profile @ self.similarity
        # Normalize by profile weight, preserving similarity strength for implicit feedback.
        # A per-item similarity denominator would make every candidate tie for a one-item user.
        denominator = float(profile.sum())
        return numerator / denominator if denominator > 0 else np.zeros_like(numerator)
