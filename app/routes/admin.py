import json
import logging
import threading
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from app.database import get_db, SessionLocal
from app.models import Product, ProductVariant, ProductImage, User, Order, Interaction, ProductEmbedding, ModelRun, ModelEvaluation, Setting, Category, Brand, now
from app.schemas import ProductIn, TaxonomyIn, AISettings, OrderStatus
from app.services.auth import admin_user
from app.repositories.catalog import serialize_product, active_products
from app.routes.api import serialize_order
from app.ai.hybrid_recommender import get_alpha

router = APIRouter(prefix='/api/admin', dependencies=[Depends(admin_user)])
log = logging.getLogger(__name__)
_job_lock = threading.Lock()

@router.get('/dashboard')
def dashboard(db=Depends(get_db)):
    counts = {key: db.scalar(select(func.count()).select_from(model)) for key, model in [('users', User), ('orders', Order), ('interactions', Interaction), ('embeddings', ProductEmbedding)]}
    counts['products'] = db.scalar(select(func.count(Product.id)).where(Product.active.is_(True)))
    counts['revenue'] = db.scalar(select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.status != 'Đã hủy'))
    events = db.execute(select(Interaction.interaction_type, func.count()).group_by(Interaction.interaction_type)).all()
    revenue = db.execute(select(func.date(Order.created_at), func.sum(Order.total_amount)).where(Order.status != 'Đã hủy').group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).limit(30)).all()
    popular = db.execute(select(Product, func.sum(Interaction.interaction_weight).label('score')).join(Interaction, Interaction.product_id == Product.id).group_by(Product.id).order_by(func.sum(Interaction.interaction_weight).desc()).limit(5)).all()
    return {**counts, 'alpha': get_alpha(db), 'simulated_interactions': db.scalar(select(func.count(Interaction.id)).where(Interaction.simulated.is_(True))),
            'events': [{'name': name, 'count': count} for name, count in events], 'revenue_chart': [{'date': date, 'total': total} for date, total in revenue],
            'popular': [{**serialize_product(p), 'interactions_score': float(score)} for p, score in popular],
            'runs': [serialize_run(r) for r in db.scalars(select(ModelRun).order_by(ModelRun.id.desc()).limit(10))]}

@router.get('/products')
def products(db=Depends(get_db)):
    return [{**serialize_product(p), 'clip_text': p.clip_text} for p in active_products(db)]

def validate_product(payload, db):
    if not db.get(Category, payload.category_id) or not db.get(Brand, payload.brand_id):
        raise HTTPException(422, 'Danh mục hoặc thương hiệu không tồn tại.')
    from app.config import ROOT
    path = (ROOT / 'app' / payload.thumbnail.lstrip('/')).resolve()
    if not path.is_relative_to((ROOT / 'app/static').resolve()) or not path.is_file():
        raise HTTPException(422, 'Vui lòng tải lên hoặc chọn một ảnh có thật.')
    if len(set(payload.sizes)) != len(payload.sizes) or any(len(s) > 20 or not s.strip() for s in payload.sizes):
        raise HTTPException(422, 'Kích thước không hợp lệ hoặc bị trùng.')

@router.post('/products', status_code=201)
def create_product(payload: ProductIn, db=Depends(get_db)):
    validate_product(payload, db)
    product = Product(**payload.model_dump(exclude={'stock', 'sizes'}))
    product.variants = [ProductVariant(size=size.strip(), color=payload.color, stock=payload.stock) for size in payload.sizes]
    product.images = [ProductImage(image_path=payload.thumbnail, is_primary=True)]
    db.add(product); db.commit()
    return serialize_product(product)

@router.put('/products/{product_id}')
def edit_product(product_id: int, payload: ProductIn, db=Depends(get_db)):
    validate_product(payload, db)
    product = db.get(Product, product_id)
    if not product or not product.active: raise HTTPException(404, 'Không tìm thấy sản phẩm.')
    for key, value in payload.model_dump(exclude={'stock', 'sizes'}).items(): setattr(product, key, value)
    existing = {v.size: v for v in product.variants}
    for size in payload.sizes:
        if size in existing:
            existing[size].stock = payload.stock
            existing[size].color = payload.color
        else: product.variants.append(ProductVariant(size=size, color=payload.color, stock=payload.stock))
    for size, variant in existing.items():
        if size not in payload.sizes: variant.stock = 0
    product.images = [ProductImage(image_path=payload.thumbnail, is_primary=True)]
    db.commit()
    return serialize_product(product)

