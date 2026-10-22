import json
import numpy as np
from sqlalchemy import select
from app.models import Interaction, Setting, RecommendationLog
from app.config import settings
from app.repositories.catalog import active_products, serialize_product
from .collaborative_filtering import CollaborativeFiltering
from .content_recommender import load_embeddings, content_scores
from .preprocessing import scale_scores

def combine_scores(cf, clip, alpha):
    return alpha * scale_scores(cf) + (1 - alpha) * scale_scores(clip)

def get_alpha(db):
    setting = db.get(Setting, 'alpha')
    return float(setting.value) if setting else settings.hybrid_alpha

def recommend(db, user=None, method='hybrid', k=12, gender=None, max_price=None):
    products = active_products(db)
    ids = [p.id for p in products]
    interactions = list(db.scalars(select(Interaction)))
    cf = CollaborativeFiltering().fit(interactions, ids)
    embeddings = load_embeddings(db, products) if method != 'collaborative' else {}
    user_id = user.id if user else None
    history = [r for r in interactions if r.user_id == user_id]
    cf_scores = cf.scores(user_id)
    clip_scores = content_scores(ids, embeddings, interactions, user_id)
    alpha = get_alpha(db)
    effective_alpha = alpha * min(1, len({r.product_id for r in history}) / 5)
    if not np.any(clip_scores):
        effective_alpha = 1.0
    if not np.any(cf_scores):
        effective_alpha = 0.0
    status = 'personalized'
    if method == 'collaborative':
        scores = scale_scores(cf_scores)
    elif method == 'clip':
        scores = scale_scores(clip_scores)
    else:
        scores = combine_scores(cf_scores, clip_scores, effective_alpha)
    if not np.any(scores):
        scores = scale_scores(cf.popularity)
        status = 'popular_fallback'
    preferences = json.loads(user.preferences) if user else {}
    if not history and preferences:
        for i, product in enumerate(products):
            if preferences.get('gender') == product.gender:
                scores[i] += 0.12
            if preferences.get('style') == product.style:
                scores[i] += 0.1
            if preferences.get('color') == product.color:
                scores[i] += 0.06
            if preferences.get('budget') and product.price <= preferences['budget']:
                scores[i] += 0.03
    purchased = {r.product_id for r in history if r.interaction_type == 'purchase'}
    ranked = sorted(range(len(products)), key=lambda i: (-float(scores[i]), products[i].id))
    results = []
    for i in ranked:
        product = products[i]
        if product.id in purchased or (gender and product.gender != gender) or (max_price and product.price > max_price) or not sum(v.stock for v in product.variants):
            continue
        data = serialize_product(product)
        reason = 'Được yêu thích trong bộ sưu tập'
        if status == 'personalized':
            if clip_scores[i] > 0 and (method == 'clip' or effective_alpha < 0.5):
                reason = 'Có hình ảnh và phong cách gần với những món bạn quan tâm'
            elif cf_scores[i] > 0:
                reason = 'Được người có sở thích tương tự quan tâm'
        elif preferences.get('style') == product.style:
            reason = 'Phù hợp phong cách bạn đã chọn'
        data.update(score=round(float(scores[i]), 5), reason=reason)
        results.append(data)
        if user:
            db.add(RecommendationLog(user_id=user.id, product_id=product.id, recommendation_method=method, score=float(scores[i])))
        if len(results) >= k:
            break
    db.commit()
    return {'items': results, 'method': method, 'status': status, 'clip_ready': bool(embeddings), 'alpha': alpha, 'effective_alpha': effective_alpha,
            'message': 'Gợi ý từ lịch sử tương tác của bạn' if status == 'personalized' else 'Khám phá những thiết kế được yêu thích. Lưu vài món để chúng mình hiểu gu của bạn hơn.'}
