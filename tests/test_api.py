from sqlalchemy import select, func
from app.database import SessionLocal
from app.models import Interaction, ProductVariant, ModelRun

def test_register_login_session_and_logout(client):
    from tests.test_auth import register_verified
    payload = register_verified(client)
    email = payload['email']
    response = client.post('/api/auth/login', json={'identifier':email, 'password':payload['password']})
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'password_hash' not in response.json()
    assert client.get('/api/auth/me').json()['email'] == email
    assert client.post('/api/auth/register', json=payload).status_code == 409
    assert client.post('/api/auth/logout').status_code == 200
    assert client.get('/api/auth/me').json() is None
    assert client.post('/api/auth/login', json={'email':email, 'password':'wrong'}).status_code == 401
    assert client.post('/api/auth/login', json={'email':email, 'password':payload['password']}).status_code == 200

def test_invalid_registration(client):
    assert client.post('/api/auth/register', json={'full_name':'a','email':'bad','password':'123'}).status_code == 422

def test_authorization_and_csrf(client):
    assert client.get('/api/admin/dashboard').status_code == 401
    assert client.post('/api/auth/login', json={'email':'linh@velastyle.vn','password':'Vela@12345'}).status_code == 200
    assert client.get('/api/admin/dashboard').status_code == 403
    assert client.post('/api/interactions', json={'product_id':1}, headers={'Origin':'https://evil.invalid'}).status_code == 403
    assert client.post('/api/interactions', json={'product_id':1,'interaction_type':'purchase'}).status_code == 422

def test_filters_and_sorting(client):
    response = client.get('/api/products?gender=Nữ&max_price=1000000&sort=price-asc')
    assert response.status_code == 200
    items = response.json()['items']
    assert items and all(p['gender']=='Nữ' and p['price']<=1000000 for p in items)
    assert [p['price'] for p in items] == sorted(p['price'] for p in items)
    assert client.get('/api/products?q=Élise').json()['total'] == 1
    assert client.get('/api/products?q=%25').json()['total'] == 0

def test_view_debounce_and_favorites(user):
    with SessionLocal() as db:
        before = db.scalar(select(func.count(Interaction.id)).where(Interaction.user_id==2, Interaction.product_id==1, Interaction.interaction_type=='view'))
    assert user.get('/api/products/1').status_code == 200
    assert user.get('/api/products/1').status_code == 200
    with SessionLocal() as db:
        after = db.scalar(select(func.count(Interaction.id)).where(Interaction.user_id==2, Interaction.product_id==1, Interaction.interaction_type=='view'))
    assert after-before == 1
    added = user.post('/api/favorites/1').json()['favorite']
    assert added
    assert any(p['id']==1 for p in user.get('/api/favorites').json())
    assert not user.post('/api/favorites/1').json()['favorite']

def test_cart_checkout_and_stock(user):
    p = user.get('/api/products/1').json()
    v = p['variants'][0]
    for item in user.get('/api/cart').json()['items']:
        user.delete('/api/cart/'+str(item['id']))
    assert user.post('/api/cart', json={'variant_id':v['id'],'quantity':1}).status_code == 201
    cart = user.get('/api/cart').json()
    item_id = cart['items'][0]['id']
    assert user.patch(f'/api/cart/{item_id}', json={'quantity':2}).status_code == 200
    result = user.post('/api/orders', json={'full_name':'Người kiểm thử','phone':'0901234567','address':'Địa chỉ mô phỏng, Thành phố Hồ Chí Minh'})
    assert result.status_code == 201, result.text
    assert result.json()['total'] == p['price']*2
    assert user.get('/api/cart').json()['count'] == 0
    assert user.get('/api/products/1').json()['variants'][0]['stock'] == v['stock']-2
    assert user.post('/api/orders', json={'full_name':'Người kiểm thử','phone':'0901234567','address':'Địa chỉ mô phỏng'}).status_code == 400
    assert len(user.get('/api/orders').json()) >= 1
    assert user.post('/api/cart', json={'variant_id':v['id'],'quantity':20}).status_code == 409

def test_cart_isolation(client):
    from tests.test_auth import register_verified
    register_verified(client, full_name='Khách khác')
    assert client.patch('/api/cart/999999', json={'quantity':1}).status_code == 404
    assert client.delete('/api/cart/999999').status_code == 404

def test_product_crud_and_admin_metrics(admin):
    payload={'name':'Thiết kế kiểm thử','description':'Đầm màu đỏ dành cho kiểm thử CRUD.', 'price':450000, 'category_id':1,'brand_id':1,'thumbnail':'/static/images/dress-linen.jpg','stock':3,'sizes':['S','M']}
    result=admin.post('/api/admin/products', json=payload)
    assert result.status_code==201, result.text
    pid=result.json()['id']
    payload['price']=550000
    assert admin.put(f'/api/admin/products/{pid}',json=payload).json()['price']==550000
    assert admin.get('/api/admin/dashboard').json()['products']>=18
    assert admin.delete(f'/api/admin/products/{pid}').status_code==200
    assert admin.get(f'/api/products/{pid}').status_code==404
    payload['thumbnail']='/static/images/../../config.py'
    assert admin.post('/api/admin/products',json=payload).status_code==422

def test_taxonomy_in_use_and_settings(admin):
    assert admin.delete('/api/admin/taxonomy/categories/1').status_code==409
    assert admin.put('/api/admin/ai/settings',json={'alpha':.65}).json()['alpha']==.65
    assert admin.put('/api/admin/ai/settings',json={'alpha':1.5}).status_code==422

def test_recommendations_and_real_similar(user):
    for method in ['collaborative','als','clip','hybrid']:
        response=user.get('/api/recommendations/'+method)
        assert response.status_code==200, response.text
        assert response.json()['items']
        assert response.json()['method']==method
    result=user.get('/api/recommendations/similar/1').json()
    assert all(p['id']!=1 for p in result['items'])
    assert result['status'] in ['clip','category_fallback']

def test_image_validation_and_unready_state(user):
    assert user.post('/api/recommendations/image-search',files={'file':('bad.txt',b'hello','text/plain')}).status_code==415
    assert user.post('/api/recommendations/image-search',files={'file':('bad.png',b'not an image','image/png')}).status_code==422
    assert user.post('/api/recommendations/image-search',files={'file':('huge.jpg',b'x'*(5*1024*1024+1),'image/jpeg')}).status_code==413

def test_routes_and_static_assets(client):
    for path in ['/', '/san-pham','/tai-khoan','/quan-tri','/gio-hang','/tim-bang-anh','/danh-rieng-cho-ban']:
        response=client.get(path)
        assert response.status_code==200
        assert '<html lang="vi">' in response.text
    assert client.get('/static/css/style.css').status_code==200
