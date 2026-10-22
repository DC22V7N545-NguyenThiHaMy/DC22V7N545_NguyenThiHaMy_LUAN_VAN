import os
import sys
from pathlib import Path
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_test_dir = tempfile.TemporaryDirectory(prefix='velastyle-tests-')
os.environ['DATABASE_URL'] = 'sqlite:///' + (Path(_test_dir.name) / 'test.db').as_posix()

import pytest
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.main import app
from app.services.seed import seed
from app.services.auth import _attempts

@pytest.fixture(scope='session', autouse=True)
def seed_database():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield
    engine.dispose()
    _test_dir.cleanup()

@pytest.fixture
def client():
    _attempts.clear()
    with TestClient(app) as client:
        yield client

@pytest.fixture
def user(client):
    result = client.post('/api/auth/login', json={'email':'linh@velastyle.vn', 'password':'Vela@12345'})
    assert result.status_code == 200
    return client

@pytest.fixture
def admin(client):
    result = client.post('/api/auth/login', json={'email':'admin@velastyle.vn', 'password':'Vela@12345'})
    assert result.status_code == 200
    return client
