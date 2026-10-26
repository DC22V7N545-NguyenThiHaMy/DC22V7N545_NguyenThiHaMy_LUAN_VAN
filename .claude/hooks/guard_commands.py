"""PreToolUse guard for Bash/PowerShell commands run by Claude Code.

Denies destructive commands and asks before scripts with side effects (AGENTS.md §5, §9).
Reads the hook payload from stdin, writes a permission decision as JSON to stdout.
Standard library only. Disable with VELA_HOOKS_OFF=1. Never modifies files.
"""
import json
import os
import re
import sys

PROTECTED = r'(data[\\/]|velastyle\.db|embeddings|static[\\/]images|static[\\/]uploads|artifacts|\.git\b|\.venv)'
DELETE_VERB = r'(^|[;&|(]\s*|\s)(rm|rmdir|del|rd|erase|unlink|Remove-Item|Clear-Content)\s'
BROAD_TARGET = r'\s(/|~|\.|\.\.|\*|[A-Za-z]:\\?|\$HOME|\$env:USERPROFILE)(\s|$|["\'])'

DENY = [
    (DELETE_VERB + r'.*' + PROTECTED, 'Xóa dữ liệu được bảo vệ (DB, embeddings, ảnh, uploads, artifacts, .git, .venv).'),
    (r'(shutil\.rmtree|os\.remove|os\.unlink|\.unlink\()' + r'.*' + PROTECTED, 'Xóa dữ liệu được bảo vệ qua Python.'),
    (DELETE_VERB + r'.*(-[a-zA-Z]*r[a-zA-Z]*|-Recurse|/s)\b.*' + BROAD_TARGET, 'Xóa đệ quy trên phạm vi rộng.'),
    (r'\bgit\s+reset\s+--hard\b', 'git reset --hard làm mất thay đổi chưa commit.'),
    (r'\bgit\s+push\b.*(\s-f\b|--force)', 'git push --force viết lại lịch sử remote.'),
    (r'\bgit\s+clean\s+-[a-zA-Z]*f', 'git clean xóa file chưa track.'),
    (r'\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)', 'Hủy toàn bộ thay đổi trong working tree.'),
    (r'\bgit\s+(filter-branch|filter-repo)\b', 'Viết lại lịch sử git.'),
    (r'(sqlite3|python|execute).*\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE)\b', 'Lệnh SQL phá hủy dữ liệu.'),
]

ASK = [
    (r'(seed_data|expand_demo|import_dataset)\.py', 'Script ghi vào data/velastyle.db đang dùng.'),
    (r'(generate_embeddings|train_cf|evaluate_models)\.py', 'Script ghi embeddings/kết quả mô hình, tốn CPU, có thể tải model CLIP.'),
    (r'(prepare_fashion_dataset|download_images)\.py', 'Script tải từ Internet và ghi đè ảnh trong app/static/images.'),
    (r'(browser_qa|admin_qa|upgrade_qa|atelier_qa|final_snapshots)\.py', 'Script QA ghi đè ảnh chụp trong artifacts/ (có commit).'),
    (r'start\.ps1', 'start.ps1 chạy seed vào DB thật và khởi động server.'),
    (r'\bgit\s+push\b', 'Đẩy code lên remote.'),
    (r'\bpip\s+(install|uninstall)\b', 'Thay đổi dependency trong môi trường.'),
]


def decide(command):
    for pattern, reason in DENY:
        if re.search(pattern, command, re.IGNORECASE):
            return 'deny', reason
    for pattern, reason in ASK:
        if re.search(pattern, command, re.IGNORECASE):
            return 'ask', reason
    return None, None


def main():
    if os.environ.get('VELA_HOOKS_OFF') == '1':
        return 0
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    command = (payload.get('tool_input') or {}).get('command') or ''
    decision, reason = decide(command)
    if decision:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': decision,
                                                 'permissionDecisionReason': f'[VELASTYLE guard] {reason}'}}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
