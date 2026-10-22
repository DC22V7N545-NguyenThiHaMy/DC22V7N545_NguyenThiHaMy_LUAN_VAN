import hashlib
import io
import json
from pathlib import Path
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, Query
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select, func, delete, update, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import (User, Session as AuthSession, Product, ProductVariant, Category, Brand,
                        Review, Interaction, Favorite, Cart, CartItem, Order, OrderItem)
from app.schemas import *
from app.services.auth import current_user, optional_user, admin_user, start_session, hasher, verify_password, public_user, throttle
from app.services.interactions import record
from app.repositories.catalog import serialize_product, active_products
from app.config import ROOT

router = APIRouter(prefix='/api')

@router.get('/health')
def health():
    return {'status': 'ok'}

@router.post('/auth/register', status_code=201)
def register(payload: Register, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    if db.scalar(select(User.id).where(User.email == payload.email)):
        raise HTTPException(409, 'Email này đã được đăng ký.')
    user = User(full_name=payload.full_name.strip(), email=payload.email, password_hash=hasher.hash(payload.password))
    db.add(user)
    try:
        db.flush()
        start_session(db, user, response)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Email này đã được đăng ký.')
    return public_user(user)

@router.post('/auth/login')
def login(payload: Login, response: Response, request: Request, db: Session = Depends(get_db)):
    throttle(request)
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    valid = verify_password(payload.password, user.password_hash if user else None)
    if not user or not valid:
        raise HTTPException(401, 'Email hoặc mật khẩu chưa chính xác.')
    start_session(db, user, response)
    return public_user(user)

@router.post('/auth/logout')
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get('vela_session')
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hashlib.sha256(token.encode()).hexdigest()))
        db.commit()
    response.delete_cookie('vela_session', path='/')
    return {'ok': True}

@router.get('/auth/me')
def me(user=Depends(optional_user)):
    return public_user(user) if user else None

@router.put('/profile')
def profile(payload: Profile, user=Depends(current_user), db: Session = Depends(get_db)):
    user.full_name = payload.full_name.strip()
    user.preferences = json.dumps(payload.model_dump(exclude={'full_name'}), ensure_ascii=False)
    db.commit()
    return public_user(user)

@router.get('/categories')
def categories(db: Session = Depends(get_db)):
    return [{'id': x.id, 'name': x.name, 'description': x.description} for x in db.scalars(select(Category))]

@router.get('/brands')
def brands(db: Session = Depends(get_db)):
    return [{'id': x.id, 'name': x.name, 'description': x.description} for x in db.scalars(select(Brand))]

@router.get('/products')
def products(q: str = Query(default='', max_length=150), gender: str = '', category: int | None = None, brand: int | None = None,
             color: str = '', size: str = '', style: str = '', sale: bool = False, min_price: int = 0, max_price: int = 100000000,
             sort: str = 'featured', page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=60), db: Session = Depends(get_db)):
    statement = select(Product).where(Product.active.is_(True), Product.price >= min_price, Product.price <= max_price)
    if q:
        # Escape SQL LIKE wildcards; users search literal text.
        query = q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        statement = statement.where(or_(Product.name.ilike(f'%{query}%', escape='\\'), Product.description.ilike(f'%{query}%', escape='\\')))
    if gender: statement = statement.where(Product.gender == gender)
    if category: statement = statement.where(Product.category_id == category)
    if brand: statement = statement.where(Product.brand_id == brand)
    if color: statement = statement.where(Product.color == color)
    if style: statement = statement.where(Product.style == style)
    if sale: statement = statement.where(Product.original_price > Product.price)
    if size: statement = statement.where(Product.variants.any((ProductVariant.size == size) & (ProductVariant.stock > 0)))
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    if sort == 'price-asc': statement = statement.order_by(Product.price, Product.id)
    elif sort == 'price-desc': statement = statement.order_by(Product.price.desc(), Product.id)
    elif sort == 'newest': statement = statement.order_by(Product.created_at.desc(), Product.id.desc())
    elif sort == 'popular':
        popularity = select(Interaction.product_id, func.sum(Interaction.interaction_weight).label('score')).group_by(Interaction.product_id).subquery()
        statement = statement.outerjoin(popularity, Product.id == popularity.c.product_id).order_by(func.coalesce(popularity.c.score, 0).desc(), Product.id)
    else: statement = statement.order_by(Product.id)
    items = db.scalars(statement.offset((page - 1) * limit).limit(limit)).all()
    return {'items': [serialize_product(p) for p in items], 'total': total, 'page': page, 'pages': (total + limit - 1) // limit}

def get_product(db, product_id):
    product = db.get(Product, product_id)
    if not product or not product.active:
        raise HTTPException(404, 'Không tìm thấy sản phẩm.')
    return product

@router.get('/products/{product_id}')
def product_detail(product_id: int, user=Depends(optional_user), db: Session = Depends(get_db)):
    product = get_product(db, product_id)
    if user:
        record(db, user.id, product_id, 'view')
        db.commit()
    return serialize_product(product, db)

@router.get('/products/{product_id}/reviews')
def reviews(product_id: int, db: Session = Depends(get_db)):
    get_product(db, product_id)
    return [{'id': r.id, 'name': r.user.full_name, 'rating': r.rating, 'comment': r.comment, 'simulated': r.simulated, 'created_at': r.created_at.isoformat()} for r in db.scalars(select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc()).limit(50))]

