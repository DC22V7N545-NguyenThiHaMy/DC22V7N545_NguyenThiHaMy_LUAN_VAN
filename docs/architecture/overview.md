# Kiến trúc VELASTYLE

Rút từ mã nguồn ngày 25/10/2026. Thuật toán và cách chạy chi tiết xem `README.md`; thuật ngữ xem `.claude/reference/glossary.md`.

## 1. Tổng quan

Ứng dụng FastAPI **một tiến trình**, SQLite cục bộ, phục vụ cả API JSON (`/api/...`) lẫn SPA React.
Mọi đường dẫn giao diện (`/`, `/san-pham`, `/quan-tri`…) trả cùng một shell: `react.html` nạp `static/dist/app.js` (React + react-router, mã nguồn ở `frontend/`); khi chưa có bản build hoặc `FRONTEND=legacy` thì trả `base.html` với `app.js` JS thuần cũ.

```text
Trình duyệt ──► FastAPI (app/main.py)
                 ├─ middleware: CSRF same-origin + security headers
                 ├─ /static/*        StaticFiles (CSS, JS, ảnh, font, uploads)
                 ├─ /, /san-pham…    base.html (SPA shell)
                 └─ /api/*           routers
                       ├─ api.py         auth, catalog, review, favorite, cart, order, gợi ý, tìm ảnh, upload
                       ├─ admin.py       /api/admin/* (admin_user): dashboard, CRUD, đơn, AI tasks, evaluation
                       └─ storefront.py  storefront facets, journal
                             │
           services/ (auth, interactions, seed, demo_data, migrations)
           repositories/catalog.py (serialize_product, active_products)
           ai/ (CF, CLIP, content, hybrid, evaluation, image_search)
                             │
           models/ (SQLAlchemy) ── database.py ── SQLite data/velastyle.db (WAL)
                                                  data/embeddings/*.npz
```

## 2. Khởi động

`lifespan` trong `app/main.py`: `upgrade_database(engine)` (`create_all` → `migrate` ALTER cũ → Alembic `upgrade head`, hoặc `stamp head` nếu DB mới) → đánh dấu `ModelRun` còn `running` là `failed`.
`app/config.py` đọc `.env`, tạo sẵn `data/`, `data/embeddings/`, `app/static/uploads/`.

## 3. Module

| Module | Trách nhiệm |
| --- | --- |
| `services/auth.py` | Argon2, session (token → SHA-256 trong bảng `sessions`, 7 ngày), `optional_user` / `current_user` / `admin_user`, throttle đăng nhập |
| `routes/auth.py` | Toàn bộ endpoint `/api/auth/*`: đăng ký, xác nhận email, đăng nhập, quên/đặt lại mật khẩu, Google OAuth |
| `services/verification.py` | Mã 6 số (lưu SHA-256), hết hạn 10 phút, tối đa 5 lần nhập sai, gửi lại tối thiểu 120 s |
| `services/mailer.py` | Gửi email qua SMTP (stdlib); chưa cấu hình `SMTP_HOST` thì chỉ ghi log (chế độ dev) |
| `services/google_oauth.py` | Đổi authorization code lấy thông tin người dùng Google qua `httpx` |
| `services/interactions.py` | `record()` ghi tương tác có trọng số + debounce |
| `services/seed.py`, `demo_data.py` | Dữ liệu mẫu idempotent, gắn cờ `simulated` |
| `services/migrations.py` | `upgrade_database()`: create_all + `migrate()` (ALTER cũ) + Alembic; revision mới nằm ở `db_migrations/versions/` |
| `repositories/catalog.py` | Serialize sản phẩm (kèm rating nếu truyền `db`), danh sách đang bán |
| `ai/collaborative_filtering.py` | Item-item CF (CSR + cosine), popularity |
| `ai/clip_encoder.py` | Nạp CLIP lười một lần, encode ảnh/văn bản, `generate_embeddings`, fingerprint |
| `ai/content_recommender.py` | Đọc `.npz` hợp lệ, profile CLIP có trọng số |
| `ai/hybrid_recommender.py` | Kết hợp điểm, fallback, cold-start, lọc, lý do, ghi `RecommendationLog` |
| `ai/evaluation.py` | Temporal split chống leakage, metrics xếp hạng, latency |
| `ai/image_search.py` | Tìm theo ảnh tải lên bằng vector ảnh CLIP |
| `frontend/src/` | Giao diện React/TypeScript: `App.tsx` (route), `context.tsx` (user, giỏ, modal, toast), `api.ts`, `pages/*` (trang), `components/*`, `hooks/*`; build → `static/dist/app.js` |
| `static/js/app.js` | (Dự phòng) Router SPA JS thuần cũ, `state`, `api()`, mọi trang |
| `static/js/experience.js` | Trang chủ trình chiếu, quiz phong cách, zoom, hướng dẫn size, gợi ý tìm kiếm, journal |
| `static/js/atelier.js` | Banner kiểu tạp chí và trang "Dành riêng cho bạn" |
| `static/js/announcement.js` | Thanh thông báo chạy |

## 4. Dữ liệu (bảng trong `app/models/__init__.py`)

