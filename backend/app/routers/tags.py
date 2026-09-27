from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_db
from ..models import Tag, User
from ..security import current_user

router = APIRouter()


@router.get("")
async def list_tags(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return (await db.scalars(select(Tag).where(Tag.owner_id == user.id).order_by(Tag.name))).all()