@router.post('/products/{product_id}/reviews')
def add_review(product_id: int, payload: ReviewIn, user=Depends(current_user), db: Session = Depends(get_db)):
    get_product(db, product_id)
    review = db.scalar(select(Review).where(Review.user_id == user.id, Review.product_id == product_id))
    if not review:
        review = Review(user_id=user.id, product_id=product_id)
        db.add(review)
    review.rating = payload.rating
    review.comment = payload.comment
    review.simulated = False
    db.commit()
    return {'ok': True}

@router.post('/interactions')
def interaction(payload: InteractionIn, user=Depends(current_user), db: Session = Depends(get_db)):
    get_product(db, payload.product_id)
    record(db, user.id, payload.product_id, payload.interaction_type)
    db.commit()
    return {'ok': True}

@router.get('/history')
def history(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(Interaction.product_id, func.max(Interaction.created_at).label('last')).where(Interaction.user_id == user.id).group_by(Interaction.product_id).order_by(func.max(Interaction.created_at).desc()).limit(24)).all()
    return [serialize_product(db.get(Product, row.product_id)) for row in rows if db.get(Product, row.product_id).active]

@router.get('/favorites')
def favorites(user=Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_product(p) for p in db.scalars(select(Product).join(Favorite, Favorite.product_id == Product.id).where(Favorite.user_id == user.id, Product.active.is_(True)).order_by(Favorite.created_at.desc()))]

@router.post('/favorites/{product_id}')
def favorite(product_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    get_product(db, product_id)
    found = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.product_id == product_id))
    if found:
        db.delete(found)
    else:
        db.add(Favorite(user_id=user.id, product_id=product_id))
        record(db, user.id, product_id, 'favorite')
    db.commit()
    return {'favorite': not bool(found)}

def user_cart(db, user_id):
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart); db.flush()
    return cart

def cart_payload(db, user_id):
    cart = user_cart(db, user_id)
    items = list(db.scalars(select(CartItem).where(CartItem.cart_id == cart.id)))
    result = [{'id': i.id, 'quantity': i.quantity, 'size': i.variant.size, 'stock': i.variant.stock, 'variant_id': i.product_variant_id, 'product': serialize_product(i.variant.product)} for i in items]
    total = sum(i.quantity * i.variant.product.price for i in items)
    return {'items': result, 'total': total, 'shipping': 0 if total >= 999000 or total == 0 else 30000, 'count': sum(i.quantity for i in items)}

@router.get('/cart')
def cart(user=Depends(current_user), db: Session = Depends(get_db)):
    result = cart_payload(db, user.id)
    db.commit()
    return result

@router.post('/cart', status_code=201)
def add_cart(payload: CartAdd, user=Depends(current_user), db: Session = Depends(get_db)):
    variant = db.get(ProductVariant, payload.variant_id)
    if not variant or not variant.product.active:
        raise HTTPException(404, 'Không tìm thấy phân loại sản phẩm.')
    cart = user_cart(db, user.id)
    item = db.scalar(select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_variant_id == variant.id))
    quantity = payload.quantity + (item.quantity if item else 0)
    if quantity > variant.stock or quantity > 20:
        raise HTTPException(409, 'Số lượng vượt quá tồn kho hoặc giới hạn 20 sản phẩm.')
    if item: item.quantity = quantity
    else: db.add(CartItem(cart_id=cart.id, product_variant_id=variant.id, quantity=quantity))
    record(db, user.id, variant.product_id, 'cart')
    db.commit()
    return cart_payload(db, user.id)

