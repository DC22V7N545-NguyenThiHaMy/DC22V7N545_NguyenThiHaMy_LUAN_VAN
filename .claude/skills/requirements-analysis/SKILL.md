---
name: requirements-analysis
description: Phân tích yêu cầu tính năng cho VELASTYLE thành user stories, acceptance criteria, module bị ảnh hưởng và câu hỏi còn mở. Dùng khi người dùng đưa yêu cầu mới, mơ hồ, hoặc hỏi "phân tích", "cần làm gì để...", trước khi lập plan. Chỉ đọc, không sửa code.
argument-hint: "<mô tả yêu cầu>"
allowed-tools: Read, Grep, Glob
---

# Requirements Analysis

## Kích hoạt

Yêu cầu tính năng/thay đổi hành vi chưa có acceptance criteria rõ; hoặc gọi `/requirements-analysis <yêu cầu>`.
Bỏ qua với sửa lỗi nhỏ đã rõ nguyên nhân.

## Tài liệu tham khảo

- `AGENTS.md` §1 (mục tiêu, phạm vi mô phỏng), §6 (quy tắc)
- `docs/architecture/overview.md` (module, API, schema)
- `.claude/reference/glossary.md` (thuật ngữ, giá trị enum tiếng Việt)
- `README.md` mục "Chức năng đã triển khai" — tránh đề xuất lại thứ đã có

## Các bước

1. Diễn đạt lại yêu cầu bằng 1–2 câu; nêu mục tiêu nghiệp vụ (người dùng nào, lợi ích gì).
2. Tìm trong code những gì đã có liên quan (Grep endpoint, model, hàm JS). Ghi rõ đường dẫn `file:dòng`.
3. Viết user stories: `Là <vai trò: khách / khách đã đăng nhập / quản trị>, tôi muốn <hành động> để <lợi ích>`.
4. Acceptance criteria dạng Given/When/Then, kiểm chứng được bằng test hoặc thao tác UI.
5. Xác định module bị ảnh hưởng: route, model/migration, ai/, JS/CSS, test, docs.
6. Phát hiện thiếu/mâu thuẫn: xung đột với rule (bảo mật, dữ liệu mô phỏng, không thanh toán thật), dữ liệu chưa có, quyết định UX chưa rõ.
7. Phân loại độ lớn: nhỏ / feature / refactor lớn / nguy hiểm (theo AGENTS.md §7) → đề xuất bước tiếp theo.

## Kết quả

```markdown
## Phân tích: <tên>
**Mục tiêu:** ...
**Đã có trong code:** ... (file:dòng)
**User stories:** ...
**Acceptance criteria:** ...
**Module ảnh hưởng:** ...
**Câu hỏi mở / mâu thuẫn:** ...
**Độ lớn & bước tiếp:** ... (vd: cần plan → /feature-planning)
```

Phân biệt rõ **đã xác minh** (có file:dòng) và **giả định**.

## Kiểm tra kết quả

- Mỗi acceptance criterion kiểm chứng được.
- Không có đề xuất trùng tính năng đã có.
- Câu hỏi mở được liệt kê thay vì tự quyết.
