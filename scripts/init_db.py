import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import engine
from app.services.migrations import upgrade_database

if __name__ == '__main__':
    upgrade_database(engine)
    print('SQLite tables initialized.')