def owned_cart_item(db, user, item_id):
    cart = user_cart(db, user.id)
    item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    if not item: raise HTTPException(404, 'Không tìm thấy sản phẩm trong giỏ hàng.')
    return item

@router.patch('/cart/{item_id}')
def change_quantity(item_id: int, payload: Quantity, user=Depends(current_user), db: Session = Depends(get_db)):
    item = owned_cart_item(db, user, item_id)
    if payload.quantity > item.variant.stock: raise HTTPException(409, 'Không đủ hàng trong kho.')
    item.quantity = payload.quantity
    db.commit()
    return cart_payload(db, user.id)

@router.delete('/cart/{item_id}')
def remove_cart(item_id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    db.delete(owned_cart_item(db, user, item_id))
    db.commit()
    return cart_payload(db, user.id)

@router.post('/orders', status_code=201)
def checkout(payload: Checkout, user=Depends(current_user), db: Session = Depends(get_db)):
    cart = user_cart(db, user.id)
    items = list(db.scalars(select(CartItem).where(CartItem.cart_id == cart.id)))
    if not items: raise HTTPException(400, 'Giỏ hàng của bạn đang trống.')
    total = sum(item.quantity * item.variant.product.price for item in items)
    shipping = 0 if total >= 999000 else 30000
    order = Order(user_id=user.id, total_amount=total + shipping, **payload.model_dump())
    db.add(order); db.flush()
    # Conditional SQL updates protect against two checkouts consuming the same stock.
    for item in items:
        if not item.variant.product.active:
            db.rollback(); raise HTTPException(409, 'Một sản phẩm đã ngừng bán. Vui lòng cập nhật giỏ hàng.')
        changed = db.execute(update(ProductVariant).where(ProductVariant.id == item.product_variant_id, ProductVariant.stock >= item.quantity).values(stock=ProductVariant.stock - item.quantity))
        if changed.rowcount != 1:
            db.rollback(); raise HTTPException(409, 'Một sản phẩm vừa hết hàng. Vui lòng cập nhật giỏ hàng.')
        db.add(OrderItem(order_id=order.id, product_variant_id=item.product_variant_id, quantity=item.quantity, unit_price=item.variant.product.price))
        record(db, user.id, item.variant.product_id, 'purchase')
        db.delete(item)
    db.commit()
    return {'id': order.id, 'total': order.total_amount, 'status': order.status, 'simulated': True}

def serialize_order(order):
    return {'id': order.id, 'total': order.total_amount, 'status': order.status, 'full_name': order.full_name,
            'phone': order.phone, 'address': order.address, 'created_at': order.created_at.isoformat(),
            'items': [{'name': i.variant.product.name, 'thumbnail': i.variant.product.thumbnail, 'size': i.variant.size, 'quantity': i.quantity, 'unit_price': i.unit_price} for i in order.items]}

@router.get('/orders')
def orders(user=Depends(current_user), db: Session = Depends(get_db)):
    return [serialize_order(o) for o in db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()))]

@router.get('/recommendations/similar/{product_id}')
def similar(product_id: int, k: int = Query(6, ge=1, le=24), db: Session = Depends(get_db)):
    from app.ai.content_recommender import load_embeddings
    product = get_product(db, product_id)
    catalog = active_products(db)
    vectors = load_embeddings(db, catalog)
    if product_id not in vectors:
        fallback = [p for p in catalog if p.category_id == product.category_id and p.id != product_id][:k]
        return {'items': [serialize_product(p) for p in fallback], 'status': 'category_fallback', 'message': 'Cùng danh mục • CLIP chưa sẵn sàng cho sản phẩm này.'}
    ranked = sorted(((p, float(vectors[product_id] @ vectors[p.id])) for p in catalog if p.id != product_id and p.id in vectors), key=lambda v: -v[1])[:k]
    return {'items': [{**serialize_product(p), 'score': round(score, 5)} for p, score in ranked], 'status': 'clip', 'message': 'Tương tự về hình ảnh và mô tả, phân tích bởi CLIP.'}

@router.get('/recommendations/{method}')
def recommendations(method: str, k: int = Query(12, ge=1, le=48), gender: str = '', max_price: int | None = None, user=Depends(optional_user), db: Session = Depends(get_db)):
    from app.ai.hybrid_recommender import recommend
    if method not in ['hybrid', 'collaborative', 'clip']: raise HTTPException(404, 'Phương pháp không tồn tại.')
    return recommend(db, user, method, k, gender or None, max_price)

