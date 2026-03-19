# models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Добавляем поле для аватарки (опционально)
    # avatar_url = Column(String(500), nullable=True)  # ← новая строка
    
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

    