from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil
import os
import uuid
from pathlib import Path

# Импорты из ваших модулей
from models import Video, SessionLocal, Base, engine
from celery_app import process_video_task

# Создаем папки
os.makedirs("uploads", exist_ok=True)
os.makedirs("media/videos", exist_ok=True)

# Создаем таблицы
Base.metadata.create_all(bind=engine)

# Создаем приложение
app = FastAPI(title="Video Hosting API")

# Настройка CORS - ЭТО ВАЖНО!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
    expose_headers=["*"]
)

# Раздаем статические файлы
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/")
def read_root():
    return {
        "message": "Video Hosting API is running",
        "status": "ok",
        "cors_enabled": True
    }

@app.post("/api/upload/")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form("Без названия")
):
    try:
        print(f"📥 Получен файл: {file.filename}")
        print(f"📋 Заголовки: {file.headers}")
        
        # Проверяем тип файла
        if not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="Файл должен быть видео")
        
        # Сохраняем файл
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"💾 Файл сохранен: {file_path}")
        
        # Сохраняем в БД
        db = SessionLocal()
        db_video = Video(
            title=title,
            file_path=file_path,
            is_processed=False
        )
        db.add(db_video)
        db.commit()
        db.refresh(db_video)
        db.close()
        
        # Отправляем в Celery
        process_video_task.delay(db_video.id, file_path)
        
        return JSONResponse({
            "message": "Видео успешно загружено",
            "video_id": db_video.id,
            "title": title
        })
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{video_id}")
def get_video(video_id: int):
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    db.close()
    
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    
    return {
        "id": video.id,
        "title": video.title,
        "is_processed": video.is_processed,
        "upload_date": video.upload_date,
        "views": video.views
    }

@app.get("/api/video/{video_id}/status")
def get_video_status(video_id: int):
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    db.close()
    
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    
    return {
        "id": video.id,
        "is_processed": video.is_processed,
        "status": "processed" if video.is_processed else "processing"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)