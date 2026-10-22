from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, UniqueConstraint, CheckConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default='user')
    preferences: Mapped[str] = mapped_column(Text, default='{}')
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Session(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

class Category(Base):
    __tablename__ = 'categories'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default='')

class Brand(Base):
    __tablename__ = 'brands'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default='')

class Product(Base):
    __tablename__ = 'products'
    __table_args__ = (CheckConstraint('price > 0'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'), index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey('brands.id'), index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str] = mapped_column(Text)
    clip_text: Mapped[str] = mapped_column(Text, default='')
    price: Mapped[int] = mapped_column(Integer)
    original_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str] = mapped_column(String(20), default='Nữ', index=True)
    color: Mapped[str] = mapped_column(String(50), default='Be')
    material: Mapped[str] = mapped_column(String(100), default='Cotton')
    style: Mapped[str] = mapped_column(String(100), default='Tối giản')
    thumbnail: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    category: Mapped[Category] = relationship()
    brand: Mapped[Brand] = relationship()
    variants: Mapped[list['ProductVariant']] = relationship(cascade='all, delete-orphan')
    images: Mapped[list['ProductImage']] = relationship(cascade='all, delete-orphan')

class ProductImage(Base):
    __tablename__ = 'product_images'
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id', ondelete='CASCADE'), index=True)
    image_path: Mapped[str] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

class ProductVariant(Base):
    __tablename__ = 'product_variants'
    __table_args__ = (UniqueConstraint('product_id', 'size', 'color'), CheckConstraint('stock >= 0'))
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), index=True)
    size: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(50))
    stock: Mapped[int] = mapped_column(Integer, default=20)
    product: Mapped[Product] = relationship(back_populates='variants')

class Interaction(Base):
    __tablename__ = 'interactions'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), index=True)
    interaction_type: Mapped[str] = mapped_column(String(20))
    interaction_weight: Mapped[float] = mapped_column(Float)
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)

class Favorite(Base):
    __tablename__ = 'favorites'
    __table_args__ = (UniqueConstraint('user_id', 'product_id'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Cart(Base):
    __tablename__ = 'carts'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True)

class CartItem(Base):
    __tablename__ = 'cart_items'
    __table_args__ = (UniqueConstraint('cart_id', 'product_variant_id'), CheckConstraint('quantity > 0'))
    id: Mapped[int] = mapped_column(primary_key=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey('carts.id'), index=True)
    product_variant_id: Mapped[int] = mapped_column(ForeignKey('product_variants.id'))
    quantity: Mapped[int] = mapped_column(Integer)
    variant: Mapped[ProductVariant] = relationship()

class Order(Base):
    __tablename__ = 'orders'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    total_amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default='Đã xác nhận')
    full_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    items: Mapped[list['OrderItem']] = relationship(cascade='all, delete-orphan')

class OrderItem(Base):
    __tablename__ = 'order_items'
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id'), index=True)
    product_variant_id: Mapped[int] = mapped_column(ForeignKey('product_variants.id'))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[int] = mapped_column(Integer)
    variant: Mapped[ProductVariant] = relationship()

class Review(Base):
    __tablename__ = 'reviews'
    __table_args__ = (UniqueConstraint('user_id', 'product_id'), CheckConstraint('rating BETWEEN 1 AND 5'))
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    user: Mapped[User] = relationship()

class ProductEmbedding(Base):
    __tablename__ = 'product_embeddings'
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    embedding_path: Mapped[str] = mapped_column(Text)
    model_version: Mapped[str] = mapped_column(String(200))
    image_available: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class RecommendationLog(Base):
    __tablename__ = 'recommendation_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'))
    recommendation_method: Mapped[str] = mapped_column(String(30))
    score: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class ModelRun(Base):
    __tablename__ = 'model_runs'
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default='running')
    message: Mapped[str] = mapped_column(Text, default='Đang xử lý…')
    result: Mapped[str] = mapped_column(Text, default='{}')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class ModelEvaluation(Base):
    __tablename__ = 'model_evaluations'
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey('model_runs.id'))
    model_name: Mapped[str] = mapped_column(String(30))
    k: Mapped[int] = mapped_column(Integer)
    precision_at_k: Mapped[float] = mapped_column(Float)
    recall_at_k: Mapped[float] = mapped_column(Float)
    ndcg_at_k: Mapped[float] = mapped_column(Float)
    hit_rate_at_k: Mapped[float] = mapped_column(Float)
    coverage: Mapped[float] = mapped_column(Float)
    inference_time_ms: Mapped[float] = mapped_column(Float)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Setting(Base):
    __tablename__ = 'settings'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