async def read_image(file):
    if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
        raise HTTPException(415, 'Vui lòng chọn ảnh JPG, PNG hoặc WebP.')
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024: raise HTTPException(413, 'Ảnh tối đa 5 MB.')
    try:
        image = Image.open(io.BytesIO(data))
        if image.width * image.height > 25000000: raise HTTPException(413, 'Độ phân giải ảnh quá lớn (tối đa 25 megapixel).')
        if image.format not in ['JPEG', 'PNG', 'WEBP']: raise HTTPException(415, 'Định dạng ảnh không hợp lệ.')
        image.load()
        return image.convert('RGB')
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, 'Không thể đọc ảnh. Vui lòng chọn ảnh khác.')

@router.post('/recommendations/image-search')
async def search_image(file: UploadFile = File(...), user=Depends(current_user), db: Session = Depends(get_db)):
    from app.ai.image_search import image_search
    from starlette.concurrency import run_in_threadpool
    image = await read_image(file)
    try:
        result = await run_in_threadpool(image_search, db, image)
    except Exception:
        import logging
        logging.exception('CLIP image search failed')
        raise HTTPException(503, 'CLIP chưa sẵn sàng. Quản trị viên có thể kiểm tra mô hình trong khu vực AI.')
    if result is None: raise HTTPException(503, 'Chưa có embedding CLIP. Vui lòng tạo đặc trưng trong trang quản trị AI trước.')
    return {'items': result, 'method': 'CLIP image cosine similarity'}

@router.post('/admin/uploads')
async def upload_image(file: UploadFile = File(...), user=Depends(admin_user)):
    import secrets
    image = await read_image(file)
    image.thumbnail((1800, 2400))
    filename = secrets.token_hex(16) + '.jpg'
    image.save(ROOT / 'app/static/uploads' / filename, 'JPEG', quality=88)
    return {'path': '/static/uploads/' + filename}

@router.get('/info/{slug}')
def info(slug: str):
    pages = {
        've-chung-toi': ('Chúng mình là VELASTYLE', 'Thời trang đẹp bắt đầu từ cảm giác được là chính mình. VELASTYLE là nền tảng khám phá phong cách cá nhân, kết hợp tuyển chọn thiết kế và công nghệ gợi ý. Đây là dự án học thuật; toàn bộ đơn hàng và thanh toán được mô phỏng.'),
        'giao-hang': ('Giao hàng & đổi trả', 'Trong bản mô phỏng: miễn phí giao hàng cho đơn từ 999.000đ, phí giao hàng 30.000đ cho đơn nhỏ hơn. Thời gian dự kiến 3–5 ngày làm việc. Hỗ trợ đổi sản phẩm trong 30 ngày nếu còn nguyên tem và chưa sử dụng. Dự án không phát sinh vận chuyển hoặc thanh toán thật.'),
        'bao-mat': ('Quyền riêng tư', 'Lịch sử xem, yêu thích, giỏ hàng và mua hàng được lưu trong SQLite để cá nhân hóa gợi ý. Mật khẩu được bảo vệ bằng Argon2, phiên đăng nhập dùng cookie HttpOnly. Ảnh tìm kiếm chỉ được xử lý trong bộ nhớ và không lưu. Dữ liệu thử nghiệm có nhãn mô phỏng.'),
        'lien-he': ('Luôn ở đây cùng bạn', 'Nếu cần hỗ trợ sử dụng, hãy xem hướng dẫn README đi kèm dự án hoặc liên hệ người quản trị bản cài đặt của bạn. Đây là website đồ án, chưa có bộ phận chăm sóc khách hàng thương mại.'),
        'kich-thuoc': ('Tìm kích thước vừa vặn', 'S: ngực 82–86 cm, eo 64–68 cm. M: ngực 86–90 cm, eo 68–72 cm. L: ngực 90–94 cm, eo 72–76 cm. XL: ngực 94–98 cm, eo 76–80 cm. Số đo mang tính tham khảo; ưu tiên so sánh với món đồ bạn đang mặc thoải mái.')}
    if slug not in pages: raise HTTPException(404, 'Không tìm thấy trang.')
    return dict(zip(['title', 'content'], pages[slug]))
