import time
from collections import defaultdict
from types import SimpleNamespace
import numpy as np
from sqlalchemy import select
from app.models import Interaction
from app.repositories.catalog import active_products
from .collaborative_filtering import CollaborativeFiltering
from .content_recommender import load_embeddings, content_scores
from .hybrid_recommender import combine_scores, get_alpha
from .preprocessing import scale_scores

def ranking_metrics(ranked, relevant, k):
    hits = [int(item in relevant) for item in ranked[:k]]
    count = sum(hits)
    dcg = sum(hit / np.log2(i + 2) for i, hit in enumerate(hits))
    ideal = sum(1 / np.log2(i + 2) for i in range(min(len(relevant), k)))
    return {'precision_at_k': count / k, 'recall_at_k': count / len(relevant) if relevant else 0,
            'ndcg_at_k': dcg / ideal if ideal else 0, 'hit_rate_at_k': float(count > 0)}

def temporal_split(rows):
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.user_id].append(row)
    train, tests = [], []
    for uid, events in grouped.items():
        events.sort(key=lambda r: (r.created_at, r.id))
        if len({r.product_id for r in events}) < 3:
            train.extend(events)
            continue
        target = events[-1]
        # Remove EVERY interaction with held-out product and every event after cutoff.
        before = [r for r in events if r.product_id != target.product_id and r.created_at < target.created_at]
        if len({r.product_id for r in before}) < 2:
            train.extend(events)
            continue
        train.extend(before)
        tests.append((uid, target.product_id, {r.product_id for r in before}))
    return train, tests

def evaluate(db, k=10):
    products = active_products(db)
    ids = [p.id for p in products]
    rows = list(db.scalars(select(Interaction).order_by(Interaction.created_at, Interaction.id)))
    train, tests = temporal_split(rows)
    if len(tests) < 3:
        raise ValueError('Chưa đủ dữ liệu đánh giá: cần ít nhất 3 người dùng với 3 sản phẩm khác nhau.')
    vectors = load_embeddings(db, products)
    if len(vectors) != len(products):
        raise ValueError('Cần tạo đầy đủ embedding CLIP trước khi so sánh công bằng cả ba phương pháp.')
    model = CollaborativeFiltering().fit(train, ids)
    alpha = get_alpha(db)
    metrics = {method: [] for method in ['collaborative', 'clip', 'hybrid']}
    coverage = {method: set() for method in metrics}
    latency = {method: [] for method in metrics}
    valid = set(ids)
    for uid, target, seen in tests:
        if target not in valid:
            continue
        # Every unseen catalog item is a negative candidate; identical candidates for all methods.
        for method in metrics:
            start = time.perf_counter()
            if method == 'collaborative':
                scores = scale_scores(model.scores(uid))
            elif method == 'clip':
                scores = scale_scores(content_scores(ids, vectors, train, uid))
            else:
                cfs = model.scores(uid)
                clips = content_scores(ids, vectors, train, uid)
                effective = alpha * min(1, len(seen) / 5)
                if not np.any(clips): effective = 1
                if not np.any(cfs): effective = 0
                scores = combine_scores(cfs, clips, effective)
            if not np.any(scores):
                scores = scale_scores(model.popularity)
            ordered = sorted(range(len(ids)), key=lambda i: (-float(scores[i]), ids[i]))
            ranked = [ids[i] for i in ordered if ids[i] not in seen][:k]
            latency[method].append((time.perf_counter() - start) * 1000)
            metrics[method].append(ranking_metrics(ranked, {target}, k))
            coverage[method].update(ranked)
    results = []
    for method, values in metrics.items():
        if not values:
            raise ValueError('Chưa có người dùng đánh giá hợp lệ.')
        result = {key: float(np.mean([v[key] for v in values])) for key in values[0]}
        result.update(model_name=method, k=k, coverage=len(coverage[method]) / max(1, len(ids)), inference_time_ms=float(np.mean(latency[method])))
        results.append(result)
    return {'results': results, 'users': len(metrics['hybrid']), 'train_interactions': len(train), 'test_interactions': len(tests),
            'simulated': any(r.simulated for r in rows), 'protocol': 'Leave-last-item-out theo thời gian; loại mọi tương tác của sản phẩm test khỏi train; cùng toàn bộ catalog chưa xem làm tập ứng viên; không negative sampling.',
            'latency_scope': 'Chấm điểm và xếp hạng trên CPU; không tính tải model, I/O và tạo embedding.', 'alpha': alpha}
