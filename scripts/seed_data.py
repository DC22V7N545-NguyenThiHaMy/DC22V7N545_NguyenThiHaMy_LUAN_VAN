import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import Base, engine, SessionLocal
from app.services.seed import seed
from app.services.demo_data import expand_demo
from app.services.migrations import migrate

if __name__ == '__main__':
    Base.metadata.create_all(engine)
    migrate(engine)
    with SessionLocal() as db:
        print(seed(db))
        print(expand_demo(db))
