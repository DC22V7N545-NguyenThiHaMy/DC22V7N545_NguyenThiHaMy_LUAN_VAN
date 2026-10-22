import json
import random
from datetime import timedelta
from sqlalchemy import select
from app.models import User, Category, Brand, Product, ProductVariant, ProductImage, Interaction, Favorite, now
from app.services.auth import hasher

# Small curated catalog: do not fabricate hundreds of different products from the same photo.
CATALOG = [
    ('Đầm midi sơ mi Élise', 'dress-linen.jpg', 890000, 'Đầm & váy', 'Nữ', 'Đỏ rượu', 'Cotton', 'Thanh lịch', 'A woman wearing a burgundy button front midi shirt dress with sleeves and a flared skirt'),
    ('Đầm trễ vai Belle', 'dress-floral.jpg', 790000, 'Đầm & váy', 'Nữ', 'Trắng', 'Cotton', 'Nữ tính', 'A woman wearing a short white off shoulder summer dress on stairs'),
    ('Đầm maxi Azure', 'dress-satin.jpg', 1290000, 'Đầm & váy', 'Nữ', 'Xanh', 'Chiffon', 'Nữ tính', 'A woman in a flowing light blue maxi dress with a slit on the beach'),
    ('Đầm hoa Rosalie', 'dress-rose.jpg', 950000, 'Đầm & váy', 'Nữ', 'Đỏ', 'Viscose', 'Nữ tính', 'A woman in a red floral print short dress with a belt against a yellow backdrop'),
    ('Đầm hoa Garden Muse', 'dress-garden.jpg', 1090000, 'Đầm & váy', 'Nữ', 'Kem', 'Viscose', 'Nữ tính', 'A cream floral print wrap dress with a slit in sunlight'),
    ('Đầm dạ hội Ruby', 'dress-midi.jpg', 1590000, 'Đầm & váy', 'Nữ', 'Đỏ', 'Satin', 'Thanh lịch', 'A woman wearing a long flowing red evening gown in a garden'),
    ('Áo trench xanh Ciel', 'hero-editorial.jpg', 1890000, 'Áo khoác', 'Nữ', 'Xanh', 'Cotton', 'Thanh lịch', 'A woman wearing a pale blue belted trench coat and a pink bag'),
    ('Bộ thể thao Soleil', 'dress-sunshine.jpg', 1150000, 'Bộ trang phục', 'Nữ', 'Vàng', 'Cotton', 'Năng động', 'A woman wearing yellow sportswear, a cropped hoodie and yellow pants'),
    ('Quần jogger Essential', 'trousers.jpg', 590000, 'Quần', 'Nữ', 'Be', 'Cotton', 'Tối giản', 'Beige jogger trousers on a woman with ankle boots'),
    ('Áo blazer kẻ Atelier', 'blouse-cotton.jpg', 1490000, 'Áo khoác', 'Nữ', 'Xanh', 'Wool blend', 'Thanh lịch', 'A woman in a dark navy plaid blazer on a city street'),
    ('Áo khoác Bordeaux', 'fashion-city.jpg', 1690000, 'Áo khoác', 'Nữ', 'Đỏ rượu', 'Wool blend', 'Thanh lịch', 'A woman in a burgundy wool coat and turtleneck with sunglasses'),
    ('Túi chần Classic Noir', 'bag-leather.jpg', 1390000, 'Túi & phụ kiện', 'Phụ kiện', 'Đen', 'Da', 'Thanh lịch', 'A black quilted leather handbag with a gold metal clasp'),
    ('Giày cao gót Fleur', 'heels.jpg', 890000, 'Giày', 'Phụ kiện', 'Xanh', 'Vải dệt', 'Nữ tính', 'Blue floral print high heel pointed shoes on a blue background'),
    ('Bộ suit Gentleman', 'mens-suit.jpg', 2490000, 'Bộ trang phục', 'Nam', 'Xanh', 'Wool blend', 'Thanh lịch', 'A man wearing a navy blue suit and white shirt'),
    ('Áo denim Daily', 'shirt-white.jpg', 890000, 'Áo khoác', 'Nam', 'Xanh', 'Denim', 'Năng động', 'A man wearing a light blue denim jacket over a white button down shirt'),
    ('Quần jeans Urban', 'denim.jpg', 750000, 'Quần', 'Unisex', 'Xanh', 'Denim', 'Năng động', 'Distressed dark blue jeans with white sneakers in an urban setting'),
    ('Áo bomber Terra', 'jacket-casual.jpg', 1090000, 'Áo khoác', 'Unisex', 'Nâu', 'Cotton', 'Tối giản', 'A terracotta brown bomber jacket on a wooden hanger'),
]

