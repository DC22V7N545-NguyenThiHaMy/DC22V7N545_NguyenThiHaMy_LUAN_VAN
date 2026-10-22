from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.database import get_db
from app.models import Product, Category, Brand, Review

router = APIRouter(prefix='/api')

@router.get('/storefront')
def storefront(db=Depends(get_db)):
    gender_counts = dict(db.execute(select(Product.gender, func.count()).where(Product.active.is_(True)).group_by(Product.gender)).all())
    category_rows = db.execute(select(Category.id, Category.name, func.count(Product.id)).join(Product, Product.category_id == Category.id).where(Product.active.is_(True)).group_by(Category.id)).all()
    styles = dict(db.execute(select(Product.style, func.count()).where(Product.active.is_(True)).group_by(Product.style)).all())
    return {'total': sum(gender_counts.values()), 'genders': gender_counts,
            'categories': [{'id': i, 'name': n, 'count': c} for i,n,c in category_rows],
            'styles': styles,
            'colors': [c for c in db.scalars(select(Product.color).where(Product.active.is_(True)).distinct())],
            'brands': db.scalar(select(func.count(Brand.id))),
            'price_range': {'min': db.scalar(select(func.min(Product.price)).where(Product.active.is_(True))) or 0,
                            'max': db.scalar(select(func.max(Product.price)).where(Product.active.is_(True))) or 0}}

ARTICLES = {
    'tu-do-toi-gian': {'title':'Tủ đồ ít hơn. Phong cách nhiều hơn.', 'category':'CẨM NANG PHONG CÁCH', 'image':'wardrobe.jpg', 'minutes':5,
        'intro':'Một tủ đồ có chủ đích bắt đầu từ những món bạn muốn mặc lại. Không cần chạy theo một con số lý tưởng: hãy bắt đầu từ nhịp sống của chính bạn.',
        'sections':[
            ('Nhìn lại một tuần của bạn','Bạn dành nhiều thời gian ở văn phòng, trên giảng đường hay ở ngoài trời? Chia tủ đồ theo những hoàn cảnh thực sự xuất hiện trong lịch của bạn, rồi ưu tiên nhóm được mặc thường xuyên nhất.'),
            ('Chọn một bảng màu dễ kết nối','Trắng, kem, xanh navy hoặc nâu là những điểm bắt đầu linh hoạt. Chọn hai màu nền mà bạn thích, sau đó thêm một màu nhấn. Mỗi món mới nên phối được với ít nhất hai món bạn đang có.'),
            ('Để phom dáng làm phần việc của mình','Một chiếc áo vừa vai, chiếc quần có độ dài phù hợp và lớp khoác đủ thoải mái thường có ích hơn nhiều món chỉ hợp trong một bức ảnh. Thử ngồi, bước đi và giơ tay khi thử đồ.'),
            ('Mua chậm hơn một chút','Lưu thiết kế vào danh sách yêu thích và quay lại sau một ngày. Nếu vẫn tưởng tượng được mình mặc nó trong nhiều dịp, đó thường là một lựa chọn đáng cân nhắc.')],
        'cta':'Khám phá phong cách tối giản', 'href':'/san-pham?style=Tối giản'},
    'phoi-mau-thanh-lich': {'title':'Nghệ thuật phối màu, từ những điều giản đơn.', 'category':'CẢM HỨNG MỖI NGÀY', 'image':'hero-editorial.jpg', 'minutes':4,
        'intro':'Một bộ đồ hài hòa không nhất thiết phải cùng một màu. Đôi khi, chỉ cần những sắc độ biết nhường chỗ cho nhau.',
        'sections':[
            ('Một màu, nhiều sắc độ','Phối kem cùng be và nâu nhạt tạo chiều sâu mà vẫn dịu mắt. Thay đổi bề mặt chất liệu để các lớp trang phục không bị hòa lẫn: cotton phẳng, len có gân và denim là những ví dụ dễ bắt đầu.'),
            ('Để một điểm nhấn được tỏa sáng','Khi chọn một chiếc váy đỏ hoặc áo khoác xanh nổi bật, hãy để giày và túi đơn giản hơn. Không cần mọi chi tiết cùng lên tiếng trong một bộ trang phục.'),
            ('Lặp lại màu sắc một cách có chủ đích','Một chi tiết nhỏ trên túi hoặc giày có thể nhắc lại màu áo. Sự lặp lại nhẹ nhàng giúp tổng thể có cảm giác được kết nối.'),
            ('Ánh sáng cũng là một phần của bảng màu','Xem trang phục dưới ánh sáng tự nhiên khi có thể. Màn hình có thể hiển thị sắc độ khác nhau, vì vậy đừng coi ảnh sản phẩm là mẫu màu tuyệt đối.')],
        'cta':'Tìm một điểm nhấn mới', 'href':'/san-pham?style=Thanh lịch'},
    'cham-soc-trang-phuc': {'title':'Giữ những món đồ bạn yêu ở lại lâu hơn.', 'category':'CHĂM SÓC TỦ ĐỒ', 'image':'store.jpg', 'minutes':6,
        'intro':'Chăm sóc tốt giúp món đồ giữ phom và màu sắc ổn định hơn. Hướng dẫn trên nhãn của từng sản phẩm luôn là thông tin cần ưu tiên.',
        'sections':[
            ('Đọc nhãn trước khi giặt','Phân loại theo màu, chất liệu và ký hiệu giặt. Một hướng dẫn chung không thể thay thế nhãn chăm sóc cụ thể, nhất là với len, lụa, da và sản phẩm có cấu trúc.'),
            ('Nhẹ nhàng với những chất liệu mềm','Đồ mỏng nên được cho vào túi giặt nếu nhãn cho phép giặt máy. Tránh vắt quá mạnh và không treo đồ len ướt lên móc vì trọng lượng nước có thể kéo giãn phom.'),
            ('Cho món đồ một nơi phù hợp','Áo khoác cần móc có bề ngang vừa vai; đồ dệt kim thường phù hợp để gấp. Cất đồ khi đã khô hoàn toàn, ở nơi thoáng và tránh nắng trực tiếp.'),
            ('Kiểm tra trước khi cất','Một chiếc cúc lỏng hoặc đường chỉ nhỏ được sửa sớm có thể giúp món đồ tiếp tục được sử dụng. Sắp xếp để bạn nhìn thấy những món mình có, thay vì quên chúng ở cuối tủ.')],
        'cta':'Tìm thiết kế đồng hành mỗi ngày', 'href':'/san-pham'}
}

@router.get('/journal')
def journal():
    return [{'slug':slug, **{k:v for k,v in item.items() if k not in ['sections','cta','href']}} for slug,item in ARTICLES.items()]

@router.get('/journal/{slug}')
def article(slug: str):
    from fastapi import HTTPException
    if slug not in ARTICLES: raise HTTPException(404,'Bài viết không tồn tại.')
    return {'slug':slug, **ARTICLES[slug]}
