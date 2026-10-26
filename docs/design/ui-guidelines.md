# UI guidelines

Rút từ `app/static/css/*.css` và `base.html` ngày 25/10/2026.

## Phong cách

Trắng ngà / xanh olive, typography biên tập (serif cho tiêu đề, sans cho nội dung), ảnh thời trang thật, nhiều khoảng trắng.
Giọng văn tiếng Việt thân mật, xưng "chúng mình" – "bạn" (ví dụ: "Đã cất vào góc yêu thích của bạn.").

## Design tokens

Định nghĩa trong `:root` của `style.css` (nền tảng) và `experience.css` (bổ sung). Dùng biến, không hardcode màu mới.

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--bg` | `#faf9f6` | Nền trang |
| `--ink` | `#272921` | Chữ chính |
| `--muted` | `#818179` | Chữ phụ |
| `--olive` | `#50583f` | Màu nhấn, focus outline |
| `--olive-dark` | `#3d4631` | Nhấn đậm, hover |
| `--line` | `#e6e5de` | Viền, đường kẻ |
| `--beige` | `#eeece5` | Nền khối phụ |
| `--white` | `#fff` | |
| `--soft` | `#f0f1e8` | Nền nhẹ (experience) |
| `--sage` | `#dfe4d2` | Nền nhấn nhẹ (experience) |
| `--serif` | `'Playfair Display', Georgia, serif` | Tiêu đề |
| `--sans` | `'Be Vietnam Pro', Arial, sans-serif` | Nội dung (13px/1.7 mặc định) |
| `--ease` | `cubic-bezier(.16,1,.3,1)` | Chuyển động |

Font tự host trong `app/static/fonts/` (SIL OFL), khai báo ở `fonts.css`.

## Responsive

Breakpoint đang dùng (max-width): 1200, 1000, 800, 600 px; thêm 1500/1535/1100/700/400 cho thanh thông báo và atelier; min-width 1600/1700 cho màn hình lớn.
Các lần QA trước kiểm tra 320, 390, 768, 1280, 1440, 1920 px — không tràn ngang (`artifacts/verification.md`).

## Truy cập & chuyển động

- `skip-link`, `aria-label` cho nút icon, `aria-live` cho toast, `:focus-visible` outline olive.
- Mỗi file CSS có khối `@media (prefers-reduced-motion: reduce)`; JS kiểm tra `motionAllowed()` trước khi animate.
- Trình chiếu có nút tạm dừng; tự dừng khi tab ẩn.

## Khi thêm UI mới

- Dùng icon qua `<Icon name="..." />` (bảng `paths` trong `frontend/src/icons.tsx`).
- React tự escape dữ liệu; định dạng tiền bằng `money()` trong `frontend/src/format.ts`.
- Kiểm tra desktop và ~390 px; ghi rõ nếu chưa kiểm tra được.
