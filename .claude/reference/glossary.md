# Glossary — thuật ngữ & giá trị nghiệp vụ

Rút từ code ngày 25/10/2026. Khi code thay đổi, code là nguồn đúng; cập nhật file này.

## Thuật ngữ

| Thuật ngữ | Nghĩa trong dự án | Nơi trong code |
| --- | --- | --- |
| Thiết kế / sản phẩm | `Product`; một sản phẩm có nhiều `ProductVariant` (size × màu, có `stock`) | `app/models` |
| Đang bán | `Product.active = True`; “ngừng bán” = xóa mềm (`active=False`) | `active_products()`, `delete_product` |
| Tương tác | `Interaction` có trọng số: view=1, favorite=3, cart=4, purchase=5 | `services/interactions.py` `WEIGHTS` |
| Debounce | Cùng user/sản phẩm/loại trong 30 phút chỉ ghi một lần (trừ purchase) | `record()` |
| CF | Item-item collaborative filtering, cosine trên ma trận CSR user×item, cap 1 hành vi/ngày | `ai/collaborative_filtering.py` |
| CLIP / embedding | Vector 512 chiều; `combined = normalize(0.6·ảnh + 0.4·văn bản)`; lưu `.npz`, metadata ở `ProductEmbedding` | `ai/clip_encoder.py` |
| Fingerprint | Hash model + metadata + nội dung ảnh; khác → embedding bị bỏ qua | `fingerprint()` |
| Hybrid | `α·scale(CF) + (1−α)·scale(CLIP)`, α mặc định 0.5 (Setting `alpha`), α hiệu dụng giảm khi < 5 sản phẩm tương tác | `ai/hybrid_recommender.py` |
| Fallback | `status`: `personalized`, `popular_fallback`; similar: `clip`, `category_fallback` | `recommend()`, `similar()` |
| Cold-start | User chưa có lịch sử: cộng điểm theo sở thích (gender/style/color/budget) | `recommend()` |
| Mô phỏng | Dữ liệu seed/đơn hàng/đánh giá mẫu, cờ `simulated=True`; đơn không thu tiền | models, `services/demo_data.py` |
| ModelRun | Tác vụ AI nền: `generate-embeddings`, `rebuild-cf`, `evaluate`; status `running/completed/failed` | `routes/admin.py` |
| Đánh giá có kiểm soát | Temporal split, giữ tương tác cuối làm test, loại leakage; P@K, R@K, NDCG@K, Hit Rate, Coverage | `ai/evaluation.py` |

## Giá trị enum lưu bằng tiếng Việt (phải khớp chính xác)

| Trường | Giá trị |
| --- | --- |
| `Product.gender` | `Nữ`, `Nam`, `Unisex`, `Phụ kiện` |
| `Order.status` | `Đã xác nhận`, `Đang giao`, `Đã giao`, `Đã hủy` |
| `User.role` | `user`, `admin` |
| `Interaction.interaction_type` | `view`, `favorite`, `cart`, `purchase` (client chỉ được gửi `view`) |
| Phương pháp gợi ý | `hybrid`, `collaborative`, `clip` |

## Quy tắc nghiệp vụ

- Miễn phí vận chuyển từ 999.000₫, dưới mức đó phí 30.000₫ (`checkout`).
- Số lượng mỗi dòng giỏ 1–20; số điện thoại `^0\d{9,10}$`; địa chỉ 10–500 ký tự.
- Sản phẩm đã mua bị loại khỏi gợi ý; hết hàng cũng bị loại.
- Giá lưu số nguyên VND.

## Route giao diện (slug tiếng Việt)

`/` · `/san-pham` · `/san-pham/{id}` · `/danh-rieng-cho-ban` · `/yeu-thich` · `/gio-hang` · `/thanh-toan` · `/tai-khoan` · `/don-hang` · `/tim-bang-anh` · `/quan-tri[/{section}]` · `/thong-tin/{slug}` · `/cam-hung[/{slug}]`
