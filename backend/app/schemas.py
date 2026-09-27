from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class KeywordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    term: str
    score: int


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    filename: str
    storage_key: str | None = None
    mime_type: str
    file_type: str
    content: str
    summary: str
    word_count: int
    reading_time_minutes: int
    status: str
    created_at: datetime
    updated_at: datetime
    tags: list[TagOut] = []
    keywords: list[KeywordOut] = []


class DocumentList(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    page_size: int

class DashboardStats(BaseModel):
    documents: int
    words: int
    reading_minutes: int
    themes: int

class AskResponse(BaseModel):
    answer: str
    ai_enabled: bool

class SummaryResponse(BaseModel):
    summary: str
    ai_enabled: bool
