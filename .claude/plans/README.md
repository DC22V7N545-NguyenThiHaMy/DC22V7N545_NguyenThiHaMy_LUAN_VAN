# Plans

Kế hoạch triển khai trước khi code. Đây là **quy ước của dự án**; Claude Code không tự đọc thư mục này
(khác với plan mode built-in) — skill `feature-planning`/`feature-implementation` chủ động đọc/ghi.

## Khi nào cần plan

| Cần | Không cần |
| --- | --- |
| Feature mới nhiều file; đổi schema DB; đổi contract API; refactor lớn; đổi thuật toán gợi ý/đánh giá | Sửa lỗi nhỏ rõ nguyên nhân, đổi chữ, CSS cục bộ, thêm test |

## Quy ước

- Tên file: `YYYY-MM-DD-<slug>.md`, ví dụ `2026-10-25-wishlist-sharing.md`.
- Tạo từ [templates/feature-plan.md](templates/feature-plan.md).
- Frontmatter `status`:

| status | Ý nghĩa | Ai đổi |
| --- | --- | --- |
| `draft` | Đề xuất, **chưa phải quyết định** | AI tạo |
| `approved` | Người dùng đã đồng ý; được phép triển khai | Chỉ đổi sau khi người dùng xác nhận rõ ràng |
| `in-progress` | Đang triển khai | AI |
| `done` | Đã triển khai + test + docs | AI, kèm kết quả test |
| `rejected` / `superseded` | Không làm / bị thay bởi plan khác (ghi link) | Người dùng hoặc AI theo chỉ đạo |

- Quyết định đã chốt ghi ở mục "Decisions" trong plan, kèm ngày. AI phải tôn trọng mục này khi triển khai.
- Không xóa plan cũ; đổi status.

## Plans hiện có

_(Chưa có plan nào — 25/10/2026.)_
