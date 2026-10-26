---
name: feature-planning
description: Lập kế hoạch triển khai VELASTYLE vào .claude/plans/ theo template 14 mục (luồng dữ liệu, thay đổi API/DB, file ảnh hưởng, rủi ro, test). Dùng khi cần plan trước khi code một feature, refactor lớn, đổi schema DB hoặc contract API, hoặc khi người dùng nói "lập kế hoạch", "plan". Không sửa code ứng dụng.
argument-hint: "<tên feature hoặc đường dẫn bản phân tích>"
allowed-tools: Read, Grep, Glob
---

# Feature Planning

## Kích hoạt

Feature mới, refactor lớn, đổi schema/API, hoặc gọi `/feature-planning`. Sửa nhỏ không cần plan.

## Tài liệu tham khảo

- `.claude/plans/README.md` (quy ước, trạng thái) và `.claude/plans/templates/feature-plan.md`
- `.claude/rules/architecture.md`, `security.md`, `testing.md`
- `docs/architecture/overview.md`
- Kết quả `requirements-analysis` nếu có

## Các bước

1. Kiểm tra `.claude/plans/` có plan cùng chủ đề chưa → cập nhật thay vì tạo mới.
2. Nếu chưa có user stories/acceptance criteria → làm theo skill `requirements-analysis` trước.
3. Đọc code của mọi module liên quan (không đoán chữ ký hàm). Ghi `file:dòng`.
4. Thiết kế luồng xử lý theo phân lớp routes → services/repositories/ai → models. Nêu rõ endpoint mới/đổi, field JSON, status code, bảng/cột và revision Alembic trong `db_migrations/versions/`.
5. Liệt kê file sẽ tạo/sửa, các bước triển khai nhỏ, mỗi bước có cách kiểm chứng.
6. Chiến lược test: test pytest nào thêm/sửa, kiểm tra UI nào (desktop + ~390 px).
7. Rủi ro: tương thích DB local cũ, contract `app.js`, hiệu năng (CF xây mỗi request), dữ liệu mô phỏng, bảo mật.
8. Lưu file `.claude/plans/YYYY-MM-DD-<slug>.md` với `status: draft`. Chỉ ghi file trong `.claude/plans/`.
9. Trình bày tóm tắt và **xin duyệt**. Không tự đổi sang `approved`.

## Công cụ

Read/Grep/Glob để khảo sát; Write chỉ cho file plan (sẽ được hỏi quyền).

## Kết quả

File plan đủ 14 mục của template, `status: draft`, kèm danh sách quyết định cần người dùng chốt.

## Kiểm tra kết quả

- Mọi file trong "Affected files" tồn tại (hoặc ghi rõ là file mới).
- Không có thay đổi contract/schema nào bị ẩn khỏi mục 9.
- Definition of Done khớp AGENTS.md §8.
