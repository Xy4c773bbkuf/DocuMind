from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_db
from ..models import User
from ..schemas import Token, UserCreate, UserOut
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=Token, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(409, "Email already registered")
    user = User(email=payload.email.lower(), hashed_password=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return Token(access_token=create_token(user.id), user=user)


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return Token(access_token=create_token(user.id), user=user)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user

