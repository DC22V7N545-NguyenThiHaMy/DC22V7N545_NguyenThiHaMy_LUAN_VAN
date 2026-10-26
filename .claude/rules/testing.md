# Rule: Kiểm thử

## Bộ test hiện có

- `tests/conftest.py` đặt `DATABASE_URL` sang SQLite tạm **trước** khi import app, seed một lần mỗi session. Fixtures: `client`, `user` (linh@…), `admin`.
- `test_api.py` (auth, quyền, CSRF, filter, giỏ/đơn/tồn kho…), `test_recommendation.py` (CF, hybrid, metrics, leakage), `test_storefront.py`.
- Test CLIP thật chỉ chạy khi `RUN_CLIP_TESTS=1`.
- Baseline 26/10/2026: `38 passed, 1 skipped` (~5 s).

## Bắt buộc

- Chạy `.\.venv\Scripts\python.exe -m pytest -q` trước khi báo hoàn thành thay đổi Python. Báo đúng con số.
- Ghi nhận kết quả **trước** khi sửa nếu nghi có lỗi sẵn, để phân biệt lỗi có sẵn và lỗi mới.
- Logic mới (endpoint, công thức gợi ý, quyền) → thêm test cùng phong cách (`client.get/post`, assert status code + payload).
- Test không được ghi vào `data/velastyle.db` thật. Không import `app` trong test trước khi `conftest` đặt `DATABASE_URL`.
- Không xóa, skip hay nới assert để test qua. Nếu test cũ sai, giải thích và hỏi.
- JS: `node --check <file>`. UI: nếu không chạy trình duyệt được, ghi rõ “chưa kiểm tra giao diện”.

## Tùy chọn (cần server :8010 + Chrome + Playwright)

`scripts/browser_qa.py`, `admin_qa.py`, `upgrade_qa.py`, `atelier_qa.py`, `final_snapshots.py` — ghi đè ảnh trong `artifacts/`, chỉ chạy khi người dùng đồng ý.

## Không làm

- Không chạy toàn bộ test sau mỗi chỉnh sửa nhỏ giữa chừng; chạy khi xong một đơn vị thay đổi.
- Không tuyên bố “đã test” nếu chỉ đọc code.
