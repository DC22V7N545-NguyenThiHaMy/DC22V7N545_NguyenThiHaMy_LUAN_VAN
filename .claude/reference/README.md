# Reference index

Tra cứu ở đây **trước khi đoán**. Ưu tiên nguồn nội bộ (code là sự thật cuối cùng), sau đó tài liệu chính thức.
Thư mục này là quy ước của dự án, không được Claude Code nạp tự động.

## Nội bộ

| Chủ đề | Nguồn | Mức xác minh |
| --- | --- | --- |
| Kiến trúc, module, luồng request, danh sách API | [docs/architecture/overview.md](../../docs/architecture/overview.md) | Rút từ code 25/10/2026 |
| Schema DB (bảng, ràng buộc) | `app/models/__init__.py` (nguồn gốc), tóm tắt trong overview §4 | Code |
| Validate input / enum hợp lệ | `app/schemas/__init__.py` | Code |
| Thuật ngữ nghiệp vụ, giá trị tiếng Việt trong DB | [glossary.md](glossary.md) | Rút từ code |
| UI/UX, design tokens, breakpoints | [docs/design/ui-guidelines.md](../../docs/design/ui-guidelines.md) | Rút từ CSS |
| Thuật toán CF/CLIP/Hybrid, phương pháp đánh giá | `README.md` mục "Nguyên lý gợi ý", "Đánh giá có kiểm soát"; code `app/ai/` | README + code |
| Cách chạy, script dữ liệu, định dạng CSV import | `README.md`; `AGENTS.md` §4–5 | Đã chạy pytest 25/10/2026 |
| Kết quả kiểm tra lần trước | `artifacts/verification.md` | Ghi ngày 22/10/2026, chưa chạy lại |
| Nguồn ảnh, giấy phép dataset | `app/static/images/assets.json`, `catalog-manifest.json`, `catalog-provenance.json` | Dữ liệu trong repo |
| Ví dụ code chuẩn | Endpoint có phân quyền + transaction: `checkout` trong `app/routes/api.py`; tác vụ nền: `start_ai_task`/`run_task` trong `app/routes/admin.py`; test API: `tests/test_api.py` | Code |

## Bên ngoài (tài liệu chính thức)

Phiên bản theo `requirements.txt`. Link chưa được kiểm tra truy cập trong phiên tạo file này.

| Thư viện | Ràng buộc version | Tài liệu |
| --- | --- | --- |
| FastAPI | `>=0.115,<1` | https://fastapi.tiangolo.com/ |
| SQLAlchemy 2.0 | `>=2.0,<3` | https://docs.sqlalchemy.org/en/20/ |
| Pydantic v2 / pydantic-settings | `>=2.5,<3` | https://docs.pydantic.dev/latest/ |
| Jinja2 | `>=3.1,<4` | https://jinja.palletsprojects.com/ |
| argon2-cffi | `>=23.1` | https://argon2-cffi.readthedocs.io/ |
| SciPy sparse | `>=1.12,<2` | https://docs.scipy.org/doc/scipy/reference/sparse.html |
| scikit-learn cosine_similarity | `>=1.4,<2` | https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html |
| transformers CLIP | `>=4.45,<5` | https://huggingface.co/docs/transformers/model_doc/clip |
| Model `openai/clip-vit-base-patch32` | — | https://huggingface.co/openai/clip-vit-base-patch32 |
| Playwright Python (dev) | `>=1.50` | https://playwright.dev/python/ |
| Claude Code (skills, hooks, settings) | — | https://docs.claude.com/en/docs/claude-code |

## Thêm reference mới

- Chỉ thêm khi có nguồn thật; ghi nguồn và mức xác minh vào bảng trên.
- Không chép nguyên tài liệu bên ngoài; tóm tắt điểm dự án dùng + link.
- Tài liệu dài cho con người → `docs/`; ở đây chỉ để index và tóm tắt cho AI.
