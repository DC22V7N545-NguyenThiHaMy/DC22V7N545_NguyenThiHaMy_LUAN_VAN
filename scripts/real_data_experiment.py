"""Offline experiment on real interactions: Amazon Reviews 2023, category Amazon_Fashion.

Reuses the app's CF, CLIP profile, hybrid formula and temporal split. Never touches data/velastyle.db.
Stages (run in order, each resumable): prepare -> images -> embed -> evaluate.
See docs/guides/real-data-experiment.md.
"""
import argparse
import gzip
import json
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from PIL import Image
from app.ai.collaborative_filtering import CollaborativeFiltering
from app.ai.content_recommender import content_scores
from app.ai.evaluation import ranking_metrics, temporal_split
from app.ai.hybrid_recommender import combine_scores
from app.ai.preprocessing import normalize, scale_scores

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/external/amazon-fashion'
REVIEWS = DATA / 'Amazon_Fashion.jsonl.gz'
META = DATA / 'meta_Amazon_Fashion.jsonl.gz'
SUBSET = DATA / 'subset.json'
IMAGES = DATA / 'images'
EMB = DATA / 'embeddings.npz'
OUT = ROOT / 'artifacts/real-data-eval-amazon-fashion.json'


def lines(path):
    with gzip.open(path, 'rt', encoding='utf-8') as handle:
        for line in handle:
            yield json.loads(line)


def image_url(images):
    for image in images or []:
        if image.get('variant') == 'MAIN' and image.get('large'):
            return image['large']
    for image in images or []:
        if image.get('large'):
            return image['large']
    return None


def k_core(pairs, k):
    """pairs: dict (user, item) -> timestamp. Iteratively drop users/items with fewer than k interactions."""
    while True:
        users, items = Counter(u for u, _ in pairs), Counter(i for _, i in pairs)
        kept = {key: ts for key, ts in pairs.items() if users[key[0]] >= k and items[key[1]] >= k}
        if len(kept) == len(pairs):
            return kept
        pairs = kept


