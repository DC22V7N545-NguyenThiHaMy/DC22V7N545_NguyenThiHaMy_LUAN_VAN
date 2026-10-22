import csv
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app.repositories.catalog import active_products
from app.config import ROOT

if __name__=='__main__':
    target=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'data/raw/products.csv'
    columns=['name','description','price','gender','color','material','style','thumbnail','category','brand','clip_text']
    with SessionLocal() as db, target.open('w',encoding='utf-8-sig',newline='') as output:
        writer=csv.DictWriter(output,fieldnames=columns)
        writer.writeheader()
        for p in active_products(db):
            values={key:getattr(p,key) for key in columns if key not in ['category','brand']}
            values.update(category=p.category.name,brand=p.brand.name)
            writer.writerow(values)
    print('Exported catalog CSV.')
