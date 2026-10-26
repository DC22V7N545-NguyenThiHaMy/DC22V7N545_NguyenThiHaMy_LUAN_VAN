---
paths:
  - "app/**"
  - "scripts/**"
  - "tests/**"
---

# Rule: Code style

Không có formatter/linter cấu hình. Quy ước dưới đây rút ra từ code hiện có — viết code mới giống code xung quanh.

## Python

- Chuỗi dùng nháy đơn `'...'`; f-string khi cần nội suy.
- SQLAlchemy 2.0 style: `select(...)`, `db.scalar(s)`, `db.scalars(...)`, `Mapped[...] = mapped_column(...)`. Không dùng `session.query` kiểu cũ.
- Lỗi trả về người dùng: `raise HTTPException(<code>, '<thông điệp tiếng Việt>')`, giọng thân thiện như code hiện có.
- Tên hàm/biến snake_case tiếng Anh; comment tiếng Anh, ngắn, chỉ giải thích *vì sao*.
- Dòng dài, gọn là bình thường trong repo này; không tách nhỏ hay “làm đẹp” code không liên quan đến thay đổi.
- Import nặng (torch, transformers, CLIP) đặt trong hàm.
- Thời gian dùng `app.models.now()` (UTC, naive).
- Script trong `scripts/` chỉ chạy dưới `if __name__ == '__main__':`; script cần import `app` thì thêm `sys.path.insert(...)` tới gốc repo như `seed_data.py`.

## JavaScript

- React + TypeScript strict (`frontend/src`): function component, hook; chuỗi hiển thị tiếng Việt, tên/comment tiếng Anh. `npm run typecheck` phải sạch.
- Không dùng `dangerouslySetInnerHTML` với dữ liệu từ API (React đã tự escape); chỉ dùng cho path SVG cố định trong `icons.tsx`.
- Điều hướng nội bộ bằng `<A href>` (component trong `components/common.tsx`) hoặc `go()` từ `useApp()`; không `<a href>` thô cho link nội bộ.
- Tôn trọng `prefers-reduced-motion` (xem `motionAllowed()` trong `format.ts`).
- Với giao diện JS cũ (dự phòng): `'use strict'`, không module; mọi dữ liệu động chèn vào HTML phải qua `esc()`.

## CSS

- Dùng biến trong `:root` của `style.css`/`experience.css` (`--olive`, `--ink`, `--line`…); xem [docs/design/ui-guidelines.md](../../docs/design/ui-guidelines.md).
- Thêm style vào file tương ứng với khu vực (`atelier.css` cho banner/“Dành cho bạn”, `experience.css` cho hiệu ứng, `style.css` cho nền tảng).

## Chung

- Không duplicate logic; tìm hàm có sẵn trước khi viết mới (Grep tên hàm/endpoint).
- Không over-engineering: không thêm abstraction, config, class cho một chỗ dùng.
- Không hardcode secret; cấu hình qua `app/config.py` + `.env.example`.
