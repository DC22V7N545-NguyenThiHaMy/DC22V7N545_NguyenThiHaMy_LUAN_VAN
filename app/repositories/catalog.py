from sqlalchemy import select, func
from app.models import Product, Review, now

def serialize_product(product, db=None):
    data = {key: getattr(product, key) for key in ['id', 'name', 'description', 'price', 'original_price', 'gender', 'color', 'material', 'style', 'thumbnail', 'category_id', 'brand_id']}
    data.update(category=product.category.name, brand=product.brand.name, stock=sum(v.stock for v in product.variants),
                created_at=product.created_at.isoformat(), is_new=(now() - product.created_at).days <= 14,
                variants=[{'id': v.id, 'size': v.size, 'color': v.color, 'stock': v.stock} for v in product.variants],
                images=[i.image_path for i in product.images] or [product.thumbnail])
    if db is not None:
        rating, count = db.execute(select(func.avg(Review.rating), func.count(Review.id)).where(Review.product_id == product.id)).one()
        data.update(rating=round(rating, 1) if rating else None, review_count=count)
        data['simulated_review_count'] = db.scalar(select(func.count(Review.id)).where(Review.product_id == product.id, Review.simulated.is_(True)))
    return data

def active_products(db):
    return list(db.scalars(select(Product).where(Product.active.is_(True)).order_by(Product.id)))
