---
name: documentation
description: Tạo hoặc cập nhật tài liệu VELASTYLE (README.md, docs/architecture, docs/design, .claude/reference) cho khớp với code thực tế. Dùng khi thay đổi làm đổi hành vi, endpoint, schema, lệnh chạy hoặc khi người dùng yêu cầu viết/cập nhật tài liệu.
argument-hint: "[phạm vi: file docs hoặc thay đổi vừa làm]"
---

# Documentation

## Kích hoạt

Sau thay đổi kiến trúc/API/schema/lệnh; hoặc gọi `/documentation`.

## Tài liệu tham khảo

- `.claude/rules/documentation.md` (đặt file ở đâu, cấm gì)
- Tài liệu hiện có: `README.md`, `docs/architecture/overview.md`, `docs/design/ui-guidelines.md`, `.claude/reference/README.md`

## Các bước

1. Xác định thay đổi cần phản ánh (đọc `git diff` hoặc plan vừa hoàn thành).
2. Tìm mọi chỗ trong docs nhắc tới phần bị đổi (Grep tên endpoint, bảng, lệnh).
3. Cập nhật đúng file theo bảng vị trí trong rule; README viết tiếng Việt cho người dùng cuối/giảng viên.
4. Mọi khẳng định kỹ thuật phải đối chiếu được với code (`file:dòng`) hoặc output lệnh đã chạy. Số liệu kèm ngày.
5. Cập nhật index `.claude/reference/README.md` nếu thêm tài liệu mới.
6. Kiểm tra link tương đối trỏ tới file có thật.

## Công cụ

Read, Grep, Glob, Edit, Write (chỉ file tài liệu).

## Kết quả

Danh sách file docs đã sửa và tóm tắt thay đổi; nêu phần không thể xác minh.

## Kiểm tra kết quả

- Không có thông tin kỹ thuật bịa hoặc không có căn cứ.
- Không tạo file ghi chú ở gốc repo; không chép trùng nội dung giữa các file.
- Link nội bộ hợp lệ.
