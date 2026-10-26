# Rule: Kiến trúc

Áp dụng cho mọi thay đổi trong `app/`, `scripts/`, `tests/`. Bản đồ chi tiết: [docs/architecture/overview.md](../../docs/architecture/overview.md).

## Phân lớp (đã xác minh trong code)

```text
routes (api.py, admin.py, storefront.py)
   ↓ gọi
services/ (auth, interactions, seed)   repositories/ (catalog)   ai/ (CF, CLIP, hybrid, evaluation)
   ↓ dùng
models/ (SQLAlchemy)  ←  database.py  ←  config.py
```

- Route mỏng vừa phải: validate bằng `app/schemas`, phân quyền bằng `Depends(current_user | admin_user | optional_user)`.
- Logic dùng lại ở ≥ 2 nơi → đưa vào `services/`, `repositories/` hoặc `ai/`, không copy giữa các route.
- `app/ai/*` không import từ `app/routes/*`. `models` không import `services`/`routes`. Không tạo vòng import.
- Serialize sản phẩm luôn qua `repositories.catalog.serialize_product`; lấy catalog đang bán qua `active_products`.
- Ghi tương tác luôn qua `services.interactions.record` (giữ trọng số `WEIGHTS` và debounce 30 phút).
- Tác vụ AI nặng (embedding, CF, evaluation) chạy qua `ModelRun` + background thread + `_job_lock` trong `admin.py`; không chạy CLIP cho cả catalog trong request thường.
- Encoder CLIP nạp lười một lần (`get_encoder()`); import torch/transformers bên trong hàm để app khởi động không cần torch.

## Database

- Thêm bảng/cột: khai báo trong `app/models/__init__.py` **và** thêm revision Alembic idempotent trong `db_migrations/versions/` (DB local đã tồn tại; `create_all` không thêm cột). `migrate()` trong `app/services/migrations.py` chỉ giữ các ALTER cũ, không thêm vào đó nữa. DB mới chỉ được `stamp head`, nên revision phải bỏ qua nếu cột/bảng đã có.
- Không xóa/đổi tên cột đang dùng nếu không có plan được duyệt.
- Thay đổi tồn kho/đơn hàng phải nằm trong cùng transaction, có điều kiện (xem `checkout` trong `api.py`).

## Frontend

- Giao diện chính là React 19 + TypeScript + Vite trong `frontend/` (build → `app/static/dist/`, template `react.html`). Route trang mới phải thêm cả ở `app/main.py` (decorator `@app.get`) và trong `frontend/src/App.tsx`. Sửa `frontend/src` thì chạy `npm run build` và commit `app/static/dist`.
- Trạng thái dùng chung (user, giỏ, yêu thích, modal, toast) ở `frontend/src/context.tsx`; gọi API qua `frontend/src/api.ts`; dữ liệu trang qua `useAsync`. Markup/class/`data-*` giữ nguyên như bản cũ vì CSS và script QA dựa vào chúng.
- Giao diện JS thuần cũ trong `app/static/js/` chỉ còn là dự phòng (`FRONTEND=legacy` hoặc chưa có build). Không phát triển tính năng mới ở đó, trừ sửa lỗi để dự phòng không hỏng.
- Không thêm CDN script. Font và ảnh phục vụ cục bộ; CSS dùng chung ở `app/static/css`.

## Dependencies & contracts

- Không thêm package vào `requirements.txt` khi chưa được đồng ý; ưu tiên thư viện đã có (numpy, scipy, sklearn, pandas, Pillow).
- Contract công khai = đường dẫn `/api/...`, tên field JSON, status code, cookie `vela_session`. Đổi phải có plan + cập nhật `frontend/src` (và `app.js` dự phòng) và test.
