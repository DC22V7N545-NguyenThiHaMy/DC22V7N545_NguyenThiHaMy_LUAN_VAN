---
name: change-review
description: Review thay đổi trong repo VELASTYLE (git diff hoặc file chỉ định) theo chuẩn dự án - lỗi logic, bảo mật (CSRF, phân quyền, upload, XSS qua esc), hiệu năng gợi ý, code trùng lặp, vi phạm kiến trúc và style. Dùng khi người dùng yêu cầu review, kiểm tra chất lượng, hoặc sau khi triển khai xong trước khi báo hoàn thành.
argument-hint: "[file/thư mục hoặc để trống = git diff]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*)
---

# Change Review

## Kích hoạt

Sau triển khai, hoặc gọi `/change-review [đường dẫn]`. Mặc định review `git diff` + file chưa track (`git status`).

## Tài liệu tham khảo

- `.claude/rules/*.md` (chuẩn để đối chiếu)
- Plan liên quan trong `.claude/plans/` (đối chiếu phạm vi)

## Checklist

**Đúng đắn**
- Xử lý None/rỗng (user chưa đăng nhập, chưa có embedding, sản phẩm `active=False`, hết hàng).
- Transaction: commit/rollback đúng chỗ; tồn kho cập nhật có điều kiện.
- Migration cho cột mới; tương thích DB cũ.

**Bảo mật** (`.claude/rules/security.md`)
- Endpoint mới có dependency phân quyền đúng; không nhận `user_id` từ client.
- Input qua Pydantic; upload qua `read_image`; đường dẫn file không do client quyết định.
- JS: mọi dữ liệu động qua `esc()` trước khi vào `innerHTML`.
- Không log/in secret; không làm yếu middleware CSRF.

**Hiệu năng**
- Không N+1 query trong vòng lặp lớn (vd `serialize_product(p, db)` cho cả catalog).
- Không chạy CLIP/encode trong request thường; không đọc lại toàn bộ `.npz` không cần thiết.

**Trùng lặp & kiến trúc**
- Grep logic tương tự đã có (`serialize_product`, `record`, `active_products`, `get_product`, `read_image`).
- Phân lớp đúng; không vòng import; không thêm dependency.

**Style & tài liệu**
- Giống code xung quanh; thông điệp tiếng Việt; không reformat code không liên quan.
- README/docs cập nhật nếu đổi hành vi.

## Kết quả

Danh sách phát hiện, sắp theo mức độ (Nghiêm trọng / Nên sửa / Gợi ý), mỗi mục có `file:dòng`, mô tả, kịch bản lỗi cụ thể và đề xuất sửa. Không có phát hiện → nói rõ đã kiểm tra những gì.

## Kiểm tra kết quả

- Mỗi phát hiện có bằng chứng trong code, không phải suy đoán chung chung.
- Review không tự sửa code; sửa chỉ khi người dùng yêu cầu.
