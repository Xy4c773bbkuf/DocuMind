from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
from .db import get_db
from .models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(value: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode(), salt, 600_000)
    return "pbkdf2_sha256$600000${}${}".format(
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(digest).decode(),
    )


def verify_password(value: str, hashed: str) -> bool:
    if not hashed.startswith("pbkdf2_sha256$"):
        return pwd_context.verify(value, hashed)
    _, rounds, encoded_salt, encoded_digest = hashed.split("$", 3)
    salt = base64.urlsafe_b64decode(encoded_salt.encode())
    expected = base64.urlsafe_b64decode(encoded_digest.encode())
    actual = hashlib.pbkdf2_hmac("sha256", value.encode(), salt, int(rounds))
    return hmac.compare_digest(actual, expected)


def create_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError):
        raise credentials
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise credentials
    return user

