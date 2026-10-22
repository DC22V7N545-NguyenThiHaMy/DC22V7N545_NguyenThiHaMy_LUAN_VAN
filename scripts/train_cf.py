import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Interaction
from app.ai.collaborative_filtering import CollaborativeFiltering
from app.repositories.catalog import active_products
from app.config import ROOT

if __name__ == '__main__':
    with SessionLocal() as db:
        model = CollaborativeFiltering().fit(list(db.scalars(select(Interaction))), [p.id for p in active_products(db)])
        np.savez_compressed(ROOT / 'data/embeddings/cf.npz', product_ids=model.product_ids, similarity=model.similarity)
        print({'users': len(model.user_ids), 'products': len(model.product_ids)})
