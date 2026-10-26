# Kết quả kiểm tra VELASTYLE

Ngày kiểm tra: 22/10/2026 (Asia/Saigon).

## Đánh giá trên dữ liệu tương tác thực — 26/10/2026

Nguồn: Amazon Reviews 2023, mục Amazon_Fashion (Hou và cộng sự, arXiv:2403.03952); quy trình và giới hạn: `docs/guides/real-data-experiment.md`. Chạy bằng `scripts/real_data_experiment.py`; kết quả đầy đủ: `artifacts/real-data-eval-amazon-fashion.json`. Không ghi vào `velastyle.db`.

- Lọc 5-core còn 0 bản ghi, 4-core còn 513 người dùng; dùng **3-core: 2.223 người dùng, 2.245 sản phẩm, 12.490 tương tác** (mật độ 0,25%, 15/07/2012–30/04/2023). Ảnh 2.244/2.245. Giao thức leave-last-item-out theo thời gian; 10.267 tương tác train.

| K = 10 | Precision | Hit Rate | NDCG (KTC 95%) | Coverage |
| --- | --- | --- | --- | --- |
| Popularity | 0,0062 | 0,062 | 0,031 [0,026; 0,037] | 0,008 |
| Random | 0,0002 | 0,002 | 0,001 [0,000; 0,002] | 1,000 |
| CF | 0,0095 | 0,095 | 0,054 [0,046; 0,062] | 0,935 |
| CLIP | 0,0076 | 0,076 | 0,042 [0,036; 0,048] | 0,742 |
| Hybrid α = 0,5 | 0,0115 | 0,115 | 0,067 [0,058; 0,075] | 0,909 |

Hybrid − CF, NDCG@10: +0,013, KTC 95% [+0,008; +0,018] (bootstrap 2.000 lần theo người dùng). α tốt nhất theo NDCG@10 là 0,4 (chọn trên tập kiểm tra, chỉ mang tính khảo sát). Trái với dữ liệu mô phỏng bên dưới, nơi CF > Hybrid và CLIP < Random.

## Chạy lại pipeline AI — 25/10/2026

DB trước đó không còn metadata embedding/kết quả đánh giá (`product_embeddings`, `model_runs`, `model_evaluations` rỗng) dù tệp `.npz` vẫn còn. Đã sao lưu DB vào `data/velastyle-backup-20261025.db` trước khi chạy.

- `scripts/generate_embeddings.py`: 257/257 sản phẩm, tất cả có ảnh, `openai/clip-vit-base-patch32`, CPU (~3 phút, gồm tải model lần đầu).
- `scripts/train_cf.py`: 51 người dùng, 257 sản phẩm.
- Đánh giá qua `run_task` của trang quản trị, K = 5/10/20; kết quả đầy đủ: `artifacts/evaluation-2026-10-25.json`. Dữ liệu 100% mô phỏng, 51 người dùng, 6.040 tương tác train, α = 0,5.

| K = 10 | Precision | Recall = Hit Rate | NDCG | Coverage | ms |
| --- | --- | --- | --- | --- | --- |
| Collaborative | 0,031 | 0,314 | 0,207 | 0,564 | 0,21 |
| Hybrid | 0,027 | 0,275 | 0,168 | 0,529 | 2,79 |
| CLIP | 0,004 | 0,039 | 0,014 | 0,198 | 2,71 |
| Ngẫu nhiên (kỳ vọng giải tích, không phải mô hình) | 0,005 | 0,055 | 0,025 | — | — |

CF > Hybrid > ngẫu nhiên > CLIP trên dữ liệu mô phỏng: tương tác seed được sinh theo nhãn `style` minh họa, không liên quan đến nội dung ảnh.

- `RUN_CLIP_TESTS=1 python -m pytest -q`: **23 passed**.

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
