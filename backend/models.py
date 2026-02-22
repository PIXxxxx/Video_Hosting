# models_sqlite.py - временное решение
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Используем SQLite (не требует PostgreSQL)
SQLALCHEMY_DATABASE_URL = "sqlite:///./video_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500))
    hls_playlist_path = Column(String(500), nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    author_id = Column(Integer, nullable=True)

# Создаем таблицы
Base.metadata.create_all(bind=engine)
print("✅ SQLite база данных создана")
print(f"📁 Файл БД: {engine.url.database}")