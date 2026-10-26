---
name: feature-workflow
description: Điều phối toàn bộ quy trình phát triển một feature VELASTYLE - phân tích, plan, cổng duyệt, triển khai, test, review, cập nhật docs, báo cáo. Chỉ chạy khi người dùng gọi /feature-workflow.
argument-hint: "<mô tả feature>"
disable-model-invocation: true
---

# Feature Workflow (điều phối)

Skill này là **trình điều phối workflow** chạy tuần tự các skill khác. Nó không phải hook; hooks chỉ phản ứng với sự kiện công cụ.

Yêu cầu: `$ARGUMENTS`

## Luồng

```text
1 Phân tích → 2 Tra cứu + rules → 3 Plan → [CỔNG DUYỆT] → 4 Triển khai → 5 Test → 6 Review → 7 Docs → 8 Báo cáo
```

1. **Phân tích** — theo `.claude/skills/requirements-analysis/SKILL.md`. Nếu có câu hỏi mở ảnh hưởng thiết kế → hỏi người dùng, dừng tại đây.
2. **Tra cứu + rules** — `.claude/reference/README.md`, các rule liên quan, `docs/architecture/overview.md`.
3. **Plan** — theo `.claude/skills/feature-planning/SKILL.md`, lưu `.claude/plans/YYYY-MM-DD-<slug>.md` (`status: draft`).
4. **CỔNG DUYỆT** — trình bày tóm tắt plan, các quyết định cần chốt. **Dừng và chờ người dùng xác nhận.** Chỉ khi người dùng đồng ý rõ ràng mới đổi `status: approved` và tiếp tục.
   - Việc nhỏ (theo AGENTS.md §7): có thể đề xuất bỏ qua plan file, nhưng vẫn hỏi một câu xác nhận phạm vi.
5. **Triển khai** — theo `.claude/skills/feature-implementation/SKILL.md`.
6. **Test** — theo `.claude/skills/testing/SKILL.md`. Fail mới → quay lại bước 5 (tối đa 3 vòng, sau đó báo người dùng).
7. **Review** — theo `.claude/skills/change-review/SKILL.md` trên diff vừa tạo; sửa mục "Nghiêm trọng" trong phạm vi plan.
8. **Docs** — theo `.claude/skills/documentation/SKILL.md` nếu hành vi/kiến trúc đổi.
9. **Báo cáo cuối** — đặt plan `status: done` và trả lời:

```markdown
## Kết quả: <feature>
- Plan: .claude/plans/<file>
- File đã sửa: ...
- Test: <lệnh> → <kết quả thật>
- Review: <số phát hiện đã xử lý / còn lại>
- Docs: ...
- Chưa kiểm chứng: ...
```

## Không được

- Bỏ qua cổng duyệt với feature/refactor lớn.
- Commit, push, chạy script ghi dữ liệu (AGENTS.md §5) khi chưa được yêu cầu.
