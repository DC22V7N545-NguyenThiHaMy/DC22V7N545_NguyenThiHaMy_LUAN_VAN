from alembic import context
from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401  (register tables on Base.metadata)

config = context.config
target_metadata = Base.metadata

def run(connection):
    # render_as_batch: SQLite cannot ALTER most column properties in place.
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    # upgrade_database() passes its own connection; the CLI (alembic upgrade head) opens one here.
    connection = config.attributes.get('connection')
    if connection is not None:
        run(connection)
    else:
        with engine.begin() as connection:
            run(connection)
