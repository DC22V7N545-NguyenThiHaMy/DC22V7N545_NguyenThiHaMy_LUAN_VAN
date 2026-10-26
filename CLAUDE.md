# CLAUDE.md — VELASTYLE

Quy tắc dùng chung cho mọi agent nằm trong AGENTS.md và được import nguyên văn bên dưới.
File này chỉ bổ sung phần riêng của Claude Code.

@AGENTS.md

## Riêng cho Claude Code

### Được nạp tự động

| Thành phần | Vị trí | Cơ chế |
| --- | --- | --- |
| File này + AGENTS.md | `CLAUDE.md` (`@AGENTS.md` import) | Nạp khi mở phiên tại gốc repo |
| Rules | `.claude/rules/*.md` | Nạp tự động (rule có `paths:` chỉ nạp khi làm việc với file khớp). Bản Claude Code cũ không hỗ trợ thư mục này → vẫn có link ở §6 |
| Skills | `.claude/skills/*/SKILL.md` | Claude chọn theo `description`; gọi tay bằng `/<tên-skill>` |
| Hooks + permissions | `.claude/settings.json` | Harness thực thi, không phụ thuộc Claude nhớ |

`.claude/plans/` và `.claude/reference/` là **quy ước của dự án**, không được nạp tự động — phải đọc chủ động.

### Skills

| Skill | Gọi | Dùng khi |
| --- | --- | --- |
| `requirements-analysis` | tự động / `/requirements-analysis` | Yêu cầu mới, mơ hồ, cần user story + acceptance criteria |
| `feature-planning` | tự động / `/feature-planning` | Cần plan trước khi code (feature, refactor, đổi schema/API) |
| `feature-implementation` | tự động / `/feature-implementation` | Triển khai theo plan đã duyệt hoặc sửa nhỏ rõ ràng |
| `testing` | tự động / `/testing` | Viết/chạy test, xác minh thay đổi |
| `change-review` | tự động / `/change-review` | Review diff theo chuẩn VELASTYLE (bảo mật, kiến trúc, trùng lặp) |
| `documentation` | tự động / `/documentation` | Đồng bộ README/docs/reference với code |
| `feature-workflow` | **chỉ gọi tay** `/feature-workflow <mô tả>` | Chạy trọn quy trình có cổng duyệt plan |

Tên skill được chọn để không trùng lệnh built-in (`/plan`, `/review`, `/init`, `code-review`).

### Hooks đang bật

- **PreToolUse (Bash/PowerShell)** → `.claude/hooks/guard_commands.py`: chặn lệnh phá hủy (xóa data/ảnh/artifacts, `git reset --hard`, `git push --force`, `git clean`, SQL `DROP/DELETE`), hỏi lại trước script có tác dụng phụ (§5), `git push`, `pip install`.
- **PostToolUse (Edit/Write)** → `.claude/hooks/check_syntax.py`: kiểm tra cú pháp file vừa sửa (`.py` compile, `.js` qua `node --check`, `.json` parse). Không format, không chạy test.
- **permissions.deny**: không đọc/sửa `.env`, không sửa file DB.

Tắt tạm hooks: đặt biến môi trường `VELA_HOOKS_OFF=1` trước khi mở Claude Code, hoặc `"disableAllHooks": true` trong `.claude/settings.local.json`. Chi tiết: [docs/guides/ai-workflow.md](docs/guides/ai-workflow.md).

### Thói quen làm việc

- Đầu phiên làm feature: xem `.claude/plans/` có plan `approved`/`in-progress` liên quan không.
- Dùng `.venv\Scripts\python.exe`, không dùng Python hệ thống, khi chạy code dự án.
- Trả lời người dùng bằng tiếng Việt trừ khi được yêu cầu khác.
