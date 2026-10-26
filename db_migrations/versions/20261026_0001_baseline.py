"""Baseline: schema created by Base.metadata.create_all plus the legacy ALTERs in services/migrations.py.

Revision ID: 0001
Revises:
Create Date: 2026-10-26
"""

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Intentionally empty: upgrade_database() already ran create_all + migrate() before Alembic,
    # so existing local databases are simply adopted at this revision.
    pass

def downgrade():
    pass
