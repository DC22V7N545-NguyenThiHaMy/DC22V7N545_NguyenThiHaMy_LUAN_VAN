from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text
from app.config import ROOT
from app.database import Base
from app.services.migrations import upgrade_database

def head():
    config = Config(str(ROOT / 'alembic.ini'))
    config.set_main_option('script_location', str(ROOT / 'db_migrations'))
    return ScriptDirectory.from_config(config).get_current_head()

def version(engine):
    with engine.connect() as connection:
        return connection.execute(text('SELECT version_num FROM alembic_version')).scalar()

def test_fresh_database_is_created_and_stamped(tmp_path):
    engine = create_engine('sqlite:///' + (tmp_path / 'fresh.db').as_posix())
    upgrade_database(engine)
    assert set(Base.metadata.tables) <= set(inspect(engine).get_table_names())
    assert version(engine) == head()

def test_upgrade_is_idempotent(tmp_path):
    engine = create_engine('sqlite:///' + (tmp_path / 'again.db').as_posix())
    upgrade_database(engine)
    upgrade_database(engine)
    assert version(engine) == head()

def test_existing_database_without_alembic_is_adopted(tmp_path):
    engine = create_engine('sqlite:///' + (tmp_path / 'legacy.db').as_posix())
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text('INSERT INTO categories (name, description) VALUES (:n, :d)'), {'n': 'Legacy', 'd': ''})
    upgrade_database(engine)
    assert version(engine) == head()
    with engine.connect() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM categories WHERE name = 'Legacy'")).scalar() == 1
