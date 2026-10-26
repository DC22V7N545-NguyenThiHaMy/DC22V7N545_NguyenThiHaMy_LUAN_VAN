# Rule: Bảo mật

## Cơ chế hiện có — không được làm yếu đi

| Cơ chế | Vị trí |
| --- | --- |
| CSRF: chặn request ghi khác origin / `sec-fetch-site: cross-site` | middleware `security_headers` trong `app/main.py` |
| Security headers (`nosniff`, `SAMEORIGIN`, `no-store` cho `/api/`) | cùng middleware |
| Argon2, so sánh hash giả khi user không tồn tại (chống dò email) | `app/services/auth.py` |
| Throttle 20 lần/phút/IP cho đăng ký/đăng nhập | `throttle()` |
| Phân quyền server-side | `current_user`, `admin_user`; router admin có `dependencies=[Depends(admin_user)]` |
| Validate upload: MIME, ≤ 5 MB, ≤ 25 MP, decode + re-encode JPEG, tên ngẫu nhiên | `read_image`, `upload_image` trong `api.py` |
| Thumbnail chỉ trong `/static/images|uploads` | regex `ProductIn.thumbnail` |
| Client không được tự ghi `purchase/cart/favorite` | `InteractionIn` chỉ cho `'view'` |
| Escape LIKE wildcard trong tìm kiếm | `products()` |

Thêm endpoint mới phải: chọn đúng dependency phân quyền, validate input bằng Pydantic, không nhận `user_id` từ client.

## Bí mật & môi trường

- `.env` bị deny trong `.claude/settings.json`. Cấu hình mới → thêm vào `Settings` (`app/config.py`) và `.env.example` với giá trị an toàn.
- Tài khoản mẫu `Vela@12345` chỉ dùng local; không thêm credential thật vào code, test, docs.
- Không commit `.env`, `data/*.db*`, `data/embeddings/*`, `app/static/uploads/*` (đã có trong `.gitignore`).

## Thao tác nguy hiểm

- Không chạy lệnh xóa dữ liệu, ghi DB thật, git force/reset khi chưa được phép (hook `guard_commands.py` chặn phần lớn, nhưng rule này áp dụng cả khi hook tắt).
- Không bỏ qua kiểm tra bảo mật hay test để cho qua.
- Không thêm tải file/URL tùy ý từ Internet vào luồng request (importer cố ý không tải ảnh từ URL).
