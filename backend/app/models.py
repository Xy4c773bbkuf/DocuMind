from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

document_tags = Table(
    "document_tags", Base.metadata,
    Column("document_id", ForeignKey("documents.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    documents: Mapped[list["Document"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    filename: Mapped[str] = mapped_column(String(300))
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(120), default="text/plain")
    file_type: Mapped[str] = mapped_column(String(20), default="txt")
    content: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(30), default="ready")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    owner: Mapped[User] = relationship(back_populates="documents")
    tags: Mapped[list["Tag"]] = relationship(secondary=document_tags, back_populates="documents")
    keywords: Mapped[list["Keyword"]] = relationship(cascade="all, delete-orphan", back_populates="document")


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    documents: Mapped[list[Document]] = relationship(secondary=document_tags, back_populates="tags")


class Keyword(Base):
    __tablename__ = "keywords"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    term: Mapped[str] = mapped_column(String(120))
    score: Mapped[int] = mapped_column(Integer, default=1)
    document: Mapped[Document] = relationship(back_populates="keywords")
