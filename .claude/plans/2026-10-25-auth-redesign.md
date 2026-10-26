---
title: Thiết kế lại đăng ký/đăng nhập (SĐT, tên đăng nhập, xác nhận email, quên mật khẩu, Google)
status: done
created: 2026-10-25
owner: người dùng (yêu cầu trực tiếp trong phiên 25/10/2026)
related: []
---

# Thiết kế lại đăng ký/đăng nhập

## 1. Business objective
Tài khoản đáng tin cậy hơn: email được xác nhận, khôi phục được mật khẩu, đăng nhập nhanh bằng Google.

## 2. Problem statement
Đăng ký hiện chỉ có tên/email/mật khẩu (`Register` trong `app/schemas`), đăng nhập ngay không xác nhận email, không có quên mật khẩu, không có OAuth.

## 3. User stories
- Là khách, tôi muốn đăng ký với tên, tên đăng nhập, email, SĐT, mật khẩu + nhập lại để tạo tài khoản.
- Là khách, tôi muốn nhận mã qua email để xác nhận tài khoản; được gửi lại mã sau 2 phút.
- Là người dùng, tôi muốn đăng nhập bằng email hoặc tên đăng nhập.
- Là người dùng quên mật khẩu, tôi muốn nhận mã qua email để đặt mật khẩu mới.
- Là khách, tôi muốn đăng nhập/đăng ký bằng Google.

## 4. Acceptance criteria
- [ ] Đăng ký sai định dạng / mật khẩu nhập lại không khớp → 422; trùng email hoặc tên đăng nhập đã xác nhận → 409.
- [ ] Đăng ký hợp lệ → 202, gửi mã 6 số, **chưa** đăng nhập.
- [ ] Đăng nhập khi chưa xác nhận → 403 `email_unverified`.
- [ ] Gửi lại mã trong vòng 120 s kể từ lần gửi trước (cùng email + mục đích) → 429 kèm số giây còn lại.
- [ ] Mã hết hạn sau 10 phút, sai quá 5 lần thì mã bị hủy.
- [ ] Quên mật khẩu → mã qua email; đặt lại thành công → mọi phiên cũ bị hủy, đăng nhập phiên mới.
- [ ] Google: chưa cấu hình → nút ẩn, endpoint 503; state OAuth sai → không đăng nhập.

## 5–6. Requirements
Không thêm dependency: SMTP dùng `smtplib` (stdlib), OAuth dùng `httpx` (đã có). Không lưu mã thô (SHA-256). Thông báo không tiết lộ email có tồn tại hay không ở quên mật khẩu.

## 9. API / database changes
| Loại | Chi tiết |
| --- | --- |
| Cột `users` | `username` (unique), `phone`, `email_verified` (mặc định 1 cho tài khoản cũ), `google_sub` (unique) — migration bổ sung |
| Bảng mới | `email_codes` (email, purpose, code_hash, expires_at, attempts, used, created_at) |
| Đổi | `POST /api/auth/register` → 202, không tạo phiên. `POST /api/auth/login` nhận `identifier` (vẫn nhận `email` cũ) |
| Mới | `POST /api/auth/verify-email`, `/resend-code`, `/forgot-password`, `/reset-password`; `GET /api/auth/providers`, `/api/auth/google/start`, `/api/auth/google/callback` |

## Decisions
| Ngày | Quyết định | Người chốt |
| --- | --- | --- |
| 2026-10-25 | Phạm vi theo yêu cầu người dùng; giới hạn gửi lại 120 s | Người dùng |
| 2026-10-25 | Mặc định chọn: đăng nhập bằng email **hoặc** tên đăng nhập; tài khoản cũ/seed coi như đã xác nhận; chưa cấu hình SMTP thì ghi mã ra log server (chế độ dev) | AI đề xuất |
| 2026-10-25 | Không cho đăng ký đè lên tài khoản chưa xác nhận (chống chiếm email); lấy lại email qua quên mật khẩu; liên kết Google xóa mật khẩu của tài khoản chưa xác nhận | AI (bảo mật) |

## Progress log
- 2026-10-25: Hoàn tất. `pytest -q`: 33 passed, 1 skipped (11 test mới trong `tests/test_auth.py`). Migration thử trên bản sao DB thật (chạy 2 lần, idempotent). QA Chrome trên server :8011 với bản sao DB: đăng ký → xác nhận → đăng nhập; quên → đặt lại; đăng nhập bằng tên đăng nhập; khóa nút gửi lại 120 s; không tràn ngang ở 390 px; không lỗi JS. Google chỉ kiểm tra tới bước chuyển hướng sang Google (client ID giả) — chưa chạy trọn với tài khoản Google thật.
