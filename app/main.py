import logging
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import update
from app.config import ROOT
from app.database import Base, engine, SessionLocal
from app.models import ModelRun, now
from app.routes import api, admin, storefront
from app.services.migrations import migrate

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    migrate(engine)
    with SessionLocal() as db:
        db.execute(update(ModelRun).where(ModelRun.status == 'running').values(status='failed', message='Tác vụ bị gián đoạn khi máy chủ khởi động lại.', finished_at=now()))
        db.commit()
    yield

app = FastAPI(title='VELASTYLE • API thời trang & gợi ý', version='1.0.0', lifespan=lifespan)

@app.middleware('http')
async def security_headers(request: Request, call_next):
    if request.method not in ['GET', 'HEAD', 'OPTIONS']:
        origin = request.headers.get('origin')
        fetch_site = request.headers.get('sec-fetch-site')
        if (origin and urlparse(origin).netloc != request.headers.get('host')) or fetch_site == 'cross-site':
            return JSONResponse({'detail': 'Yêu cầu phải đến từ chính website.'}, status_code=403)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

app.include_router(api.router)
app.include_router(admin.router)
app.include_router(storefront.router)
app.mount('/static', StaticFiles(directory=ROOT / 'app/static'), name='static')
templates = Jinja2Templates(directory=ROOT / 'app/templates')

@app.get('/')
@app.get('/san-pham')
@app.get('/san-pham/{product_id}')
@app.get('/danh-rieng-cho-ban')
@app.get('/yeu-thich')
@app.get('/gio-hang')
@app.get('/thanh-toan')
@app.get('/tai-khoan')
@app.get('/don-hang')
@app.get('/tim-bang-anh')
@app.get('/quan-tri')
@app.get('/quan-tri/{section}')
@app.get('/thong-tin/{slug}')
@app.get('/cam-hung')
@app.get('/cam-hung/{slug}')
def page(request: Request):
    return templates.TemplateResponse(request=request, name='base.html', context={})
