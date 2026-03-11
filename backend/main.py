# main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from datetime import timedelta

# Импорты
import models
from database import engine, get_db, init_db
import schemas
import auth
from celery_app import process_video_task

# Инициализация БД
init_db()

# Создаем папки
os.makedirs("uploads", exist_ok=True)
os.makedirs("media/videos", exist_ok=True)

# Создаем приложение
app = FastAPI(title="Video Hosting API")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/")
def read_root():
    return {"message": "Video Hosting API is running", "db": "SQLite"}

# ========== АВТОРИЗАЦИЯ ==========

@app.post("/api/register", response_model=schemas.UserOut)
def register(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """Регистрация нового пользователя"""
    # Проверяем, существует ли пользователь
    db_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email или именем уже существует"
        )
    
    # Создаем нового пользователя
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/api/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Вход в систему"""
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.UserOut)
def read_users_me(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Информация о текущем пользователе"""
    return current_user

@app.get("/api/users/me/videos", response_model=list[schemas.VideoOut])
def get_my_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Список видео текущего пользователя"""
    videos = db.query(models.Video).filter(
        models.Video.author_id == current_user.id
    ).all()
    return videos

# ========== ВИДЕО ==========

@app.post("/api/upload/")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form("Без названия"),
    description: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Загрузка видео"""
    try:
        print(f"📥 Пользователь {current_user.username} загружает: {file.filename}")
        
        # Проверяем тип файла
        if not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="Файл должен быть видео")
        
        # Сохраняем файл
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Сохраняем в БД
        db_video = models.Video(
            title=title,
            description=description,
            file_path=file_path,
            is_processed=False,
            author_id=current_user.id
        )
        db.add(db_video)
        db.commit()
        db.refresh(db_video)
        
        # Отправляем в Celery на обработку
        process_video_task.delay(db_video.id, file_path)
        
        return JSONResponse({
            "message": "Видео успешно загружено",
            "video_id": db_video.id,
            "title": title
        })
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/{video_id}", response_model=schemas.VideoOut)
def get_video(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Получение информации о видео"""
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    
    # Увеличиваем счетчик просмотров
    video.views += 1
    db.commit()
    
    return video

@app.get("/api/video/{video_id}/status")
def get_video_status(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Статус обработки видео"""
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    
    return {
        "id": video.id,
        "is_processed": video.is_processed,
        "status": "processed" if video.is_processed else "processing"
    }

@app.get("/api/videos")
def get_videos(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Список всех обработанных видео"""
    videos = db.query(models.Video).filter(
        models.Video.is_processed == True
    ).offset(skip).limit(limit).all()
    return videos

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)