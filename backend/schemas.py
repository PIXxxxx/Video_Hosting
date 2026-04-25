# schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
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
    title: str
    description: Optional[str] = ""
    tags: Optional[str] = ""

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
    author: Optional[UserOut] = None
    tags: Optional[str] = None
    custom_thumbnail_path: Optional[str] = None
    is_private: bool = False

    model_config = ConfigDict(from_attributes=True)

class LikeBase(BaseModel):
    is_like: bool

class CommentBase(BaseModel):
    text: str
    parent_id: Optional[int] = None

class CommentOut(CommentBase):
    id: int
    user_id: int
    username: str
    created_at: datetime
    replies: List['CommentOut'] = []

    class Config:
        from_attributes = True

CommentOut.update_forward_refs()

class SubscriptionOut(BaseModel):
    author_id: int
    author_username: str
    subscribers_count: int

class SubscribeResponse(BaseModel):
    message: str
    subscribed: bool

class WatchHistoryOut(BaseModel):
    id: int
    title: str
    thumbnail: str
    watched_at: datetime
    views: int

    model_config = ConfigDict(from_attributes=True)


class SubscriptionFeedItem(BaseModel):
    id: int
    title: str
    author: str
    author_id: int
    thumbnail: str
    upload_date: datetime
    views: int

    model_config = ConfigDict(from_attributes=True)

class PlaylistBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_private: bool = False

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None

class PlaylistVideoAdd(BaseModel):
    video_id: int

class PlaylistOut(PlaylistBase):
    id: int
    author_id: int
    author: Optional[str] = None  # username
    videos_count: int = 0
    created_at: datetime
    videos: List[dict] = []  # упрощённо

    model_config = ConfigDict(from_attributes=True)

class PlaylistDetailOut(PlaylistOut):
    videos: List[dict] = []  # полная информация о видео
