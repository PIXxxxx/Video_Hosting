from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from datetime import timedelta
from typing import List, Optional

import models
from database import engine, get_db, init_db
import schemas
import auth
from celery_app import process_video_task

# Инициализация БД
init_db()

# Создаем все необходимые папки
os.makedirs("uploads", exist_ok=True)
os.makedirs("media/videos", exist_ok=True)
os.makedirs("media/thumbnails", exist_ok=True)

# Создаем приложение
app = FastAPI(title="Video Hosting API")

# CORS для фронтенда - расширенные настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        
    ],
    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"], 
    max_age=600,
)

# Монтируем статические папки
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
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
    db_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email или именем уже существует"
        )
    
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

@app.get("/api/users/me/videos")
def get_my_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Список видео текущего пользователя"""
    videos = db.query(models.Video).filter(
        models.Video.author_id == current_user.id
    ).order_by(models.Video.upload_date.desc()).all()
    
    result = []
    for v in videos:
        result.append
        ({  "id": v.id,
            "title": v.title,
            "description": v.description,
            "file_path": v.file_path,
            "hls_playlist_path": v.hls_playlist_path,
            "upload_date": str(v.upload_date),
            "is_processed": v.is_processed,
            "views": v.views,
            "author_id": v.author_id,
            "author": v.author.username if v.author else None,
            "tags": v.tags,
            "custom_thumbnail_path": v.custom_thumbnail_path
        })
    
    return result

# ========== ВИДЕО ==========

@app.post("/api/upload/")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(default=""),
    tags: Optional[str] = Form(default=""), 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Загрузка видео"""
    try:
        print(f"📥 Пользователь {current_user.username} загружает: {file.filename}")
        
        if not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="Файл должен быть видео")
        
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"💾 Файл сохранен: {file_path}")
        
        db_video = models.Video(
            title=title,
            description=description,
            tags=tags.strip() if tags else None,
            file_path=file_path,
            is_processed=False,
            author_id=current_user.id
        )
        db.add(db_video)
        db.commit()
        db.refresh(db_video)
        
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
def get_video(
    video_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Получение информации о видео"""
    try:
        print(f"🔍 Запрос видео {video_id}")
        
        video = db.query(models.Video).filter(models.Video.id == video_id).first()
        
        
        if not video:
            print(f"❌ Видео {video_id} не найдено")
            raise HTTPException(status_code=404, detail="Видео не найдено")
        
        if video.is_private and (current_user is None or current_user.id != video.author_id):
            raise HTTPException(status_code=403, detail="Это приватное видео. Доступ только для автора.")

        video.views += 1
        db.commit()
        
        # Формируем URL миниатюры
        thumbnail_url = f"http://localhost:8000/media/thumbnails/{video.id}.jpg"
        
        video_data = {
            "id": video.id,
            "title": video.title,
            "description": video.description,
            "file_path": video.file_path,
            "hls_playlist_path": video.hls_playlist_path,
            "upload_date": str(video.upload_date),
            "is_processed": video.is_processed,
            "views": video.views,
            "author_id": video.author_id,
            "author": video.author.username if video.author else None,
            "thumbnail": thumbnail_url,
            "is_private": video.is_private
        }
        
        print(f"✅ Видео {video_id} найдено: {video.title}")
        return video_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка получения видео {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/videos")
def get_videos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    try:
        videos = db.query(models.Video).filter(
        models.Video.is_private == False
    ).order_by(models.Video.upload_date.desc()).offset(skip).limit(limit).all()
        
        result = []
        for v in videos:
            thumbnail_url = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
            custom_thumbnail = getattr(v, 'custom_thumbnail_path', None)
            if custom_thumbnail:
                thumbnail_url = f"http://localhost:8000/media/{custom_thumbnail}"
            
            result.append({
                "id": v.id,
                "title": v.title,
                "description": v.description or "",
                "file_path": v.file_path,
                "hls_playlist_path": v.hls_playlist_path,
                "upload_date": v.upload_date.isoformat() if v.upload_date else None,
                "is_processed": v.is_processed,
                "views": v.views,
                "author_id": v.author_id,
                "author": getattr(v.author, 'username', None) if v.author else None,
                "thumbnail": thumbnail_url
            })
        
        return result
    
    except Exception as e:
        import traceback
        traceback.print_exc()           # ← выведет полный стек в консоль
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get("/api/videos/count")
def get_videos_count(db: Session = Depends(get_db)):
    """Получить общее количество видео"""
    count = db.query(models.Video).count()
    return {"count": count}

# ────────────────────────────────────────────────
# Профиль пользователя / канал
# ────────────────────────────────────────────────

@app.get("/api/channel/{user_id}")
def get_channel(user_id: int, db: Session = Depends(get_db)):
    """
    Получить информацию о канале пользователя + его видео (до 20 последних)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Получаем последние 20 видео автора
    videos = (
        db.query(models.Video)
        .filter(models.Video.author_id == user_id)
        .order_by(models.Video.upload_date.desc())
        .limit(20)
        .all()
    )

    # Формируем ответ
    video_list = []
    for v in videos:
        video_list.append({
            "id": v.id,
            "title": v.title,
            "description": v.description or "",
            "views": v.views,
            "upload_date": v.upload_date.isoformat(),
            "author": user.username,
            "author_id": user.id,
            "thumbnail": f"http://localhost:8000/media/thumbnails/{v.id}.jpg",
            "file_path": v.file_path,
            "hls_playlist_path": v.hls_playlist_path,
            "is_processed": v.is_processed,
        })

    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": f"https://ui-avatars.com/api/?name={user.username}&background=random",
        "videos_count": db.query(models.Video).filter(models.Video.author_id == user_id).count(),
        "videos": video_list,
        # Можно позже добавить: bio, subscribers_count, joined_date и т.д.
    }

