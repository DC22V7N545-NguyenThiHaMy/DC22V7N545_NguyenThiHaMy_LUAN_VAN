# AGENTS.md — VELASTYLE

Hướng dẫn chung cho mọi AI coding agent (Claude Code, Codex, ChatGPT có quyền đọc repo).
Đây là **nguồn sự thật duy nhất** về quy tắc dự án. `CLAUDE.md` import file này; đừng chép lại nội dung sang nơi khác.

## 1. Dự án là gì

VELASTYLE là **đồ án / luận văn**: website thời trang giao diện tiếng Việt kèm hệ gợi ý cá nhân hóa
(Collaborative Filtering + CLIP + Hybrid) và tìm kiếm bằng ảnh. Chạy local trên Windows, một tiến trình.

Mục tiêu nghiệp vụ (theo README): trình diễn luồng mua sắm hoàn chỉnh (catalog → giỏ → đặt hàng **mô phỏng**),
gợi ý có lý do minh bạch, và **đánh giá có kiểm soát** ba phương pháp gợi ý (Precision/Recall/NDCG/Hit Rate/Coverage).
Dữ liệu seed, đơn hàng, thanh toán là mô phỏng và phải luôn được gắn nhãn như vậy.

## 2. Tech stack (đã xác minh từ code)

| Lớp | Công nghệ |
| --- | --- |
| Backend | Python 3.11–3.13 (khuyến nghị 3.13; test đã chạy trên 3.11 và 3.13), FastAPI, Uvicorn, Pydantic v2 + pydantic-settings |
| Database | SQLite (WAL, foreign keys ON) qua SQLAlchemy 2.0 (`Mapped`/`mapped_column`) |
| Auth | Argon2 (argon2-cffi), session token ngẫu nhiên lưu SHA-256 trong DB, cookie `vela_session` HttpOnly |
| AI | NumPy, SciPy CSR, scikit-learn cosine; item-CF, ALS (`app/ai/als.py`, NumPy thuần), CLIP `openai/clip-vit-base-patch32` (mặc định) hoặc SigLIP/SigLIP 2 qua `CLIP_MODEL`, PyTorch + transformers trên CPU |
| Frontend | React 19 + TypeScript + Vite + react-router trong `frontend/`, build ra `app/static/dist/` (đã commit) và phục vụ qua `app/templates/react.html`; CSS thuần dùng chung ở `app/static/css`. JS thuần cũ (`base.html` + `app/static/js/`) là **phương án dự phòng**: tự dùng khi chưa có build hoặc đặt `FRONTEND=legacy` |
| Test | pytest + FastAPI TestClient; Playwright (tùy chọn, dev) cho QA trình duyệt |
| Migration | Alembic (`alembic.ini`, `db_migrations/`) chạy sau `create_all` + `migrate()` cũ qua `upgrade_database()` |
| Đóng gói / CI | `Dockerfile` + `docker-compose.yml` (CPU-only torch, chưa chạy thử trong repo này); GitHub Actions `.github/workflows/ci.yml` |
| Không có | linter/formatter cấu hình sẵn |

## 3. Bản đồ mã nguồn

Gốc repo là thư mục chứa file này (có `.git`). Chi tiết: [docs/architecture/overview.md](docs/architecture/overview.md).