| Nhóm | Bảng |
| --- | --- |
| Người dùng | `users` (username, phone, email_verified, google_sub, role, preferences JSON, simulated), `sessions`, `email_codes` |
| Catalog | `categories`, `brands`, `products` (active, price > 0), `product_images`, `product_variants` (unique product+size+color, stock ≥ 0) |
| Mua sắm | `carts` (1/user), `cart_items` (quantity > 0), `orders`, `order_items` (unit_price chụp lúc mua) |
| Tín hiệu | `interactions`, `favorites` (unique user+product), `reviews` (unique user+product, rating 1–5, simulated) |
| AI | `product_embeddings` (fingerprint, path .npz, model_version), `recommendation_logs`, `model_runs`, `model_evaluations`, `settings` (key/value, vd `alpha`) |

File không nằm trong DB: `data/embeddings/product-<id>.npz` (`image`, `text`, `combined`), `data/embeddings/cf.npz` (snapshot similarity).

## 5. API

Quyền: **P** = công khai, **O** = tùy chọn đăng nhập, **U** = cần đăng nhập, **A** = admin.

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| GET | `/api/health` | P | |
| POST | `/api/auth/register` | P | 202, gửi mã 6 số qua email, **không** tạo phiên; 409 nếu email/tên đăng nhập đã dùng |
| POST | `/api/auth/verify-email` | P | mã đúng → xác nhận email + set cookie `vela_session` |
| POST | `/api/auth/login` | P | `identifier` = email hoặc tên đăng nhập (vẫn nhận `email`); 403 `email_unverified` |
| POST | `/api/auth/resend-code` · `/forgot-password` | P | 429 nếu gửi lại trong 120 s; trả cùng một câu trả lời dù email có tồn tại hay không |
| POST | `/api/auth/reset-password` | P | mã đúng → đổi mật khẩu, hủy mọi phiên cũ, tạo phiên mới |
| GET | `/api/auth/providers` | P | `google`, `email_delivery` đã cấu hình chưa |
| GET | `/api/auth/google/start` · `/google/callback` | P | OAuth 2.0 authorization code, cookie `vela_oauth_state`; 503 nếu chưa cấu hình |
| POST | `/api/auth/logout` | P | |
| GET | `/api/auth/me` | O | `null` nếu chưa đăng nhập |
| PUT | `/api/profile` | U | lưu preferences |
| GET | `/api/categories` · `/api/brands` | P | |
| GET | `/api/products` | P | q, gender, category, brand, color, size, style, sale, min/max_price, sort, page, limit |
| GET | `/api/products/{id}` | O | ghi `view` nếu đăng nhập |
| GET/POST | `/api/products/{id}/reviews` | P / U | |
| POST | `/api/interactions` | U | chỉ `view` |
| GET | `/api/history` · `/api/favorites` | U | |
| POST | `/api/favorites/{id}` | U | toggle |
| GET/POST | `/api/cart` | U | |
| PATCH/DELETE | `/api/cart/{item_id}` | U | kiểm tra quyền sở hữu |
| GET/POST | `/api/orders` | U | checkout trừ kho có điều kiện trong một transaction |
| GET | `/api/recommendations/similar/{id}` | P | CLIP hoặc `category_fallback` |
| GET | `/api/recommendations/{hybrid,collaborative,clip}` | O | k, gender, max_price |
| POST | `/api/recommendations/image-search` | U | 503 nếu CLIP/embedding chưa sẵn |
| POST | `/api/admin/uploads` | A | re-encode JPEG, tên ngẫu nhiên |
| GET | `/api/info/{slug}` | P | trang thông tin tĩnh |
| GET | `/api/storefront` · `/api/journal[/{slug}]` | P | |
| GET | `/api/admin/dashboard` · `products` · `users` · `orders` · `interactions` · `dataset` · `evaluations` | A | |
| POST/PUT/DELETE | `/api/admin/products[/{id}]` | A | DELETE = ngừng bán (xóa mềm) |
| POST/PUT/DELETE | `/api/admin/taxonomy/{kind}[/{id}]` | A | category/brand |
| PATCH | `/api/admin/orders/{id}` | A | chuyển trạng thái có kiểm soát, hủy hoàn kho |
| GET/PUT | `/api/admin/ai/status` · `/api/admin/ai/settings` | A | α hybrid |
| POST | `/api/admin/ai/{generate-embeddings,rebuild-cf,evaluate}` | A | 202 + run id; 409 nếu đang có tác vụ |
| GET | `/api/admin/ai/runs/{id}` | A | thăm dò trạng thái |

Lỗi trả `{"detail": "<tiếng Việt>"}` qua `HTTPException`; lỗi validate Pydantic trả 422.

## 6. Luồng chính

**Gợi ý** (`GET /api/recommendations/hybrid`): nạp sản phẩm đang bán + toàn bộ interactions → fit CF mỗi request → nạp embedding hợp lệ → profile CLIP → kết hợp với α hiệu dụng → fallback phổ biến nếu không có tín hiệu → cold-start theo preferences → loại đã mua/hết hàng/lọc → lý do → log.

**Tác vụ AI**: admin POST → tạo `ModelRun(running)` → thread nền giữ `_job_lock` → cập nhật `completed/failed` → UI thăm dò mỗi 2,5 s.

## 7. Giới hạn đã biết (từ README)

Một tiến trình (lock và throttle trong bộ nhớ), CF xây lại mỗi request (phù hợp catalog ~257 sản phẩm), không thanh toán/vận chuyển thật, không khôi phục mật khẩu qua email, không CI.
