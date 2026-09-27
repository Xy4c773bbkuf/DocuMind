from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from .config import settings
from .db import Base, engine
from .routers import auth, documents, tags
from .schemas import UserOut
from .security import current_user


def ensure_local_schema(connection):
    if settings.database_url.startswith("sqlite"):
        columns = {column["name"] for column in inspect(connection).get_columns("documents")}
        if "storage_key" not in columns:
            connection.exec_driver_sql("ALTER TABLE documents ADD COLUMN storage_key VARCHAR(500)")


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_local_schema)
    yield
    await engine.dispose()


app = FastAPI(title="Document Insight Dashboard API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_enabled": settings.ai_enabled}

@app.get("/api/me", response_model=UserOut)
async def current_user_profile(user=Depends(current_user)):
    return user