```text
app/main.py            FastAPI app, lifespan (`upgrade_database`: create_all + migrate + Alembic), middleware CSRF/security headers, route SPA
app/config.py          Settings (.env), ROOT
app/database.py        engine, SessionLocal, get_db
app/models/            SQLAlchemy models (toàn bộ schema trong __init__.py)
app/schemas/           Pydantic input models
app/repositories/      serialize_product, active_products
app/services/          auth, interactions (trọng số + debounce), seed/demo_data, migrations (`migrate` ALTER cũ + `upgrade_database`); revision mới ở `db_migrations/versions/`
app/routes/            api.py (thương mại), admin.py (/api/admin, admin_user), storefront.py (storefront/journal)
app/ai/                collaborative_filtering, clip_encoder, content_recommender, hybrid_recommender, evaluation, image_search
app/static/css         CSS dùng chung cho cả giao diện React và bản cũ
app/static/js          Giao diện JS thuần CŨ (dự phòng): app.js, experience.js, atelier.js, announcement.js
app/static/dist        Bản build React (app.js) — sinh bởi `npm run build`, không sửa tay
frontend/              Mã nguồn React/TypeScript: src/pages, src/components, src/context.tsx, src/api.ts
db_migrations/         Alembic (env.py, versions/)
scripts/               CLI dữ liệu/AI và QA trình duyệt (xem §5)
tests/                 pytest, DB tạm riêng (conftest.py)
data/                  velastyle.db, embeddings/*.npz (không commit), raw/products.csv
artifacts/             ảnh chụp QA + verification.md (có commit)
```

## 4. Lệnh build / chạy / test

Chạy từ gốc repo, PowerShell:

```powershell
.\start.ps1                                           # tạo venv nếu thiếu, init + seed DB, chạy :8010
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
.\.venv\Scripts\python.exe -m pytest -q               # ~5 s, DB tạm, an toàn. Baseline 26/10/2026: 38 passed, 1 skipped
$env:RUN_CLIP_TESTS='1'; .\.venv\Scripts\python.exe -m pytest -q   # thêm test CLIP thật (cần cache model)
cd frontend; npm ci; npm run typecheck; npm test; npm run build   # giao diện React (build ghi app/static/dist)
node --check app/static/js/app.js                     # chỉ cho giao diện JS cũ (dự phòng)
```

Không có lệnh lint/format chính thức. **Không tự chạy black/ruff/prettier lên toàn repo** — sẽ viết lại toàn bộ style hiện có.

## 5. Script có tác dụng phụ — hỏi trước khi chạy

| Script | Tác dụng |
| --- | --- |
| `seed_data.py`, `expand_demo.py`, `import_dataset.py` | Ghi vào `data/velastyle.db` đang dùng |
| `generate_embeddings.py`, `train_cf.py`, `evaluate_models.py` | Ghi `data/embeddings/`, bảng model_runs/evaluations; CLIP tốn CPU, lần đầu tải model |
| `prepare_fashion_dataset.py`, `download_images.py` | Tải từ Internet, ghi đè ảnh trong `app/static/images/` |
| `*_qa.py`, `final_snapshots.py` | Cần server đang chạy + Chrome; ghi đè ảnh trong `artifacts/` (có commit) |
| `init_db.py`, `export_catalog.py`, `preprocess.py` | Ít rủi ro (create_all / xuất CSV) |

## 6. Quy tắc bắt buộc (tóm tắt — chi tiết trong `.claude/rules/`)

Đọc rule liên quan trước khi sửa:
[architecture](.claude/rules/architecture.md) · [code-style](.claude/rules/code-style.md) ·
[security](.claude/rules/security.md) · [testing](.claude/rules/testing.md) · [documentation](.claude/rules/documentation.md)

1. Giữ kiến trúc phân lớp hiện có: routes → services/repositories/ai → models. Không thêm framework hay dependency mới khi chưa được đồng ý.
2. Không đổi contract API (đường dẫn, tên field JSON, status code) hoặc schema DB mà không có plan được duyệt. Đổi schema phải thêm revision Alembic idempotent trong `db_migrations/versions/` (`alembic revision --autogenerate -m "..."`, rồi kiểm tra `alembic check`) vì DB local đã tồn tại.
3. Chuỗi hiển thị cho người dùng (UI, thông báo lỗi HTTPException) bằng **tiếng Việt**; tên biến/hàm/comment bằng tiếng Anh như code hiện có.
4. Luôn lấy user từ session (`current_user`/`admin_user`), không tin ID do client gửi. Giữ nguyên middleware CSRF same-origin.
5. Không giả lập kết quả AI: thiếu embedding thì fallback có ghi `status` rõ ràng hoặc trả 503, như code hiện có.
6. Dữ liệu mô phỏng phải giữ cờ `simulated` / nhãn "mô phỏng".
7. Không tuyên bố "đã test/đã chạy" nếu chưa thực sự chạy; phân biệt lỗi có sẵn với lỗi mới phát sinh.

