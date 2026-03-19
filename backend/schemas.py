# schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

# ─── Пользователь ────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ─── Токены ──────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ─── Видео ───────────────────────────────────────────────

class VideoBase(BaseModel):
    title: Optional[str] = "Без названия"
    description: Optional[str] = ""

class VideoCreate(VideoBase):
    title: str                    # обязательно
    description: Optional[str] = ""
    tags: Optional[str] = ""      # теги через запятую

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    is_private: Optional[bool] = None

class VideoOut(VideoBase):
    id: int
    file_path: str
    hls_playlist_path: Optional[str] = None
    upload_date: datetime
    is_processed: bool
    views: int
    author_id: Optional[int] = None
    author: Optional[UserOut] = None      # ← теперь правильно, вложенный UserOut
    tags: Optional[str] = None
    custom_thumbnail_path: Optional[str] = None
    is_private: bool = False

    model_config = ConfigDict(from_attributes=True)