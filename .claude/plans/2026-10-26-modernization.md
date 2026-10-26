---
status: done
created: 2026-10-26
---

# Hiện đại hóa: Python, mô hình, thuật toán, giao diện

Người dùng yêu cầu rõ ràng (26/10/2026) làm cả 7 hạng mục sau khi được báo rủi ro; việc này thay cho bước duyệt plan.

## Phạm vi và cách làm

| # | Hạng mục | Cách làm | Quyết định |
| --- | --- | --- | --- |
| 1 | Cảnh báo `httpx` | `httpx2` trong `requirements-dev.txt` | Runtime vẫn dùng `httpx` |
| 2 | Docker + CI | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` | Chưa chạy thử Docker/CI thật |
| 3 | Alembic | `db_migrations/`, `upgrade_database()`; `migrate()` cũ giữ làm cầu nối | DB mới chỉ `stamp head` |
| 4 | Python | Hỗ trợ 3.11–3.13; test pass trên 3.11 và 3.13; khuyến nghị 3.13 | Không tự thay `.venv` của người dùng |
| 5 | SigLIP | `ClipEncoder` nhận CLIP/SigLIP/SigLIP 2; thư mục embedding theo mô hình | Mặc định vẫn CLIP để khớp báo cáo luận văn |
| 6 | ALS | `app/ai/als.py`, thêm vào API + đánh giá, không thêm vào 3 chế độ UI | Hybrid giữ nguyên |
| 7 | Giao diện | React 19 + TypeScript + Vite trong `frontend/`, build vào `app/static/dist` | Giữ markup/class/`data-*`; bản JS cũ là dự phòng (`FRONTEND=legacy`) |

## Decisions

- 26/10/2026: không đổi contract API; chỉ thêm `model` vào phản hồi `image-search` và `als` vào `/recommendations/{method}`.
- 26/10/2026: không dùng StrictMode vì hiệu ứng kép trong dev ghi lượt xem sản phẩm hai lần.

## Kết quả kiểm chứng (26/10/2026)

- `pytest`: 38 passed, 1 skipped trên Python 3.11 và Python 3.13.
- Frontend: `tsc --noEmit` sạch, `vitest` 11 passed, `vite build` thành công.
- Cả 5 script QA Playwright chạy trên bản React (DB bản sao, cổng riêng); `upgrade_qa.py` cần sửa một locator mơ hồ có sẵn từ trước (cũng lỗi trên bản cũ).
- So sánh ảnh chụp giao diện cũ và React (reduced motion): 59 cặp trang (khách, người dùng, quản trị; desktop và 390 px), không lệch kích thước, chênh lệch tối đa 0,057% điểm ảnh (trang đánh giá mô hình, do đổi chữ "ba" thành "bốn" mô hình). Lần đầu một trang lỗi 404 sản phẩm trên mobile lệch 83 px vì class `detail-route`; đã sửa.
