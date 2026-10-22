from sqlalchemy import select, func
from app.database import SessionLocal
from app.models import Product, ProductVariant, Review, Interaction, Order
from app.services.demo_data import expand_demo

def test_storefront_counts_and_style_filters(client):
    summary=client.get('/api/storefront').json()
    catalog=client.get('/api/products').json()
    assert summary['total']==catalog['total']
    assert sum(summary['genders'].values())==summary['total']
    assert all(c['count']>0 for c in summary['categories'])
    data=client.get('/api/products',params={'style':'Nữ tính','sale':'true'}).json()
    assert data['items']
    assert all(p['style']=='Nữ tính' and p['original_price']>p['price'] for p in data['items'])

def test_editorial_pages_have_real_content(client):
    articles=client.get('/api/journal').json()
    assert len(articles)==3
    for article in articles:
        result=client.get('/api/journal/'+article['slug'])
        assert result.status_code==200
        assert len(result.json()['sections'])>=4
        assert client.get('/cam-hung/'+article['slug']).status_code==200
    assert client.get('/api/journal/missing').status_code==404

def test_expansion_preserves_existing_stock_and_is_idempotent():
    with SessionLocal() as db:
        variant=db.scalar(select(ProductVariant).where(ProductVariant.product_id==1).limit(1))
        original_stock=variant.stock
        original_products=db.scalar(select(func.count(Product.id)))
        result=expand_demo(db)
        assert result['added']==240
        assert db.scalar(select(func.count(Product.id)))==original_products+240
        db.refresh(variant)
        assert variant.stock==original_stock
        counts=[db.scalar(select(func.count()).select_from(model)) for model in [Product,Review,Interaction,Order]]
        again=expand_demo(db)
        assert again['added']==0
        assert counts==[db.scalar(select(func.count()).select_from(model)) for model in [Product,Review,Interaction,Order]]
        thumbnails=list(db.scalars(select(Product.thumbnail).where(Product.thumbnail.like('%/catalog-%'))))
        assert len(thumbnails)==len(set(thumbnails))==240
        assert db.scalar(select(func.count(Review.id)).where(Review.simulated.is_(True)))>=250

def test_sample_reviews_are_marked_in_api(client):
    reviews=client.get('/api/products/1/reviews').json()
    assert reviews and any(r['simulated'] for r in reviews)
    product=client.get('/api/products/1').json()
    assert product['simulated_review_count']>=1
