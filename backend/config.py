from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./database/video_hosting.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT настройки
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")
    MEDIA_URL: str = f"{BASE_URL}/media"

settings = Settings()