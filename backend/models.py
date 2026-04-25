from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import models

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    watch_history = relationship(
        "WatchHistory",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    avatar_path = Column(String(500), nullable=True)
    banner_path = Column(String(500), nullable=True)
    
    playlists = relationship("Playlist", back_populates="author", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="author", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    file_path = Column(String(500))
    hls_playlist_path = Column(String(500), nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    custom_thumbnail_path = Column(String(500), nullable=True)
    is_private = Column(Boolean, default=False)
    
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author = relationship("User", back_populates="videos")

class Like(models.Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    is_like = Column(Boolean, default=True)

    user = relationship("User")
    video = relationship("Video")


class Comment(models.Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    video = relationship("Video")
    replies = relationship("Comment", backref="parent", remote_side=[id])

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("users.id"))
    author_id = Column(Integer, ForeignKey("users.id"))

    subscriber = relationship("User", foreign_keys=[subscriber_id])
    author = relationship("User", foreign_keys=[author_id])

    __table_args__ = (
        UniqueConstraint('subscriber_id', 'author_id', name='unique_subscription'),
    )

class WatchHistory(Base):
    __tablename__ = "watch_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    watched_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="watch_history")
    video = relationship("Video")


class Playlist(Base):
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_private = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author = relationship("User", back_populates="playlists")
    
    videos = relationship(
        "PlaylistVideo",
        back_populates="playlist",
        cascade="all, delete-orphan"
    )

class PlaylistVideo(Base):
    __tablename__ = "playlist_videos"
    
    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    position = Column(Integer, default=0)  # порядок видео в плейлисте
    
    playlist = relationship("Playlist", back_populates="videos")
    video = relationship("Video")

    __table_args__ = (
        UniqueConstraint('playlist_id', 'video_id', name='unique_playlist_video'),
    )