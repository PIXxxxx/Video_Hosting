# models.py - для PostgreSQL
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from sqlalchemy import UniqueConstraint

# Меняем только эту строку - вместо SQLite на PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql://admin:password@localhost:5432/video_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Связи
    videos = relationship("Video", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    likes = relationship("Like", back_populates="user")

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500))  # Путь к оригинальному файлу
    hls_playlist_path = Column(String(500), nullable=True)  # Путь к HLS плейлисту
    thumbnail_path = Column(String(500), nullable=True)  # Путь к превью
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    dislikes_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    
    # Внешние ключи
    author_id = Column(Integer, ForeignKey("users.id"))
    
    # Связи
    author = relationship("User", back_populates="videos")
    comments = relationship("Comment", back_populates="video")
    likes = relationship("Like", back_populates="video")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    
    # Связи
    author = relationship("User", back_populates="comments")
    video = relationship("Video", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])

class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    is_like = Column(Boolean)  # True = like, False = dislike
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    
    # Уникальность (один пользователь может поставить только одну реакцию на видео)
    __table_args__ = (UniqueConstraint('user_id', 'video_id', name='unique_user_video_like'),)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))  # Кто подписывается
    followed_id = Column(Integer, ForeignKey("users.id"))  # На кого подписываются
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (UniqueConstraint('follower_id', 'followed_id', name='unique_follower_followed'),)

class WatchHistory(Base):
    __tablename__ = "watch_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    watched_at = Column(DateTime, default=datetime.utcnow)
    progress_seconds = Column(Integer, default=0)  # На какой секунде остановились

# Создаем таблицы
def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ PostgreSQL база данных создана/подключена")
    print(f"📁 База данных: {engine.url.database}")
    print(f"🌐 Хост: {engine.url.host}:{engine.url.port}")

if __name__ == "__main__":
    init_db()