def seed(db):
    if db.scalar(select(User.id).limit(1)):
        return {'status': 'already_seeded'}
    categories = {}
    for name in dict.fromkeys(row[3] for row in CATALOG):
        item = Category(name=name, description=f'Tuyển chọn {name.lower()} cho phong cách của bạn.')
        db.add(item); db.flush(); categories[name] = item.id
    brands = []
    for name in ['VELA Studio', 'Maison Vela', 'Everyday Stories']:
        brand = Brand(name=name, description='Nhãn hàng mô phỏng phục vụ đồ án VELASTYLE.')
        db.add(brand); db.flush(); brands.append(brand.id)
    products = []
    for i, (name, image, price, category, gender, color, material, style, english) in enumerate(CATALOG):
        product = Product(name=name, description=f'{name} với phom dáng chỉn chu, chất liệu {material.lower()} mềm mại và gam màu {color.lower()} dễ kết hợp. Thiết kế dành cho những khoảnh khắc thường ngày trở nên đặc biệt. Giặt nhẹ ở nhiệt độ thấp, phơi trong bóng râm. Sản phẩm và giá là dữ liệu minh họa của dự án.',
                          price=price, original_price=price + 200000 if i in [1, 3, 8, 15] else None,
                          category_id=categories[category], brand_id=brands[i % 3], gender=gender, color=color, material=material, style=style,
                          thumbnail=f'/static/images/{image}', clip_text=english + f'. {material}. {style}.', created_at=now() - timedelta(days=len(CATALOG) - i))
        sizes = ['35', '36', '37', '38', '39'] if category == 'Giày' else ['Freesize'] if category == 'Túi & phụ kiện' else ['S', 'M', 'L', 'XL']
        product.variants = [ProductVariant(size=size, color=color, stock=15 + i % 10) for size in sizes]
        product.images = [ProductImage(image_path=product.thumbnail, is_primary=True)]
        db.add(product); db.flush(); products.append(product)
    # These public passwords are exclusively local sample accounts, never runtime secrets.
    password = hasher.hash('Vela@12345')
    admin = User(full_name='Quản trị VELASTYLE', email='admin@velastyle.vn', password_hash=password, role='admin', simulated=True)
    demo = User(full_name='Linh Nguyễn', email='linh@velastyle.vn', password_hash=password, preferences=json.dumps({'gender': 'Nữ', 'style': 'Nữ tính', 'budget': 2000000}), simulated=True)
    db.add_all([admin, demo]); db.flush()
    users = [demo]
    for i in range(50):
        style = ['Nữ tính', 'Thanh lịch', 'Năng động', 'Tối giản'][i % 4]
        user = User(full_name=f'Khách mô phỏng {i+1:02}', email=f'demo{i+1:02}@velastyle.vn', password_hash=password, simulated=True,
                    preferences=json.dumps({'style': style, 'gender': 'Nam' if i % 5 == 0 else 'Nữ'}))
        db.add(user); db.flush(); users.append(user)
    rng = random.Random(2026)
    for index, user in enumerate(users):
        preference = json.loads(user.preferences)
        weights = [5 if p.style == preference.get('style') else 1 for p in products]
        for j in range(24):
            p = rng.choices(products, weights=weights, k=1)[0]
            kind = rng.choices(['view', 'favorite', 'cart', 'purchase'], weights=[6, 3, 2, 1], k=1)[0]
            db.add(Interaction(user_id=user.id, product_id=p.id, interaction_type=kind, interaction_weight={'view': 1, 'favorite': 3, 'cart': 4, 'purchase': 5}[kind],
                               simulated=True, created_at=now() - timedelta(days=30 - j, minutes=index * 3 + j)))
    for p in [products[1], products[2]]:
        db.add(Favorite(user_id=demo.id, product_id=p.id))
    db.commit()
    return {'products': len(products), 'users': 52, 'interactions': 51 * 24, 'simulated': True}
