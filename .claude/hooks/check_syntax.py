"""PostToolUse syntax check for a file Claude Code just edited.

.py -> compile() (no .pyc written), .js -> node --check (skipped if node is missing), .json -> json parse.
Exit 2 with the error on stderr so Claude sees it and fixes it; never formats or rewrites files.
Standard library only. Disable with VELA_HOOKS_OFF=1.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SKIP_PARTS = {'.venv', 'node_modules', '__pycache__', '.git'}


def check(path):
    suffix = path.suffix.lower()
    if suffix == '.py':
        compile(path.read_text(encoding='utf-8-sig'), str(path), 'exec')
    elif suffix == '.json':
        json.loads(path.read_text(encoding='utf-8-sig'))
    elif suffix == '.js':
        node = shutil.which('node')
        if node:
            result = subprocess.run([node, '--check', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=20)
            if result.returncode:
                raise SyntaxError(result.stderr.strip() or 'node --check failed')


def main():
    if os.environ.get('VELA_HOOKS_OFF') == '1':
        return 0
    sys.stderr.reconfigure(encoding='utf-8')
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    file_path = (payload.get('tool_input') or {}).get('file_path')
    if not file_path:
        return 0
    path = Path(file_path)
    if not path.is_file() or SKIP_PARTS & set(path.parts):
        return 0
    try:
        check(path)
    except (SyntaxError, ValueError, UnicodeDecodeError, subprocess.TimeoutExpired) as exc:
        print(f'[VELASTYLE syntax] {path.name}: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