@app.put("/api/video/{video_id}/metadata")
async def update_video_metadata(
    video_id: int,
    update_data: schemas.VideoUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Видео не найдено")
    
    if video.author_id != current_user.id:
        raise HTTPException(403, "Вы не автор этого видео")

    # Обновляем только переданные поля
    if update_data.title is not None:
        video.title = update_data.title
    if update_data.description is not None:
        video.description = update_data.description
    if update_data.tags is not None:
        video.tags = update_data.tags.strip() if update_data.tags else None


    if update_data.is_private is not None:
        video.is_private = update_data.is_private
    
    db.commit()
    db.refresh(video)
    
    return {"message": "Метаданные обновлены", "video": schemas.VideoOut.from_orm(video)}

@app.post("/api/video/{video_id}/thumbnail")
async def upload_custom_thumbnail(
    video_id: int,
    thumbnail: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Видео не найдено")
    
    # Сохраняем файл
    ext = thumbnail.filename.split('.')[-1]
    filename = f"custom_thumb_{video_id}.{ext}"
    save_path = f"media/thumbnails/{filename}"
    
    # Создаем папку если нет
    os.makedirs("media/thumbnails", exist_ok=True)
    
    with open(save_path, "wb") as f:
        shutil.copyfileobj(thumbnail.file, f)
    
    # 👈 СОХРАНЯЕМ ПУТЬ В БАЗУ ДАННЫХ
    video.custom_thumbnail_path = f"thumbnails/{filename}"
    db.commit()
    db.refresh(video)  # Обновляем объект
    
    print(f"✅ Путь к обложке сохранен в БД: {video.custom_thumbnail_path}")
    
    # Возвращаем полную информацию
    return { 
        "message": "Обложка обновлена",
        "custom_thumbnail_path": video.custom_thumbnail_path,
        "thumbnail_url": f"http://localhost:8000/media/{video.custom_thumbnail_path}"
    }


@app.delete("/api/video/{video_id}")
def delete_video(
    video_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video or video.author_id != current_user.id:
        raise HTTPException(403, "Вы не автор этого видео")
    
    # Удаляем все файлы
    try:
        if video.file_path and os.path.exists(video.file_path):
            os.remove(video.file_path)
        if video.hls_playlist_path:
            hls_dir = os.path.dirname(video.hls_playlist_path)
            if os.path.exists(hls_dir):
                shutil.rmtree(hls_dir, ignore_errors=True)
        if video.custom_thumbnail_path:
            path = os.path.join("media", video.custom_thumbnail_path)
            if os.path.exists(path):
                os.remove(path)
        thumb = f"media/thumbnails/{video_id}.jpg"
        if os.path.exists(thumb):
            os.remove(thumb)
    except Exception as e:
        print(f"Ошибка удаления файлов: {e}")
    
    db.delete(video)
    db.commit()
    return {"message": "Видео полностью удалено"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

@app.get("/api/search")
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """Поиск по названию видео и имени автора"""
    query = f"%{q}%"
    
    videos = db.query(models.Video).join(models.User).filter(
        models.Video.title.ilike(query) | 
        models.User.username.ilike(query)
    ).order_by(models.Video.upload_date.desc()).limit(15).all()
    
    result = []
    for v in videos:
        thumbnail_url = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
        if v.custom_thumbnail_path:
            thumbnail_url = f"http://localhost:8000/media/{v.custom_thumbnail_path}"
        
        result.append({
            "id": v.id,
            "title": v.title,
            "author": v.author.username,
            "author_id": v.author_id,
            "thumbnail": thumbnail_url,
            "views": v.views,
            "upload_date": v.upload_date.isoformat()
        })
    
    return result

@app.post("/api/video/{video_id}/like")
def toggle_like(
    video_id: int,
    like_data: schemas.LikeBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    like = db.query(models.Like).filter(
        models.Like.video_id == video_id,
        models.Like.user_id == current_user.id
    ).first()

    if like:
        if like.is_like == like_data.is_like:
            db.delete(like)
        else:
            like.is_like = like_data.is_like
    else:
        like = models.Like(video_id=video_id, user_id=current_user.id, is_like=like_data.is_like)
        db.add(like)
    
    db.commit()
    return {"message": "Лайк обновлён"}


@app.get("/api/video/{video_id}/likes")
def get_likes(video_id: int, db: Session = Depends(get_db)):
    likes = db.query(models.Like).filter(models.Like.video_id == video_id).all()
    like_count = sum(1 for l in likes if l.is_like)
    dislike_count = len(likes) - like_count
    return {"likes": like_count, "dislikes": dislike_count}


# === КОММЕНТАРИИ ===
@app.get("/api/video/{video_id}/comments")
def get_comments(video_id: int, db: Session = Depends(get_db)):
    # Находим все корневые комментарии
    root_comments = (
        db.query(models.Comment)
        .filter(
            models.Comment.video_id == video_id,
            models.Comment.parent_id.is_(None)
        )
        .order_by(models.Comment.created_at.desc())
        .all()
    )

    result = []
    for comment in root_comments:
        # Подгружаем все ответы на этот комментарий
        replies_query = (
            db.query(models.Comment)
            .filter(models.Comment.parent_id == comment.id)
            .order_by(models.Comment.created_at.asc())
            .all()
        )

        replies = [
            {
                "id": r.id,
                "text": r.text,
                "username": r.user.username,
                "created_at": r.created_at.isoformat(),
            }
            for r in replies_query
        ]

        result.append({
            "id": comment.id,
            "text": comment.text,
            "username": comment.user.username,
            "created_at": comment.created_at.isoformat(),
            "replies": replies
        })

    return result


@app.post("/api/video/{video_id}/comments")
def add_comment(
    video_id: int,
    comment: schemas.CommentBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    new_comment = models.Comment(
        video_id=video_id,
        user_id=current_user.id,
        text=comment.text,
        parent_id=comment.parent_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {"message": "Комментарий добавлен", "id": new_comment.id}