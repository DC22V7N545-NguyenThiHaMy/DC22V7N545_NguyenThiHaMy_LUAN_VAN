# Kết quả kiểm tra VELASTYLE

Ngày kiểm tra: 22/10/2026 (Asia/Saigon).

## Bản nâng cấp giao diện và dữ liệu

### Hai khu vực thiết kế theo phong cách tạp chí

- Banner trang chủ: bố cục bìa tạp chí, ảnh postcard phụ, huy hiệu chữ vòng, ba bộ sưu tập với thumbnail; đồng bộ ảnh phụ/link khi đổi bộ sưu tập; có tạm dừng và hỗ trợ giảm chuyển động.
- Dành riêng cho bạn: bảng cảm hứng olive đậm, ba ảnh từ kết quả gợi ý thật, lời chào cá nhân, thẻ sở thích/ngân sách, ba cách gợi ý có mô tả, bộ lọc và phần giải thích cách tuyển chọn.
- `scripts/atelier_qa.py` đã qua kiểm tra 320, 390, 768, 1280, 1440 và 1920 px; không tràn ngang và không có JavaScript page error. Đã kiểm tra slider, pause, đồng bộ ảnh phụ, quiz, trạng thái khách/đăng nhập, thay phương pháp, lọc giới tính, popup giải thích và nút cuộn đến tuyển chọn.
- Ảnh mới: `atelier-home-desktop.png`, `atelier-foryou-desktop.png`, `atelier-home-390.png`, `atelier-foryou-390.png`; bản 1920 px có hậu tố `-1920.png`.

- `RUN_CLIP_TESTS=1 python -m pytest -q`: **23 passed**. Gồm kiểm tra mở rộng dữ liệu không lặp, bảo toàn tồn kho có sẵn, nhãn đánh giá mẫu, API phong cách/ưu đãi và cẩm nang.
- Catalog: **257 sản phẩm đang bán**, **22 thương hiệu**, **7 danh mục**. Bổ sung 240 ảnh khác nhau, 960×1280; xác minh source ID và SHA-256 riêng biệt.
- Có 52 tài khoản, hơn 6.100 tương tác, 274 đánh giá mẫu và 84 đơn hàng lịch sử mô phỏng. Các đơn từ luồng kiểm thử là bổ sung ngoài seed.
- CLIP thật: **257/257** sản phẩm có vector hợp lệ. CF đã xây lại; dashboard đánh giá mới chạy trên 51 người dùng, K=10, có nhãn dữ liệu mô phỏng.
- `scripts/upgrade_qa.py`: qua kiểm tra slider và tạm dừng, đổi tab không tải trang, quiz ba bước, chip bộ lọc, tìm kiếm có gợi ý, phóng to ảnh, modal kích thước, chọn số lượng, cẩm nang, ngăn kéo bộ lọc mobile, nút mua cố định và hỗ trợ giảm chuyển động. Không có JavaScript page error.
- `scripts/browser_qa.py`: luồng đăng nhập, xem nhanh, tìm kiếm, thêm giỏ và tìm bằng ảnh CLIP thật tiếp tục hoạt động.
- Ảnh mới có hậu tố `-v2.png`; ảnh đầu màn hình: `home-first-screen-v2.png`, `mobile-first-screen-v2.png`.
- `scripts/final_snapshots.py`: trang chủ, catalog, chi tiết và cẩm nang không tràn ngang ở 320, 768 và 1280 px; luồng UI còn được kiểm tra ở 390 và 1440 px. Dashboard và biểu đồ mới được chụp từ dữ liệu SQLite sau khi đánh giá.

## Bản đầu tiên

- Python 3.11, FastAPI + SQLite trên Windows; không Docker, không build Node.
- `RUN_CLIP_TESTS=1 python -m pytest -q`: **19 passed**, bao gồm encoder pretrained CLIP thật.
- `pip check`: không phát hiện dependency bị lỗi.
- Kiểm tra cú pháp JavaScript thành công.
- CLIP ViT-B/32: tạo thành công 17 bộ vector ảnh, văn bản và kết hợp, lưu NumPy.
- Chrome: trang chủ desktop 1440 px, mobile 390 px; không tràn ngang ở màn hình đã kiểm tra.
- Tìm từ khóa, xem nhanh, đăng nhập, chọn size, thêm giỏ, đặt hàng mô phỏng và lịch sử đơn hoạt động.
- Tìm bằng ảnh dùng CLIP thật, trả sản phẩm cùng điểm cosine.
- Quản trị: thêm thiết kế với ảnh upload thật, sửa và giữ metadata CLIP, ngừng bán.
- Xây lại CF và chạy đánh giá bằng tác vụ nền; biểu đồ lấy kết quả từ SQLite.
- Không có JavaScript page error trong hai lượt kiểm tra trình duyệt.

Ảnh chụp cùng thư mục. `browser_qa.py` và `admin_qa.py` là các script kiểm tra tùy chọn, cần Chrome và Playwright; không cần cho vận hành website.

Giới hạn: catalog mẫu hiện có 17 sản phẩm, chưa đạt mục tiêu 200–500; có pipeline CSV để mở rộng. Tài khoản/tương tác seed và đơn hàng là mô phỏng; chỉ số từ seed không đại diện kết quả trên khách hàng thật.