## 7. Quy trình làm việc

Áp dụng theo độ lớn của việc — không biến bước thừa thành thủ tục:

| Loại việc | Quy trình |
| --- | --- |
| Sửa nhỏ, rõ ràng (≤ 1–2 file, không đổi contract) | Đọc code liên quan → sửa → chạy test/kiểm tra phù hợp → báo cáo |
| Tính năng mới | Phân tích yêu cầu → tra reference → kiểm rule → **plan** trong `.claude/plans/` → chờ duyệt → triển khai → test → review → cập nhật docs → báo cáo |
| Refactor lớn / đổi schema / đổi API | Bắt buộc plan có đánh giá tác động và được người dùng duyệt (`status: approved`) |
| Thao tác nguy hiểm (xóa dữ liệu, ghi DB thật, git force, tải lại dataset) | Hỏi và chờ đồng ý rõ ràng trước |

- Plan: [.claude/plans/README.md](.claude/plans/README.md). Plan `draft` **không** phải quyết định cuối cùng.
- Tra cứu thay vì đoán: [.claude/reference/README.md](.claude/reference/README.md).

## 8. Tiêu chuẩn hoàn thành (Definition of Done)

Một việc chỉ được báo "xong" khi:

- [ ] Thay đổi nằm trong phạm vi yêu cầu/plan, không tự mở rộng.
- [ ] `pytest -q` đã chạy và kết quả được báo đúng (số passed/failed/skipped). Có thay đổi logic → có test mới hoặc giải thích vì sao không.
- [ ] File JS sửa qua `node --check`; file Python import được.
- [ ] Thay đổi UI: nêu rõ đã/chưa kiểm tra trên trình duyệt (desktop + mobile ~390 px).
- [ ] Docs liên quan (README, docs/, reference) đã cập nhật nếu hành vi hoặc kiến trúc thay đổi.
- [ ] Báo cáo cuối liệt kê: file đã sửa, lệnh đã chạy + kết quả, phần chưa kiểm chứng.

## 9. AI không được tự ý

- Xóa/ghi đè `data/velastyle.db*`, `data/embeddings/`, `app/static/images/`, `app/static/uploads/`, `artifacts/`.
- Sửa `.env` hoặc in giá trị bí mật; commit `.env`, DB, embeddings, uploads.
- `git push`, `git push --force`, `git reset --hard`, `git clean`, viết lại lịch sử; commit khi chưa được yêu cầu.
- Deploy lên bất kỳ môi trường nào; thêm thanh toán/vận chuyển thật.
- Tắt kiểm tra bảo mật (CSRF, auth, validate upload) hoặc xóa/skip test để "cho qua".
- Chạy formatter toàn repo, nâng cấp major dependency, đổi model CLIP.

## Ghi chú cho Codex / ChatGPT

- ChatGPT/Codex **không** tự đọc `CLAUDE.md`, `.claude/skills/` hay chạy hooks của Claude Code. Hãy đọc file này, rồi mở các file trong `.claude/rules/` và `.claude/skills/<tên>/SKILL.md` như tài liệu quy trình khi cần (ví dụ phân tích yêu cầu → đọc `.claude/skills/requirements-analysis/SKILL.md`).
- Các rào chắn tự động (chặn lệnh nguy hiểm, kiểm tra cú pháp) chỉ chạy trong Claude Code; ở môi trường khác bạn phải tự tuân thủ §5 và §9.
