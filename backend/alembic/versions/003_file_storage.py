from alembic import op
import sqlalchemy as sa


revision = "003_file_storage"
down_revision = "002_document_insights"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("documents", sa.Column("storage_key", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("documents", "storage_key")