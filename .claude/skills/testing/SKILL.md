---
name: testing
description: Xác định, viết và chạy test cho VELASTYLE (pytest + TestClient với SQLite tạm, node --check cho JS, QA Playwright tùy chọn) và báo cáo kết quả trung thực. Dùng khi cần kiểm chứng thay đổi, viết test mới, điều tra test fail, hoặc người dùng hỏi "test", "kiểm tra có chạy không".
argument-hint: "[phạm vi: file test, module hoặc 'all']"
---

# Testing

## Kích hoạt

Sau khi sửa code; khi người dùng yêu cầu test; khi test fail cần điều tra.

## Tài liệu tham khảo

- `.claude/rules/testing.md` (baseline, quy tắc)
- `tests/conftest.py` (fixture `client`, `user`, `admin`; DB tạm)
- Test cùng loại trong `tests/test_api.py`, `test_recommendation.py`, `test_storefront.py`

## Các bước

1. Xác định loại thay đổi → loại kiểm tra:
   | Thay đổi | Kiểm tra |
   | --- | --- |
   | Route/API/quyền | pytest qua `client`/`user`/`admin`, assert status + JSON |
   | Logic AI (CF, hybrid, metrics) | pytest unit trên hàm trong `app/ai/` với dữ liệu nhỏ |
   | Model/migration | pytest + kiểm tra `upgrade_database()` idempotent (xem `tests/test_migrations.py`) |
   | JS | `node --check app/static/js/<file>.js`; UI thật cần trình duyệt |
   | CSS/HTML | chỉ kiểm tra được bằng trình duyệt → ghi rõ nếu chưa làm |
2. Viết test mới theo phong cách hiện có (hàm `test_*`, assert trực tiếp, email ngẫu nhiên bằng `uuid` khi tạo user).
3. Chạy: `.\.venv\Scripts\python.exe -m pytest -q` (hoặc `-q tests/<file>.py -k <tên>` khi đang lặp).
4. Test fail → xác định lỗi có sẵn (có trong baseline) hay mới. Sửa code, không sửa assert cho khớp lỗi.
5. QA trình duyệt (`scripts/*_qa.py`) chỉ khi người dùng đồng ý: cần server :8010 và Chrome, ghi đè `artifacts/`.

## Kết quả

```text
Lệnh: <lệnh đã chạy>
Kết quả: N passed, M failed, K skipped (so với baseline 22/0/1)
Lỗi mới: ... | Lỗi có sẵn: ...
Chưa kiểm chứng: ... (vd: giao diện mobile, CLIP thật)
```

## Kiểm tra kết quả

- Con số lấy từ output thật, không ước lượng.
- Không có test bị skip/xóa để qua.
- Test mới fail khi bỏ thay đổi (kiểm tra được nếu cần).
