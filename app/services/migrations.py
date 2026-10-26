"""Schema upgrades for local SQLite: legacy additive ALTERs (migrate) plus Alembic revisions (upgrade_database)."""
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from app.config import ROOT
from app.database import Base
import app.models  # noqa: F401  (register tables before create_all)

USER_COLUMNS = [
    ('username', 'VARCHAR(30)'),
    ('phone', 'VARCHAR(20)'),
    # Accounts created before email verification existed keep working.
    ('email_verified', 'BOOLEAN NOT NULL DEFAULT 1'),
    ('google_sub', 'VARCHAR(64)'),
]

def migrate(engine):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if 'reviews' in tables:
        columns = {c['name'] for c in inspector.get_columns('reviews')}
        if 'simulated' not in columns:
            with engine.begin() as connection:
                connection.execute(text('ALTER TABLE reviews ADD COLUMN simulated BOOLEAN NOT NULL DEFAULT 0'))
    if 'users' in tables:
        columns = {c['name'] for c in inspector.get_columns('users')}
        with engine.begin() as connection:
            for name, ddl in USER_COLUMNS:
                if name not in columns:
                    connection.execute(text(f'ALTER TABLE users ADD COLUMN {name} {ddl}'))
            # SQLite cannot add UNIQUE columns; unique indexes allow multiple NULLs.
            connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)'))
            connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)'))

def upgrade_database(engine):
    """Create missing tables, apply the legacy ALTERs, then bring Alembic to head.

    A brand-new database already has the latest schema from create_all, so it is only stamped.
    An existing one (even without alembic_version) is upgraded, so new revisions must be idempotent.
    """
    fresh = not inspect(engine).get_table_names()
    Base.metadata.create_all(engine)
    migrate(engine)
    config = Config(str(ROOT / 'alembic.ini'))
    config.set_main_option('script_location', str(ROOT / 'db_migrations'))
    with engine.begin() as connection:
        config.attributes['connection'] = connection
        if fresh:
            command.stamp(config, 'head')
        else:
            command.upgrade(config, 'head')
