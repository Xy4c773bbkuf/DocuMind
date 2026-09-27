from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("email", sa.String(255), nullable=False, unique=True), sa.Column("hashed_password", sa.String(255), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime()))
    op.create_table("documents", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("title", sa.String(300), nullable=False), sa.Column("filename", sa.String(300), nullable=False), sa.Column("mime_type", sa.String(120)), sa.Column("content", sa.Text()), sa.Column("summary", sa.Text()), sa.Column("word_count", sa.Integer()), sa.Column("status", sa.String(30)), sa.Column("created_at", sa.DateTime()), sa.Column("updated_at", sa.DateTime()))
    op.create_table("tags", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(80), nullable=False))
    op.create_table("keywords", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id"), nullable=False), sa.Column("term", sa.String(120)), sa.Column("score", sa.Integer()))
    op.create_table("document_tags", sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id"), primary_key=True), sa.Column("tag_id", sa.Integer(), sa.ForeignKey("tags.id"), primary_key=True))

def downgrade():
    for table in ("document_tags", "keywords", "tags", "documents", "users"):
        op.drop_table(table)
