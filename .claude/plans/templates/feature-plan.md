---
title: <Tên feature>
status: draft
created: YYYY-MM-DD
owner: <người yêu cầu>
related: []
---

# <Tên feature>

## 1. Business objective
<Feature giúp ai, đạt mục tiêu gì của đồ án / người mua sắm / quản trị.>

## 2. Problem statement
<Hiện trạng (có file:dòng) và vấn đề cụ thể.>

## 3. User stories
- Là <khách / khách đã đăng nhập / quản trị>, tôi muốn <...> để <...>.

## 4. Acceptance criteria
- [ ] Given <...> When <...> Then <...>

## 5. Functional requirements
- FR1: ...

## 6. Non-functional requirements
- Bảo mật: phân quyền, CSRF, validate input (xem `.claude/rules/security.md`)
- Hiệu năng: ...
- Giao diện: tiếng Việt, responsive 320–1920 px, `prefers-reduced-motion`
- Dữ liệu mô phỏng giữ nhãn `simulated`

## 7. Architecture impact
<Lớp nào bị ảnh hưởng (routes / services / repositories / ai / models / static). Có vi phạm phân lớp không.>

## 8. Data flow
```text
UI (app.js) → /api/... → service/ai → models → SQLite
```

## 9. API / database changes
| Loại | Chi tiết | Tương thích ngược |
| --- | --- | --- |
| Endpoint | `METHOD /api/...` request/response, status code | |
| Bảng/cột | ... + bước migration trong `app/services/migrations.py` | |

_Ghi "Không có" nếu không đổi._

## 10. Affected files and modules
| File | Tạo/Sửa | Lý do |
| --- | --- | --- |

## 11. Implementation steps
1. ... — kiểm chứng: ...

## 12. Testing strategy
- pytest: test mới/sửa trong `tests/...`
- `node --check` cho JS đã sửa
- UI: trang/viewport cần kiểm tra thủ công hoặc qua `scripts/*_qa.py` (cần đồng ý)

## 13. Risks and dependencies
| Rủi ro | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- |

## 14. Definition of Done
- [ ] Acceptance criteria đạt
- [ ] `pytest -q` chạy, không lỗi mới (ghi kết quả)
- [ ] Docs/README cập nhật nếu đổi hành vi
- [ ] Review (`/change-review`) không còn mục Nghiêm trọng

## Decisions
| Ngày | Quyết định | Người chốt |
| --- | --- | --- |

## Progress log
- YYYY-MM-DD: ...
