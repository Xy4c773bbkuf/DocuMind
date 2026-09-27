from alembic import op
import sqlalchemy as sa

revision = "002_document_insights"
down_revision = "001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("documents", sa.Column("file_type", sa.String(20), server_default="txt"))
    op.add_column("documents", sa.Column("reading_time_minutes", sa.Integer(), server_default="1"))
    op.add_column("tags", sa.Column("owner_id", sa.Integer(), nullable=True))
    with op.batch_alter_table("tags") as batch:
        batch.create_foreign_key("fk_tags_owner_id", "users", ["owner_id"], ["id"])

def downgrade():
    with op.batch_alter_table("tags") as batch:
        batch.drop_constraint("fk_tags_owner_id", type_="foreignkey")
    op.drop_column("tags", "owner_id")
    op.drop_column("documents", "reading_time_minutes")
    op.drop_column("documents", "file_type")
