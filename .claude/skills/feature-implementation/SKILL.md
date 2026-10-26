---
name: feature-implementation
description: Triển khai code VELASTYLE (FastAPI/SQLAlchemy/JS thuần) đúng kiến trúc và rules, bám theo plan đã duyệt trong .claude/plans/ nếu có. Dùng khi người dùng yêu cầu "làm", "triển khai", "sửa", "thêm" một thay đổi code cụ thể hoặc thực hiện plan đã approved.
argument-hint: "<đường dẫn plan hoặc mô tả thay đổi nhỏ>"
---

# Feature Implementation

## Kích hoạt

Có plan `approved`, hoặc thay đổi nhỏ đã rõ phạm vi. Nếu là feature/refactor lớn mà **chưa có plan duyệt** → dừng, đề xuất `/feature-planning`.

## Tài liệu tham khảo

- Plan liên quan trong `.claude/plans/` (đọc trước tiên; tôn trọng mục "Quyết định đã chốt")
- `.claude/rules/architecture.md`, `code-style.md`, `security.md`
- Code xung quanh nơi sẽ sửa — viết giống style hiện có

## Các bước

1. Đọc plan và đặt `status: in-progress` (nếu có plan).
2. Ghi nhận baseline: `.\.venv\Scripts\python.exe -m pytest -q` nếu chưa chạy trong phiên.
3. Tìm hàm/endpoint có sẵn để tái sử dụng trước khi viết mới.
4. Triển khai từng bước của plan; sau mỗi bước, kiểm chứng nhỏ (hook tự kiểm tra cú pháp file vừa sửa).
   - Đổi model → thêm revision Alembic idempotent trong `db_migrations/versions/`.
   - Thêm trang → thêm route ở `app/main.py` và trong `render()` của `app.js`.
   - Dữ liệu động trong HTML → `esc()`; thông báo người dùng → tiếng Việt.
5. Không mở rộng phạm vi. Phát hiện vấn đề ngoài phạm vi → ghi vào báo cáo, không tự sửa.
6. Viết/cập nhật test theo skill `testing`, chạy pytest.
7. Cập nhật plan: đánh dấu bước xong, ghi lệch so với plan (nếu có).

## Công cụ

Read, Grep, Glob, Edit, Write, Bash/PowerShell (`.venv\Scripts\python.exe`, `node --check`). Không chạy script ghi dữ liệu (AGENTS.md §5) khi chưa hỏi.

## Kết quả

Code đã sửa + test + báo cáo: file đã đổi, lệnh đã chạy và kết quả, phần chưa kiểm chứng, đề xuất bước tiếp (`/change-review`, `/documentation`).

## Kiểm tra kết quả

- Mọi acceptance criterion của plan được đáp ứng hoặc ghi rõ lý do chưa.
- pytest không có lỗi mới so với baseline.
- Không đụng file ngoài danh sách "Affected files" mà không giải thích.
