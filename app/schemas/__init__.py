import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

def clean_email(value):
    value = value.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
        raise ValueError('Email không hợp lệ')
    return value

class EmailIn(BaseModel):
    email: str = Field(max_length=200)

    @field_validator('email')
    @classmethod
    def email_valid(cls, value):
        return clean_email(value)

class NewPassword(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(max_length=128)

    @model_validator(mode='after')
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError('Mật khẩu nhập lại không khớp')
        return self

class Register(EmailIn, NewPassword):
    full_name: str = Field(min_length=2, max_length=100)
    username: str = Field(pattern=r'^[a-zA-Z0-9_.]{3,30}$')
    phone: str = Field(pattern=r'^0\d{9,10}$')

    @field_validator('username')
    @classmethod
    def username_lower(cls, value):
        return value.lower()

class Login(BaseModel):
    # `email` is kept so older clients keep working; either field may hold an email or a username.
    identifier: str = Field(default='', max_length=200)
    email: str = Field(default='', max_length=200)
    password: str = Field(max_length=128)

class VerifyEmail(EmailIn):
    code: str = Field(pattern=r'^\d{6}$')

class ResendCode(EmailIn):
    purpose: Literal['verify', 'reset'] = 'verify'

class ResetPassword(EmailIn, NewPassword):
    code: str = Field(pattern=r'^\d{6}$')

class Profile(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    gender: str = Field(default='', max_length=20)
    style: str = Field(default='', max_length=100)
    color: str = Field(default='', max_length=50)
    budget: int = Field(default=2000000, ge=0, le=100000000)

class CartAdd(BaseModel):
    variant_id: int
    quantity: int = Field(default=1, ge=1, le=20)

class Quantity(BaseModel):
    quantity: int = Field(ge=1, le=20)

class Checkout(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r'^0\d{9,10}$')
    address: str = Field(min_length=10, max_length=500)

class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)

class InteractionIn(BaseModel):
    product_id: int
    interaction_type: Literal['view'] = 'view'

class ProductIn(BaseModel):
    name: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=10, max_length=5000)
    clip_text: str = Field(default='', max_length=1000)
    price: int = Field(gt=0, le=100000000)
    original_price: int | None = Field(default=None, gt=0)
    category_id: int
    brand_id: int
    gender: Literal['Nữ', 'Nam', 'Unisex', 'Phụ kiện'] = 'Nữ'
    color: str = Field(default='Be', max_length=50)
    material: str = Field(default='Cotton', max_length=100)
    style: str = Field(default='Tối giản', max_length=100)
    thumbnail: str = Field(pattern=r'^/static/(images|uploads)/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$')
    stock: int = Field(default=20, ge=0, le=10000)
    sizes: list[str] = Field(default=['S', 'M', 'L'], min_length=1, max_length=10)

class TaxonomyIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default='', max_length=1000)

class AISettings(BaseModel):
    alpha: float = Field(ge=0, le=1)

class OrderStatus(BaseModel):
    status: Literal['Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy']