@router.delete('/products/{product_id}')
def delete_product(product_id: int, db=Depends(get_db)):
    product = db.get(Product, product_id)
    if not product: raise HTTPException(404, 'Không tìm thấy sản phẩm.')
    # Archive instead of breaking historical order references.
    product.active = False
    db.commit()
    return {'ok': True}

def taxonomy_model(kind):
    if kind not in ['categories', 'brands']: raise HTTPException(404, 'Không tìm thấy danh mục quản lý.')
    return Category if kind == 'categories' else Brand

@router.post('/taxonomy/{kind}', status_code=201)
def create_taxonomy(kind: str, payload: TaxonomyIn, db=Depends(get_db)):
    model = taxonomy_model(kind)
    item = model(**payload.model_dump())
    db.add(item)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, 'Tên này đã tồn tại.')
    return {'id': item.id, 'name': item.name, 'description': item.description}

@router.put('/taxonomy/{kind}/{item_id}')
def edit_taxonomy(kind: str, item_id: int, payload: TaxonomyIn, db=Depends(get_db)):
    item = db.get(taxonomy_model(kind), item_id)
    if not item: raise HTTPException(404, 'Không tìm thấy dữ liệu.')
    item.name = payload.name; item.description = payload.description
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409, 'Tên này đã tồn tại.')
    return {'ok': True}

@router.delete('/taxonomy/{kind}/{item_id}')
def delete_taxonomy(kind: str, item_id: int, db=Depends(get_db)):
    item = db.get(taxonomy_model(kind), item_id)
    if not item: raise HTTPException(404, 'Không tìm thấy dữ liệu.')
    column = Product.category_id if kind == 'categories' else Product.brand_id
    if db.scalar(select(Product.id).where(column == item_id).limit(1)):
        raise HTTPException(409, 'Danh mục đang được sử dụng bởi sản phẩm.')
    db.delete(item); db.commit()
    return {'ok': True}

@router.get('/users')
def users(db=Depends(get_db)):
    return [{'id': u.id, 'name': u.full_name, 'email': u.email, 'username': u.username, 'phone': u.phone, 'email_verified': u.email_verified,
             'google_linked': bool(u.google_sub), 'role': u.role, 'simulated': u.simulated, 'created_at': u.created_at.isoformat()} for u in db.scalars(select(User).order_by(User.id))]

@router.get('/orders')
def orders(db=Depends(get_db)):
    return [serialize_order(o) for o in db.scalars(select(Order).order_by(Order.created_at.desc()))]

@router.patch('/orders/{order_id}')
def update_order(order_id: int, payload: OrderStatus, db=Depends(get_db)):
    order = db.get(Order, order_id)
    if not order: raise HTTPException(404, 'Không tìm thấy đơn hàng.')
    transitions = {'Đã xác nhận': ['Đang giao', 'Đã hủy'], 'Đang giao': ['Đã giao'], 'Đã giao': [], 'Đã hủy': []}
    if payload.status != order.status and payload.status not in transitions.get(order.status, []):
        raise HTTPException(409, 'Không thể chuyển sang trạng thái này.')
    if payload.status == 'Đã hủy' and order.status != 'Đã hủy':
        from sqlalchemy import update
        for item in order.items:
            db.execute(update(ProductVariant).where(ProductVariant.id == item.product_variant_id).values(stock=ProductVariant.stock + item.quantity))
    order.status = payload.status; db.commit()
    return serialize_order(order)

@router.get('/interactions')
def interactions(db=Depends(get_db)):
    rows = db.execute(select(Interaction, Product.name, User.full_name).join(Product, Product.id == Interaction.product_id).join(User, User.id == Interaction.user_id).order_by(Interaction.id.desc()).limit(100)).all()
    return [{'id': r.id, 'user': name, 'product': product, 'type': r.interaction_type, 'weight': r.interaction_weight, 'simulated': r.simulated, 'created_at': r.created_at.isoformat()} for r, product, name in rows]

@router.get('/ai/status')
def ai_status(db=Depends(get_db)):
    from app.config import settings
    from app.ai.content_recommender import load_embeddings
    products = active_products(db)
    vectors = load_embeddings(db, products)
    return {'model': settings.clip_model, 'device': settings.clip_device, 'products': len(products), 'embeddings': len(vectors), 'ready': bool(vectors), 'alpha': get_alpha(db),
            'runs': [serialize_run(r) for r in db.scalars(select(ModelRun).order_by(ModelRun.id.desc()).limit(15))]}

