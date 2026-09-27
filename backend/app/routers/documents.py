import io
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, Body
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..db import get_db
from ..extractors import ExtractionError, extract_text, file_type, summarize
from ..keywords import extract_keywords
from ..models import Document, Keyword, Tag, User
from ..schemas import AskResponse, DashboardStats, DocumentList, DocumentOut, SummaryResponse, TagOut
from ..config import settings
from ..security import current_user
from ..storage import delete_file, get_file, save_file
from ..ai import generate

router = APIRouter()


def with_relations(stmt):
    return stmt.options(selectinload(Document.tags), selectinload(Document.keywords))


@router.get("", response_model=DocumentList)
async def list_documents(q: str | None = None, tag: str | None = None, file_type_filter: str | None = Query(None, alias="file_type"), sort: str = Query("updated_at", pattern="^(updated_at|created_at|title|word_count)$"), order: str = Query("desc", pattern="^(asc|desc)$"), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    base = select(Document).where(Document.owner_id == user.id)
    if q:
        like = f"%{q}%"
        base = base.where(or_(Document.title.ilike(like), Document.content.ilike(like), Document.summary.ilike(like)))
    if tag:
        base = base.join(Document.tags).where(Tag.name == tag, Tag.owner_id == user.id)
    if file_type_filter:
        base = base.where(Document.file_type == file_type_filter.lower().lstrip("."))
    column = getattr(Document, sort)
    base = base.order_by(column.asc() if order == "asc" else column.desc())
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.scalars(with_relations(base.offset((page - 1) * page_size).limit(page_size)))
    rows = result.unique().all()
    return DocumentList(items=rows, total=total, page=page, page_size=page_size)


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    allowed = {".txt", ".md", ".pdf", ".docx"}
    import os
    filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(415, "Supported formats: TXT, MD, PDF, DOCX")
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "The uploaded file is empty")
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Maximum file size is 10 MB")
    try:
        text = extract_text(filename, raw)
    except ExtractionError as exc:
        raise HTTPException(422, str(exc))
    if not text.strip():
        raise HTTPException(422, "The file contains no readable text")
    title = os.path.splitext(filename)[0].strip() or "Untitled document"
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            metadata_title = (PdfReader(io.BytesIO(raw)).metadata or {}).get("/Title")
            if metadata_title and str(metadata_title).strip():
                title = str(metadata_title).strip()
        except Exception:
            pass
    if title == os.path.splitext(filename)[0].strip():
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
        if first_line and len(first_line) <= 300:
            title = first_line.lstrip("#").strip() or title
    words = len(text.split())
    summary = summarize(text)
    ai_summary = await generate(f"Summarize this document in 2-3 concise sentences. Return only the summary.\n\n{text[:30000]}")
    storage_key = save_file(user.id, filename, raw)
    doc = Document(owner_id=user.id, title=title[:300], filename=filename[:300], storage_key=storage_key, file_type=file_type(filename), mime_type=file.content_type or "application/octet-stream", content=text, summary=ai_summary or summary, word_count=words, reading_time_minutes=max(1, (words + 199) // 200))
    doc.keywords = [Keyword(term=term, score=score) for term, score in extract_keywords(text)]
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return await db.scalar(with_relations(select(Document).where(Document.id == doc.id)))

@router.get("/search", response_model=DocumentList)
async def search_documents(q: str = Query(..., min_length=1), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return await list_documents(q=q, page=page, page_size=page_size, db=db, user=user)

@router.get("/stats", response_model=DashboardStats)
async def stats(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    docs = (await db.scalars(select(Document).where(Document.owner_id == user.id))).all()
    return DashboardStats(documents=len(docs), words=sum(d.word_count for d in docs), reading_minutes=sum(d.reading_time_minutes for d in docs), themes=len({k.term for d in docs for k in d.keywords}))

@router.post("/{document_id}/tags", response_model=list[TagOut])
async def add_tags(document_id: int, names: list[str] = Body(...), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id).options(selectinload(Document.tags)))
    if not doc: raise HTTPException(404, "Document not found")
    for name in {n.strip().lower() for n in names if n.strip()}:
        tag = await db.scalar(select(Tag).where(Tag.owner_id == user.id, Tag.name == name))
        if not tag: tag = Tag(owner_id=user.id, name=name); db.add(tag); await db.flush()
        if tag not in doc.tags: doc.tags.append(tag)
    await db.commit()
    return doc.tags

@router.delete("/{document_id}/tags/{tag_id}", status_code=204)
async def remove_tag(document_id: int, tag_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id).options(selectinload(Document.tags)))
    tag = await db.scalar(select(Tag).where(Tag.id == tag_id, Tag.owner_id == user.id))
    if not doc or not tag or tag not in doc.tags: raise HTTPException(404, "Tag not found")
    doc.tags.remove(tag); await db.commit()

@router.post("/{document_id}/ask", response_model=AskResponse)
async def ask_document(document_id: int, question: str = Body(..., embed=True), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id))
    if not doc: raise HTTPException(404, "Document not found")
    answer = await generate(f"Answer the question using only the document below. If the answer is not present, say so.\nQuestion: {question}\n\nDocument:\n{doc.content[:30000]}")
    return AskResponse(answer=answer or "AI Q&A is unavailable. Set AI_ENABLED=true and provide GEMINI_API_KEY, or use the extracted text and deterministic summary.", ai_enabled=bool(answer))

@router.post("/{document_id}/summary", response_model=SummaryResponse)
async def generate_summary(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    summary = await generate(f"Summarize this document in 2-3 concise sentences. Return only the summary.\n\n{doc.content[:30000]}")
    return SummaryResponse(summary=summary or doc.summary, ai_enabled=bool(summary))


@router.get("/{document_id}/file")
async def download_document(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    path = get_file(doc.storage_key or "")
    if not path:
        raise HTTPException(404, "Stored file not found")
    return FileResponse(path, media_type=doc.mime_type, filename=doc.filename)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(with_relations(select(Document).where(Document.id == document_id, Document.owner_id == user.id)))
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.owner_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    delete_file(doc.storage_key)
    await db.delete(doc)
    await db.commit()
