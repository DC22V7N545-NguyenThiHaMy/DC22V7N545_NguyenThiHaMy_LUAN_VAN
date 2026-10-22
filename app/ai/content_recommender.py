import numpy as np
from app.config import ROOT, settings
from app.models import ProductEmbedding
from .clip_encoder import fingerprint
from .preprocessing import normalize

def load_embeddings(db, products, kind='combined'):
    vectors = {}
    for p in products:
        meta = db.get(ProductEmbedding, p.id)
        if not meta or meta.model_version != settings.clip_model or meta.fingerprint != fingerprint(p):
            continue
        path = ROOT / meta.embedding_path
        if path.is_file():
            with np.load(path, allow_pickle=False) as saved:
                vector = saved[kind]
                if vector.size:
                    vectors[p.id] = vector.copy()
    return vectors

def content_scores(product_ids, embeddings, interactions, user_id):
    profile, weight_sum = None, 0
    # Daily caps consistent with CF, preventing refresh spam from dominating a profile.
    dedup = {}
    for row in interactions:
        if row.user_id == user_id and row.product_id in embeddings:
            key = (row.product_id, row.interaction_type, row.created_at.date())
            dedup[key] = max(dedup.get(key, 0), row.interaction_weight)
    for (pid, _, _), weight in dedup.items():
        contribution = embeddings[pid] * weight
        profile = contribution if profile is None else profile + contribution
        weight_sum += weight
    scores = np.zeros(len(product_ids), dtype=np.float32)
    if profile is not None and weight_sum:
        profile = normalize(profile / weight_sum)
        for index, pid in enumerate(product_ids):
            if pid in embeddings:
                scores[index] = max(0, float(profile @ embeddings[pid]))
    return scores