def prepare(args):
    t0 = time.time()
    print('Reading metadata ...')
    meta = {}
    total_meta = 0
    for row in lines(META):
        total_meta += 1
        url, title = image_url(row.get('images')), (row.get('title') or '').strip()
        if url and title:
            meta[row['parent_asin']] = {'title': title, 'categories': row.get('categories') or [],
                                        'features': row.get('features') or [], 'image_url': url}
    print(f'  items with title+image: {len(meta):,} / {total_meta:,}')
    print('Reading reviews ...')
    pairs, total_reviews = {}, 0
    for row in lines(REVIEWS):
        total_reviews += 1
        item = row.get('parent_asin')
        if item in meta and row.get('user_id'):
            key = (row['user_id'], item)
            pairs[key] = max(pairs.get(key, 0), int(row['timestamp']))
    print(f'  reviews: {total_reviews:,}; unique user-item pairs on usable items: {len(pairs):,}')
    pairs = k_core(pairs, args.k_core)
    print(f'  {args.k_core}-core: {len(pairs):,} interactions, {len({u for u, _ in pairs}):,} users, {len({i for _, i in pairs}):,} items')
    if len({i for _, i in pairs}) > args.max_items:
        popularity = Counter(i for _, i in pairs)
        keep = {i for i, _ in popularity.most_common(args.max_items)}
        pairs = k_core({key: ts for key, ts in pairs.items() if key[1] in keep}, args.k_core)
        print(f'  capped to top {args.max_items} items, re-applied {args.k_core}-core: {len(pairs):,} interactions')
    users = sorted({u for u, _ in pairs})
    items = sorted({i for _, i in pairs})
    user_index, item_index = {u: n for n, u in enumerate(users)}, {i: n for n, i in enumerate(items)}
    stats = {'source': 'Amazon Reviews 2023 / Amazon_Fashion', 'k_core': args.k_core, 'max_items': args.max_items,
             'raw_reviews': total_reviews, 'raw_items_with_title_and_image': len(meta),
             'users': len(users), 'items': len(items), 'interactions': len(pairs),
             'density': len(pairs) / (len(users) * len(items)),
             'time_span': [datetime.fromtimestamp(min(pairs.values()) / 1000, timezone.utc).date().isoformat(),
                           datetime.fromtimestamp(max(pairs.values()) / 1000, timezone.utc).date().isoformat()]}
    SUBSET.write_text(json.dumps({
        'stats': stats,
        'items': [{'asin': i, **meta[i]} for i in items],
        'interactions': [[user_index[u], item_index[i], ts] for (u, i), ts in sorted(pairs.items(), key=lambda p: p[1])],
    }, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(stats, indent=2, ensure_ascii=False), f'\n{time.time() - t0:.0f}s')


def fetch(job):
    index, url = job
    path = IMAGES / f'{index}.jpg'
    if path.exists():
        return index, True
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 (thesis research)'}), timeout=30) as response:
                image = Image.open(BytesIO(response.read())).convert('RGB')
            image.thumbnail((448, 448))
            image.save(path, 'JPEG', quality=88)
            return index, True
        except Exception:
            time.sleep(1 + attempt)
    return index, False


def images(args):
    IMAGES.mkdir(exist_ok=True)
    items = json.loads(SUBSET.read_text(encoding='utf-8'))['items']
    done = failed = 0
    with ThreadPoolExecutor(args.workers) as pool:
        for n, (index, ok) in enumerate(pool.map(fetch, [(i, it['image_url']) for i, it in enumerate(items)]), 1):
            failed += not ok
            if n % 250 == 0 or n == len(items):
                print(f'  {n}/{len(items)} processed, {failed} failed', flush=True)
    print(f'images: {len(items) - failed} ok, {failed} failed')


def item_text(item):
    category = item['categories'][-1] if item['categories'] else ''
    feature = item['features'][0] if item['features'] else ''
    return f"{item['title']}. {category}. {feature}"[:300]


def embed(args):
    from app.ai.clip_encoder import get_encoder
    items = json.loads(SUBSET.read_text(encoding='utf-8'))['items']
    encoder = get_encoder()
    torch = encoder.torch
    n = len(items)
    image_vec, text_vec, has_image = np.zeros((n, 512), np.float32), np.zeros((n, 512), np.float32), np.zeros(n, bool)
    t0 = time.time()
    for start in range(0, n, args.batch):
        batch = list(range(start, min(n, start + args.batch)))
        texts = [item_text(items[i]) for i in batch]
        inputs = encoder.processor(text=texts, return_tensors='pt', padding=True, truncation=True, max_length=77).to(encoder.device)
        with torch.inference_mode():
            text_vec[batch] = normalize(encoder.model.get_text_features(**inputs).cpu().numpy())
        pictures, ok = [], []
        for i in batch:
            path = IMAGES / f'{i}.jpg'
            if path.exists():
                pictures.append(Image.open(path).convert('RGB')); ok.append(i)
        if pictures:
            inputs = encoder.processor(images=pictures, return_tensors='pt').to(encoder.device)
            with torch.inference_mode():
                image_vec[ok] = normalize(encoder.model.get_image_features(**inputs).cpu().numpy())
            has_image[ok] = True
        if (start // args.batch) % 10 == 0:
            print(f'  {min(n, start + args.batch)}/{n}  {time.time() - t0:.0f}s', flush=True)
    combined = np.where(has_image[:, None], normalize(0.6 * image_vec + 0.4 * text_vec), text_vec)
    np.savez_compressed(EMB, image=image_vec, text=text_vec, combined=combined.astype(np.float32), has_image=has_image)
    print(f'embeddings saved: {int(has_image.sum())}/{n} with image, {time.time() - t0:.0f}s')


def bootstrap_ci(values, rng, rounds=2000):
    values = np.asarray(values, dtype=float)
    means = values[rng.integers(0, len(values), (rounds, len(values)))].mean(axis=1)
    return float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def evaluate(args):
    data = json.loads(SUBSET.read_text(encoding='utf-8'))
    stats, n_items = data['stats'], len(data['items'])
    vectors = np.load(EMB)
    combined, has_image = vectors['combined'], vectors['has_image']
    ids = list(range(n_items))
    embeddings = {i: combined[i] for i in ids}
    rows = [SimpleNamespace(id=n, user_id=u, product_id=i, interaction_type='purchase', interaction_weight=1.0,
                            created_at=datetime.fromtimestamp(ts / 1000, timezone.utc).replace(tzinfo=None))
            for n, (u, i, ts) in enumerate(data['interactions'])]
    train, tests = temporal_split(rows)
    print(f'users with a test item: {len(tests):,}; train interactions: {len(train):,}')
    model = CollaborativeFiltering().fit(train, ids)
    rng = np.random.default_rng(2026)
    methods = ['popularity', 'random', 'collaborative', 'clip', *[f'hybrid_a{a:.1f}' for a in args.alphas]]
    ids_arr = np.array(ids)
    per_user = {m: {k: [] for k in args.k} for m in methods}
    coverage = {m: {k: set() for k in args.k} for m in methods}
    for number, (uid, target, seen) in enumerate(tests, 1):
        seen_mask = np.zeros(n_items, bool)
        seen_mask[list(seen)] = True
        cfs = model.scores(uid)
        clips = content_scores(ids, embeddings, train, uid)
        scores = {'popularity': scale_scores(model.popularity), 'random': rng.random(n_items),
                  'collaborative': scale_scores(cfs), 'clip': scale_scores(clips)}
        for a in args.alphas:
            effective = a * min(1, len(seen) / 5)  # identical to hybrid_recommender.recommend
            if not np.any(clips): effective = 1
            if not np.any(cfs): effective = 0
            scores[f'hybrid_a{a:.1f}'] = combine_scores(cfs, clips, effective)
        for method in methods:
            s = scores[method]
            if method not in ('popularity', 'random') and not np.any(s):
                s = scale_scores(model.popularity)
            order = np.lexsort((ids_arr, -s))
            ranked = order[~seen_mask[order]][:max(args.k)].tolist()
            for k in args.k:
                per_user[method][k].append(ranking_metrics(ranked[:k], {target}, k))
                coverage[method][k].update(ranked[:k])
        if number % 2000 == 0:
            print(f'  {number}/{len(tests)}', flush=True)
    boot = np.random.default_rng(7)
    results = {}
    for method in methods:
        results[method] = {}
        for k in args.k:
            m = per_user[method][k]
            entry = {key: float(np.mean([v[key] for v in m])) for key in m[0]}
            entry['ndcg_ci95'] = bootstrap_ci([v['ndcg_at_k'] for v in m], boot)
            entry['hit_ci95'] = bootstrap_ci([v['hit_rate_at_k'] for v in m], boot)
            entry['coverage'] = len(coverage[method][k]) / n_items
            results[method][k] = entry
    best_alpha = max(args.alphas, key=lambda a: results[f'hybrid_a{a:.1f}'][10]['ndcg_at_k'])
    diffs = {}
    for k in args.k:
        for a, b in [(f'hybrid_a{args.main_alpha:.1f}', 'collaborative'), (f'hybrid_a{args.main_alpha:.1f}', 'popularity'), ('collaborative', 'popularity'), ('clip', 'random')]:
            d = np.array([x['ndcg_at_k'] - y['ndcg_at_k'] for x, y in zip(per_user[a][k], per_user[b][k])])
            diffs[f'{a}-{b}@{k}'] = {'mean_ndcg_diff': float(d.mean()), 'ci95': bootstrap_ci(d, boot)}
    out = {'generated': datetime.now().date().isoformat(), 'dataset': stats, 'test_users': len(tests), 'train_interactions': len(train),
           'items_with_image': int(has_image.sum()), 'k': args.k, 'alphas': args.alphas, 'main_alpha': args.main_alpha,
           'best_alpha_ndcg10': best_alpha, 'results': results, 'paired_ndcg_differences': diffs,
           'protocol': 'Leave-last-item-out theo thời gian (app.ai.evaluation.temporal_split); ứng viên là mọi sản phẩm chưa thấy trong train; không negative sampling; random = một lần xếp hạng ngẫu nhiên cố định seed.'}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'saved {OUT}')
    for k in args.k:
        print(f'\nK={k}')
        for method in methods:
            r = results[method][k]
            print(f"  {method:16} P={r['precision_at_k']:.4f} Hit={r['hit_rate_at_k']:.4f} NDCG={r['ndcg_at_k']:.4f} "
                  f"[{r['ndcg_ci95'][0]:.4f},{r['ndcg_ci95'][1]:.4f}] cov={r['coverage']:.3f}")
    print('\nbest alpha by NDCG@10:', best_alpha)
    for key, v in diffs.items():
        print(f"  {key}: {v['mean_ndcg_diff']:+.4f} CI95 [{v['ci95'][0]:+.4f}, {v['ci95'][1]:+.4f}]")


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='stage', required=True)
    p = sub.add_parser('prepare'); p.add_argument('--k-core', type=int, default=5); p.add_argument('--max-items', type=int, default=5000); p.set_defaults(fn=prepare)
    p = sub.add_parser('images'); p.add_argument('--workers', type=int, default=8); p.set_defaults(fn=images)
    p = sub.add_parser('embed'); p.add_argument('--batch', type=int, default=32); p.set_defaults(fn=embed)
    p = sub.add_parser('evaluate'); p.add_argument('--k', type=int, nargs='+', default=[5, 10, 20])
    p.add_argument('--alphas', type=float, nargs='+', default=[round(a * 0.1, 1) for a in range(0, 11)])
    p.add_argument('--main-alpha', type=float, default=0.5); p.set_defaults(fn=evaluate)
    args = parser.parse_args()
    args.fn(args)
