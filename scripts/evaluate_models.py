import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app.ai.evaluation import evaluate

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    with SessionLocal() as db:
        print(json.dumps(evaluate(db, int(sys.argv[1]) if len(sys.argv) > 1 else 10), ensure_ascii=False, indent=2))
