# Hướng dẫn làm việc với AI trong repo VELASTYLE

Dành cho người phát triển dùng Claude Code hoặc Codex/ChatGPT trên repo này.

## 1. Bắt đầu phiên mới

- **Mở đúng thư mục**: gốc repo là thư mục chứa `.git`, `CLAUDE.md`, `app/` (`...\deadlineMyy\deadlineMyy`). Mở thư mục cha thì Claude Code **không** nạp `.claude/settings.json`, skills, hooks.
- Claude Code tự nạp `CLAUDE.md` (kèm `AGENTS.md`) và `.claude/rules/`. Kiểm tra bằng `/memory`; xem skills bằng `/skills` (hoặc gõ `/`); xem hooks bằng `/hooks`.
- Lần đầu mở, Claude Code có thể hỏi có tin cậy hooks của dự án không — đọc `.claude/hooks/*.py` rồi chấp nhận.
- Codex: tự đọc `AGENTS.md`. ChatGPT thông thường: dán/đính kèm `AGENTS.md` và rule liên quan vào hội thoại.

## 2. Các kiểu yêu cầu

| Muốn | Gõ |
| --- | --- |
| Phân tích yêu cầu | `/requirements-analysis Thêm mã giảm giá khi thanh toán` hoặc mô tả tự nhiên "phân tích giúp…" |
| Lập kế hoạch | `/feature-planning mã giảm giá` |
| Trọn quy trình có cổng duyệt | `/feature-workflow Thêm mã giảm giá khi thanh toán` |
| Triển khai plan đã duyệt | `/feature-implementation .claude/plans/2026-10-25-ma-giam-gia.md` |
| Viết/chạy test | `/testing` |
| Review thay đổi hiện tại | `/change-review` |
| Cập nhật tài liệu | `/documentation` |

Claude có thể tự chọn skill theo mô tả, nhưng không đảm bảo lần nào cũng chọn đúng — gọi tên skill khi cần chắc chắn.

## 3. Duyệt plan

Plan mới luôn `status: draft`. Đọc file trong `.claude/plans/`, sửa nếu cần, rồi trả lời rõ "duyệt plan" — AI mới đổi sang `approved` và triển khai.

## 4. Hooks

| Hook | Sự kiện | Làm gì | Không làm gì |
| --- | --- | --- | --- |
| `guard_commands.py` | PreToolUse Bash/PowerShell | **deny**: xóa data/ảnh/artifacts/.git/.venv, xóa đệ quy phạm vi rộng, `git reset --hard`, `push --force`, `clean -f`, `checkout -- .`, SQL DROP/DELETE. **ask**: script ghi dữ liệu, QA ghi artifacts, `start.ps1`, `git push`, `pip install` | Không sửa file, không chạy gì khác |
| `check_syntax.py` | PostToolUse Edit/Write | Kiểm tra cú pháp `.py`/`.js`/`.json` vừa sửa; lỗi → báo lại cho Claude (exit 2) | Không format, không chạy test, không tạo `.pyc` |

Yêu cầu: `python` (3.x) trên PATH; `node` cho kiểm tra JS (thiếu thì bỏ qua). Lệnh hook dùng biến `$CLAUDE_PROJECT_DIR`.

Guard dựa trên regex nên **không phải ranh giới bảo mật tuyệt đối** — lệnh viết vòng vèo có thể lọt; rule trong `AGENTS.md` vẫn áp dụng.

### Tắt / khôi phục

- Tạm thời: `$env:VELA_HOOKS_OFF='1'` trước khi chạy `claude` (cả hai hook thoát ngay).
- Theo máy: tạo `.claude/settings.local.json` (đã gitignore) với `{"disableAllHooks": true}`.
- Khôi phục: xóa biến / file trên. Cấu hình gốc nằm trong `.claude/settings.json` (có trong git).

### Thử hook thủ công

```bash
echo '{"tool_input":{"command":"git reset --hard"}}' | python .claude/hooks/guard_commands.py
echo '{"tool_input":{"file_path":"app/main.py"}}' | python .claude/hooks/check_syntax.py; echo $?
```

## 5. Mở rộng hệ thống

**Thêm rule**: sửa file trong `.claude/rules/` (rule chỉ áp dụng cho một số file → thêm frontmatter `paths:`). Nếu là nguyên tắc cốt lõi, thêm một dòng tóm tắt ở `AGENTS.md` §6. Không viết quy tắc ở nơi khác.

**Thêm skill**: tạo `.claude/skills/<tên>/SKILL.md` với frontmatter `name`, `description` (nói rõ *làm gì* và *khi nào dùng*), tùy chọn `allowed-tools`, `argument-hint`, `disable-model-invocation: true` (chỉ gọi tay). Tránh trùng tên lệnh built-in (`/plan`, `/review`, `/init`, `/code-review`…). Thêm vào bảng skill trong `CLAUDE.md`.

**Thêm hook**: script stdlib trong `.claude/hooks/`, khai báo trong `.claude/settings.json`. Nguyên tắc: nhanh (< vài giây), không sửa file, không chạy toàn bộ test, không deploy, không xóa dữ liệu, có `VELA_HOOKS_OFF`, thử bằng payload mẫu trước khi bật. Workflow nhiều bước → viết skill điều phối (như `feature-workflow`), không nhồi vào hook.

**Bắt buộc thực thi thật sự** (không chỉ hướng dẫn AI): dùng `permissions.deny` trong settings, hook, hoặc CI. Repo hiện chưa có CI — gợi ý: GitHub Actions chạy `pytest -q` và `node --check` trên mỗi push.

## 6. File nào được nạp tự động

| Tự động (Claude Code) | Chỉ là tài liệu theo quy ước |
| --- | --- |
| `CLAUDE.md` (+ `@AGENTS.md`), `.claude/rules/*.md`, `.claude/skills/*/SKILL.md` (mô tả), `.claude/settings.json` (permissions + hooks) | `.claude/plans/`, `.claude/reference/`, `docs/`, `README.md` |
| Codex: `AGENTS.md` | Mọi thứ trong `.claude/` |
