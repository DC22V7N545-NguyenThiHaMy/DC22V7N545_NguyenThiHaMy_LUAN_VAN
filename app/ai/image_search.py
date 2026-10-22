import numpy as np
from .clip_encoder import get_encoder
from .content_recommender import load_embeddings
from app.repositories.catalog import active_products, serialize_product

def image_search(db, image, k=12):
    products = active_products(db)
    vectors = load_embeddings(db, products, kind='image')
    if not vectors:
        return None
    query = get_encoder().image(image)
    ranked = sorted(((p, float(query @ vectors[p.id])) for p in products if p.id in vectors), key=lambda pair: -pair[1])[:k]
    return [{'score': round(score, 5), **serialize_product(p)} for p, score in ranked]
