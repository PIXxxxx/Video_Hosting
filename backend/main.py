from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
import shutil
import os
import uuid
from datetime import timedelta
from typing import List, Optional
from datetime import datetime  
import models
from database import engine, get_db, init_db
import schemas
import auth
from celery_app import process_video_task

init_db()

os.makedirs("uploads", exist_ok=True)
os.makedirs("media/videos", exist_ok=True)
os.makedirs("media/thumbnails", exist_ok=True)

app = FastAPI(title="Video Hosting API")

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

def format_tags(tags_str: str | None) -> list[str]:
    if not tags_str:
        return []
    return [tag.strip() for tag in tags_str.split(',') if tag.strip()]

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
    # todo: оптимизировать код "id": v.id
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
            "tags": format_tags(v.tags),
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
        
        file_extension = os.path.splitext(file.filename)[1] # TODO: possible bug!!!
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
    """Получение информации о видео БЕЗ автоматического увеличения просмотров"""
    try:
        print(f"🔍 Запрос видео {video_id}")

        video = db.query(models.Video).filter(models.Video.id == video_id).first()

        if not video:
            print(f"❌ Видео {video_id} не найдено")
            raise HTTPException(status_code=404, detail="Видео не найдено")

        if video.is_private and (current_user is None or current_user.id != video.author_id):
            raise HTTPException(status_code=403, detail="Это приватное видео. Доступ только для автора.")

        # Формируем URL миниатюры
        thumbnail_url = f"http://localhost:8000/media/thumbnails/{video.id}.jpg"
        if video.custom_thumbnail_path:
            thumbnail_url = f"http://localhost:8000/media/{video.custom_thumbnail_path}"

        video_data = {
            "id": video.id,
            "title": video.title,
            "description": video.description or "",
            "tags": format_tags(video.tags) if video.tags else [],
            "file_path": video.file_path,
            "hls_playlist_path": video.hls_playlist_path,
            "upload_date": str(video.upload_date),
            "is_processed": video.is_processed,
            "views": video.views,                    # просто возвращаем текущее значение
            "author_id": video.author_id,
            "author": video.author.username if video.author else None,
            "thumbnail": thumbnail_url,
            "is_private": video.is_private,
            "custom_thumbnail_path": video.custom_thumbnail_path
        }

        print(f"✅ Видео {video_id} возвращено: {video.title} | Просмотры: {video.views}")
        return video_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка получения видео {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/video/{video_id}/view")
def increment_video_view(
    video_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Увеличение счётчика просмотров (вызывается один раз с фронтенда)"""
    try:
        video = db.query(models.Video).filter(models.Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Видео не найдено")

        # Защита от приватных видео
        if video.is_private and (current_user is None or current_user.id != video.author_id):
            raise HTTPException(status_code=403, detail="Доступ запрещён")

        # === Умная защита от множественных запросов ===
        should_increment = True

        if current_user:
            # Не считаем повторный просмотр, если пользователь смотрел видео меньше 30 секунд назад
            recent_view = db.query(models.WatchHistory).filter(
                models.WatchHistory.user_id == current_user.id,
                models.WatchHistory.video_id == video_id,
                models.WatchHistory.watched_at > datetime.utcnow() - timedelta(seconds=30)
            ).first()

            if recent_view:
                should_increment = False
                print(f"⏭️ Просмотр видео {video_id} уже был засчитан недавно")

        if should_increment:
            video.views = (video.views or 0) + 1
            print(f"📈 Просмотр видео {video_id} засчитан. Новое количество: {video.views}")

        # Обновляем/создаём запись в истории просмотров
        if current_user:
            existing = db.query(models.WatchHistory).filter(
                models.WatchHistory.user_id == current_user.id,
                models.WatchHistory.video_id == video_id
            ).first()

            now = datetime.utcnow()

            if existing:
                existing.watched_at = now
            else:
                db.add(models.WatchHistory(
                    user_id=current_user.id,
                    video_id=video_id,
                    watched_at=now
                ))

        db.commit()

        return {
            "message": "Просмотр засчитан" if should_increment else "Просмотр уже был засчитан ранее",
            "views": video.views
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка при засчёте просмотра видео {video_id}: {str(e)}")
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
            # TODO: избавиться от ""http://localhost:8000/" возможно, можно просто /media/...
            # TODO: отрефакторить?
            thumbnail_url = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
            custom_thumbnail = getattr(v, 'custom_thumbnail_path', None)
            if custom_thumbnail:
                thumbnail_url = f"http://localhost:8000/media/{custom_thumbnail}"
            
            # TODO: вынести в функцию?
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
    Получить информацию о канале пользователя + его видео
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    videos = (
        db.query(models.Video)
        .filter(models.Video.author_id == user_id)
        .order_by(models.Video.upload_date.desc())
        .limit(20)
        .all()
    )

    video_list = []
    for v in videos:
        if v.custom_thumbnail_path:
            thumbnail = f"http://localhost:8000/media/{v.custom_thumbnail_path}"
        else:
            thumbnail = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"

        video_list.append({
            "id": v.id,
            "title": v.title,
            "description": v.description or "",
            "views": v.views,
            "upload_date": v.upload_date.isoformat() if v.upload_date else None,
            "author": user.username,
            "author_id": user.id,
            "thumbnail": thumbnail,   
            "file_path": v.file_path,
            "hls_playlist_path": v.hls_playlist_path,
            "is_processed": v.is_processed,
        })

    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": f"https://ui-avatars.com/api/?name={user.username}&background=random",
        "videos_count": len(video_list),
        "videos": video_list,
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
    # TODO: optimize via query
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

@app.post("/api/subscribe/{author_id}")
def toggle_subscription(
    author_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.id == author_id:
        raise HTTPException(400, "Нельзя подписаться на самого себя")

    sub = db.query(models.Subscription).filter(
        models.Subscription.subscriber_id == current_user.id,
        models.Subscription.author_id == author_id
    ).first()

    if sub:
        db.delete(sub)
        db.commit()
        return {"message": "Вы отписались", "subscribed": False}
    else:
        new_sub = models.Subscription(subscriber_id=current_user.id, author_id=author_id)
        db.add(new_sub)
        db.commit()
        return {"message": "Вы подписались", "subscribed": True}


@app.get("/api/subscription/status/{author_id}")
def get_subscription_status(
    author_id: int,
    current_user: models.User = Depends(auth.get_current_active_user_optional), 
    db: Session = Depends(get_db)
):
    subscribers_count = db.query(models.Subscription).filter(
        models.Subscription.author_id == author_id
    ).count()

    is_subscribed = False
    if current_user:
        is_subscribed = db.query(models.Subscription).filter(
            models.Subscription.subscriber_id == current_user.id,
            models.Subscription.author_id == author_id
        ).first() is not None

    return {
        "subscribed": is_subscribed,
        "subscribers_count": subscribers_count
    }

# ========== ЛИЧНЫЙ КАБИНЕТ (для меню) ==========

@app.get("/api/me/videos")
def get_my_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Мои видео"""
    videos = db.query(models.Video).filter(
        models.Video.author_id == current_user.id
    ).order_by(models.Video.upload_date.desc()).all()
    
    result = []
    for v in videos:
        # Правильная логика выбора превью
        if v.custom_thumbnail_path:
            thumbnail = f"http://localhost:8000/media/{v.custom_thumbnail_path}"
        else:
            thumbnail = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
        
        result.append({
            "id": v.id,
            "title": v.title,
            "description": v.description or "",
            "views": v.views,
            "upload_date": v.upload_date.isoformat() if v.upload_date else None,
            "thumbnail": thumbnail,           # ← самое важное
            "is_processed": v.is_processed
        })
    
    return result


@app.get("/api/me/watch-history")
def get_watch_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    history = (
        db.query(models.WatchHistory)
        .options(joinedload(models.WatchHistory.video))
        .filter(models.WatchHistory.user_id == current_user.id)
        .order_by(models.WatchHistory.watched_at.desc())
        .limit(50)
        .all()
    )
    
    result = []
    for h in history:
        video = h.video
        if not video:
            continue
            
        if video.custom_thumbnail_path:
            thumbnail = f"http://localhost:8000/media/{video.custom_thumbnail_path}"
        else:
            thumbnail = f"http://localhost:8000/media/thumbnails/{video.id}.jpg"
        
        result.append({
            "id": video.id,
            "title": video.title,
            "thumbnail": thumbnail,
            "watched_at": h.watched_at.isoformat(),
            "views": video.views
        })
    
    return result


@app.get("/api/me/subscriptions/feed")
def get_subscriptions_feed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    videos = (
        db.query(models.Video)
        .join(models.Subscription, models.Video.author_id == models.Subscription.author_id)
        .filter(models.Subscription.subscriber_id == current_user.id)
        .order_by(models.Video.upload_date.desc())
        .limit(30)
        .all()
    )
    
    result = []
    for v in videos:
        if v.custom_thumbnail_path:
            thumbnail = f"http://localhost:8000/media/{v.custom_thumbnail_path}"
        else:
            thumbnail = f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
        
        result.append({
            "id": v.id,
            "title": v.title,
            "author": v.author.username if v.author else "Неизвестно",
            "author_id": v.author_id,
            "thumbnail": thumbnail,
            "upload_date": v.upload_date.isoformat() if v.upload_date else None,
            "views": v.views
        })
    
    return result

@app.get("/api/recommendations/personal")
def get_personal_recommendations(
    limit: int = Query(12, ge=1, le=30),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Персональные рекомендации на основе истории просмотров пользователя"""
    
    # 1. Получаем последние 15 просмотренных видео пользователя
    watched = db.query(models.WatchHistory)\
        .options(joinedload(models.WatchHistory.video))\
        .filter(models.WatchHistory.user_id == current_user.id)\
        .order_by(models.WatchHistory.watched_at.desc())\
        .limit(15)\
        .all()

    if not watched:
        # Если истории нет — возвращаем просто популярные видео
        popular = db.query(models.Video)\
            .filter(models.Video.is_private == False)\
            .order_by(models.Video.views.desc())\
            .limit(limit)\
            .all()
        return format_videos(popular)

    # 2. Собираем все теги из просмотренных видео с весом (чем новее — тем важнее)
    tag_score = {}
    for i, entry in enumerate(watched):
        if not entry.video or not entry.video.tags:
            continue
            
        weight = 1.0 / (i + 1)   # более свежие просмотры имеют больший вес
        
        for tag in [t.strip().lower() for t in entry.video.tags.split(',') if t.strip()]:
            if tag in tag_score:
                tag_score[tag] += weight
            else:
                tag_score[tag] = weight

    if not tag_score:
        # Если тегов нет — популярные видео
        popular = db.query(models.Video)\
            .filter(models.Video.is_private == False)\
            .order_by(models.Video.views.desc())\
            .limit(limit)\
            .all()
        return format_videos(popular)

    # 3. Ищем видео, которые имеют пересечение тегов
    recommendations = []
    seen_ids = {w.video_id for w in watched}

    all_videos = db.query(models.Video)\
        .filter(
            models.Video.is_private == False,
            models.Video.id.notin_(seen_ids)
        )\
        .all()

    for video in all_videos:
        if not video.tags:
            continue

        video_tags = [t.strip().lower() for t in video.tags.split(',') if t.strip()]
        
        # Считаем score для этого видео
        video_score = sum(tag_score.get(tag, 0) for tag in video_tags)

        if video_score > 0:
            recommendations.append({
                "id": video.id,
                "title": video.title,
                "author": video.author.username if video.author else "Аноним",
                "author_id": video.author_id,
                "views": video.views,
                "upload_date": video.upload_date.isoformat(),
                "thumbnail": f"http://localhost:8000/media/thumbnails/{video.id}.jpg",
                "score": video_score,
                "match_tags": [tag for tag in video_tags if tag in tag_score]
            })

    # Сортируем по score (чем выше — тем лучше)
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    return [rec for rec in recommendations if "score" in rec][:limit]


def format_videos(videos):
    """Вспомогательная функция для форматирования списка видео"""
    return [{
        "id": v.id,
        "title": v.title,
        "author": v.author.username if v.author else "Аноним",
        "author_id": v.author_id,
        "views": v.views,
        "upload_date": v.upload_date.isoformat(),
        "thumbnail": f"http://localhost:8000/media/thumbnails/{v.id}.jpg"
    } for v in videos]