import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app.ai.clip_encoder import generate_embeddings
from app.repositories.catalog import active_products

if __name__ == '__main__':
    with SessionLocal() as db:
        print(generate_embeddings(db, active_products(db)))
