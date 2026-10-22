"""Idempotent CSV importer. Image paths must be existing local static images/uploads."""
import sys
import csv
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import select
from app.database import Base, engine, SessionLocal
from app.models import Category, Brand, Product, ProductVariant, ProductImage
from app.schemas import ProductIn
from app.routes.admin import validate_product

def import_csv(path):
    Base.metadata.create_all(engine)
    added, skipped, errors = 0, 0, []
    with SessionLocal() as db, open(path, encoding='utf-8-sig', newline='') as source:
        for number, row in enumerate(csv.DictReader(source), start=2):
            try:
                if db.scalar(select(Product.id).where(Product.name == row['name'])):
                    skipped += 1; continue
                refs = {}
                for key, model in [('category', Category), ('brand', Brand)]:
                    item = db.scalar(select(model).where(model.name == row[key]))
                    if not item:
                        item = model(name=row[key]); db.add(item); db.flush()
                    refs[key + '_id'] = item.id
                values = {key: value for key, value in row.items() if key not in ['category', 'brand'] and value != ''}
                if 'sizes' in values: values['sizes'] = [s.strip() for s in values['sizes'].split('|')]
                payload = ProductIn(**values, **refs)
                validate_product(payload, db)
                product = Product(**payload.model_dump(exclude={'stock', 'sizes'}))
                product.variants = [ProductVariant(size=s, color=payload.color, stock=payload.stock) for s in payload.sizes]
                product.images = [ProductImage(image_path=payload.thumbnail, is_primary=True)]
                db.add(product); db.commit(); added += 1
            except Exception as exc:
                db.rollback(); errors.append({'line': number, 'error': str(exc)})
    return {'added': added, 'skipped': skipped, 'errors': errors}

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) != 2: raise SystemExit('Usage: python scripts/import_dataset.py data/raw/products.csv')
    print(json.dumps(import_csv(sys.argv[1]), ensure_ascii=False, indent=2))
