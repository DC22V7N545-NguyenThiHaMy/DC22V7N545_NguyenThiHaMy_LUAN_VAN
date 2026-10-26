# Rule: Tài liệu

## Nơi đặt tài liệu

| Loại | Vị trí |
| --- | --- |
| Hướng dẫn chạy, tính năng, thuật toán (cho người dùng/giảng viên) | `README.md` (tiếng Việt) |
| Kiến trúc, module, API, schema | `docs/architecture/` |
| UI/UX, design tokens | `docs/design/` |
| Yêu cầu, user story đã chốt | `docs/requirements/` (tạo khi có nội dung thật) |
| Hướng dẫn quy trình (dev, AI) | `docs/guides/` |
| Kết quả kiểm tra, ảnh chụp | `artifacts/verification.md`, `artifacts/*.png` |
| Kế hoạch feature | `.claude/plans/` |
| Chỉ mục tra cứu cho AI | `.claude/reference/` |

Ngoại lệ được đặt ngoài `docs/`: `README.md`, `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `README.md` trong thư mục quy ước.

## Quy tắc

- Không tạo file ghi chú tạm ở gốc repo (`NOTES.md`, `TODO.md`, `summary.md`…). Ghi chú tạm để ngoài repo.
- Không chép lại nội dung giữa các file; link đến nguồn.
- Chỉ ghi điều đã xác minh từ code hoặc lệnh đã chạy. Số liệu (số sản phẩm, số test, chỉ số đánh giá) phải kèm ngày hoặc nguồn.
- Thay đổi kiến trúc, endpoint, schema, lệnh chạy → cập nhật `docs/architecture/overview.md` và README trong cùng thay đổi.
- Quy tắc dự án chỉ viết ở `AGENTS.md` + `.claude/rules/`; không tạo bộ quy tắc thứ hai.
