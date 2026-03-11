# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Используем SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./video_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Нужно для SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Зависимость для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Создание таблиц"""
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы в SQLite")