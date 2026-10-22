"""Additive, repeatable demo expansion; never resets user records or stock."""
import json
import random
from datetime import timedelta
from sqlalchemy import select, func
from app.config import ROOT
from app.models import (Product, ProductVariant, ProductImage, User, Category, Brand, Interaction,
                        Review, Order, OrderItem, Setting, now)

def expand_demo(db):
    manifest_path = ROOT / 'app/static/images/catalog-manifest.json'
    if not manifest_path.exists():
        return {'status':'manifest_unavailable'}
    catalog = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    rng = random.Random(9032026)
    rng.shuffle(catalog)
    categories = {c.name:c.id for c in db.scalars(select(Category))}
    brands = {b.name:b.id for b in db.scalars(select(Brand))}
    known_brands = ['United Colors of Benetton','American Tourister','Flying Machine','French Connection',
                    'Roadster','Puma','Nike','Adidas','Reebok','Levis','Lee','Wrangler','Fastrack','Titan',
                    'Baggit','Wildcraft','Fossil','Allen Solly','Van Heusen','Arrow','Wills Lifestyle','Esprit',
                    'Mango','ONLY','Vero Moda','U.S. Polo Assn.']
    added = 0
    existing = set(db.scalars(select(Product.thumbnail)))
    for i, entry in enumerate(catalog):
        thumbnail = '/static/images/' + entry['thumbnail']
        if thumbnail in existing:
            continue
        if not (ROOT / 'app/static/images' / entry['thumbnail']).is_file():
            continue
        category = entry['category']
        if category not in categories:
            item = Category(name=category,description=f'Tuyển chọn {category.lower()} từ catalog mở rộng.')
            db.add(item);db.flush();categories[category]=item.id
        source_name = entry['source_name']
        brand = next((b for b in known_brands if source_name.casefold().startswith(b.casefold())), 'Archive Sélection')
        if brand not in brands:
            item = Brand(name=brand,description='Tên nhãn hàng từ metadata Fashion Product Images; sản phẩm dùng cho đồ án, không phải gian hàng chính thức.')
            db.add(item);db.flush();brands[brand]=item.id
        is_accessory = category in ['Túi & phụ kiện','Giày']
        gender = 'Phụ kiện' if is_accessory else entry['gender']
        article = entry['source_metadata']['articleType']
        if category == 'Giày':
            sizes = ['36','37','38','39'] if entry['gender']=='Nữ' else ['39','40','41','42','43']
        elif category == 'Túi & phụ kiện':
            sizes = ['Freesize']
        else:
            sizes = ['S','M','L','XL']
        price = int(entry['price'])
        product = Product(name=entry['name'],description=entry['description'] + f"\nMẫu nguồn: {source_name}. Mã dữ liệu: FPI-{entry['source_id']}. Phân loại gốc: {article}. Ảnh minh họa từ catalog nguồn; VELASTYLE không liên kết với nhãn hàng.",
                          clip_text=entry['clip_text'],price=price,original_price=price+150000 if i%5==0 else None,
                          gender=gender,category_id=categories[category],brand_id=brands[brand],
                          color=entry['color'],material=entry['material'],style=entry['style'],thumbnail=thumbnail,
                          created_at=now()-timedelta(days=(i%42),minutes=i*11))
        product.variants = [ProductVariant(size=size,color=product.color,stock=10+(i+j)%25) for j,size in enumerate(sizes)]
        product.images = [ProductImage(image_path=thumbnail,is_primary=True)]
        db.add(product);added+=1
    db.commit()
    if db.get(Setting,'expanded_demo_v2'):
        return {'added':added,'status':'already_expanded'}
    users = list(db.scalars(select(User).where(User.simulated.is_(True),User.role=='user').order_by(User.id)))
    products = list(db.scalars(select(Product).where(Product.active.is_(True)).order_by(Product.id)))
    weights = {'view':1,'favorite':3,'cart':4,'purchase':5}
    for user in users:
        preference = json.loads(user.preferences)
        choices = [6 if p.style==preference.get('style') else 1 for p in products]
        for i in range(96):
            product = rng.choices(products,weights=choices,k=1)[0]
            action = rng.choices(list(weights),weights=[12,5,3,1],k=1)[0]
            db.add(Interaction(user_id=user.id,product_id=product.id,interaction_type=action,interaction_weight=weights[action],simulated=True,
                               created_at=now()-timedelta(days=60-i*.58,minutes=user.id*3+i)))
    # Explicitly labelled example reviews. They are never presented as real testimonials.
    comments = [
        'Đánh giá minh họa: thiết kế phù hợp với phong cách mình lựa chọn trong bài thử nghiệm.',
        'Đánh giá minh họa: gam màu dễ kết hợp với những món đồ cơ bản trong tủ.',
        'Đánh giá minh họa: mình thích phom dáng và muốn xem thêm các thiết kế cùng cảm hứng.',
        'Đánh giá minh họa: bảng kích thước giúp mình tham khảo trước khi lựa chọn.',
        'Đánh giá minh họa: sản phẩm này phù hợp với bộ trang phục hàng ngày mình đang tìm.',
        'Đánh giá minh họa: mình sẽ so sánh thêm với các lựa chọn khác trong bộ sưu tập.'
    ]
    review_count=0
    for product in products:
        for j,user in enumerate(rng.sample(users,k=2 if product.id<=17 else 1)):
            if db.scalar(select(Review.id).where(Review.user_id==user.id,Review.product_id==product.id)):
                continue
            db.add(Review(user_id=user.id,product_id=product.id,rating=[4,5,4,3,5][(product.id+j)%5],comment=comments[(product.id+j)%len(comments)],simulated=True,
                          created_at=now()-timedelta(days=product.id%25+1,hours=j)))
            review_count+=1
    for i in range(84):
        user=users[i%len(users)]
        selected=rng.sample(products,k=1+i%3)
        subtotal=sum(p.price for p in selected)
        order=Order(user_id=user.id,total_amount=subtotal+(30000 if subtotal<999000 else 0),status=['Đã giao','Đã giao','Đang giao','Đã xác nhận','Đã hủy'][i%5],
                    full_name=user.full_name,phone='0900000000',address='Địa chỉ dữ liệu mô phỏng — không giao hàng thực tế.',
                    created_at=now()-timedelta(days=i%30,hours=i%16,minutes=i))
        db.add(order);db.flush()
        for product in selected:
            db.add(OrderItem(order_id=order.id,product_variant_id=product.variants[0].id,quantity=1,unit_price=product.price))
    db.add(Setting(key='expanded_demo_v2',value=json.dumps({'products_added':added,'reviews':review_count,'orders':84,'interactions':len(users)*96})))
    db.commit()
    return {'added':added,'reviews':review_count,'orders':84,'interactions':len(users)*96,'simulated':True}
