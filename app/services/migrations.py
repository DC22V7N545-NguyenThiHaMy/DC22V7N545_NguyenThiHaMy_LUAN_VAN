"""Small additive migrations for existing local SQLite installations."""
from sqlalchemy import inspect, text

def migrate(engine):
    inspector = inspect(engine)
    if 'reviews' in inspector.get_table_names():
        columns = {c['name'] for c in inspector.get_columns('reviews')}
        if 'simulated' not in columns:
            with engine.begin() as connection:
                connection.execute(text('ALTER TABLE reviews ADD COLUMN simulated BOOLEAN NOT NULL DEFAULT 0'))