@router.put('/ai/settings')
def ai_settings(payload: AISettings, db=Depends(get_db)):
    setting = db.get(Setting, 'alpha')
    if not setting: setting = Setting(key='alpha'); db.add(setting)
    setting.value = str(payload.alpha); db.commit()
    return {'alpha': payload.alpha}

def serialize_run(run):
    return {'id': run.id, 'kind': run.kind, 'status': run.status, 'message': run.message, 'result': json.loads(run.result), 'created_at': run.created_at.isoformat(), 'finished_at': run.finished_at.isoformat() if run.finished_at else None}

def run_task(run_id, kind, k):
    with SessionLocal() as db:
        run = db.get(ModelRun, run_id)
        try:
            if kind == 'generate-embeddings':
                from app.ai.clip_encoder import generate_embeddings
                result = generate_embeddings(db, active_products(db))
            elif kind == 'rebuild-cf':
                import numpy as np
                from app.ai.collaborative_filtering import CollaborativeFiltering
                from app.config import ROOT
                products = active_products(db)
                rows = list(db.scalars(select(Interaction)))
                model = CollaborativeFiltering().fit(rows, [p.id for p in products])
                np.savez_compressed(ROOT / 'data/embeddings/cf.npz', product_ids=model.product_ids, similarity=model.similarity)
                result = {'products': len(products), 'users': len(model.user_ids), 'interactions': len(rows)}
            else:
                from app.ai.evaluation import evaluate
                result = evaluate(db, k)
                for values in result['results']: db.add(ModelEvaluation(run_id=run_id, **values))
            run.status = 'completed'; run.message = 'Đã hoàn tất'; run.result = json.dumps(result, ensure_ascii=False)
        except Exception as exc:
            db.rollback()
            run = db.get(ModelRun, run_id)
            log.exception('AI task %s failed', kind)
            run.status = 'failed'
            run.message = str(exc)[:1200]
        finally:
            run.finished_at = now(); db.commit(); _job_lock.release()

@router.post('/ai/{kind}', status_code=202)
def start_ai_task(kind: str, k: int = Query(10, ge=1, le=50), db=Depends(get_db)):
    if kind not in ['generate-embeddings', 'rebuild-cf', 'evaluate']: raise HTTPException(404, 'Tác vụ không tồn tại.')
    if not _job_lock.acquire(blocking=False): raise HTTPException(409, 'Đang có tác vụ AI khác chạy. Vui lòng đợi hoàn tất.')
    run = ModelRun(kind=kind)
    db.add(run); db.commit()
    threading.Thread(target=run_task, args=(run.id, kind, k), daemon=True).start()
    return serialize_run(run)

@router.get('/ai/runs/{run_id}')
def get_run(run_id: int, db=Depends(get_db)):
    run = db.get(ModelRun, run_id)
    if not run: raise HTTPException(404, 'Không tìm thấy tác vụ.')
    return serialize_run(run)

@router.get('/evaluations')
def evaluations(db=Depends(get_db)):
    runs = list(db.scalars(select(ModelRun).where(ModelRun.kind == 'evaluate', ModelRun.status == 'completed').order_by(ModelRun.id.desc()).limit(10)))
    return [serialize_run(r) for r in runs]

@router.get('/dataset')
def dataset(db=Depends(get_db)):
    products = active_products(db)
    from app.ai.clip_encoder import image_path
    return {'products': len(products), 'valid_images': sum(image_path(p) is not None for p in products),
            'simulated_users': db.scalar(select(func.count(User.id)).where(User.simulated.is_(True))),
            'simulated_interactions': db.scalar(select(func.count(Interaction.id)).where(Interaction.simulated.is_(True))),
            'source': 'Catalog gồm ảnh biên tập Unsplash và 240 sản phẩm Fashion Product Images có ảnh gốc riêng. Metadata nguồn lưu trong catalog-manifest.json, nguồn ảnh và giấy phép trong catalog-provenance.json. Giá, chất liệu, đánh giá mẫu, đơn hàng và tương tác seed được gắn nhãn minh họa/mô phỏng.',
            'csv_columns': ['name', 'description', 'price', 'gender', 'color', 'material', 'style', 'thumbnail', 'category', 'brand', 'clip_text']}
