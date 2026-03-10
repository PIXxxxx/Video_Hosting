# celery_app.py
from celery import Celery
import os
import subprocess
from models import SessionLocal, Video  # ИЗМЕНЕНО: database -> models
import sys

# Добавляем текущую директорию в путь Python
sys.path.append(os.path.dirname(__file__))

celery_app = Celery(
    'video_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=20 * 60,
    broker_connection_retry_on_startup=True,
)

@celery_app.task(bind=True)
def process_video_task(self, video_id: int, input_path: str):
    """Асинхронная обработка видео"""
    print(f"🎬 Начинаем обработку видео {video_id} из {input_path}")
    
    try:
        # Создаем папку для HLS
        output_dir = f"media/videos/{video_id}/"
        os.makedirs(output_dir, exist_ok=True)
        
        # Генерируем превью (первый кадр)
        thumbnail_path = f"{output_dir}thumbnail.jpg"
        thumb_cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ss', '00:00:01',
            '-vframes', '1',
            '-vf', 'scale=320:180',
            '-y',
            thumbnail_path
        ]
        subprocess.run(thumb_cmd, capture_output=True)
        
        # Конвертируем в HLS
        hls_path = f"{output_dir}playlist.m3u8"
        hls_cmd = [
            'ffmpeg',
            '-i', input_path,
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-s', '640x360',
            '-start_number', '0',
            '-hls_time', '10',
            '-hls_list_size', '0',
            '-f', 'hls',
            '-y',
            hls_path
        ]
        
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Конвертация видео...'}
        )
        
        result = subprocess.run(hls_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
        
        # Обновляем запись в БД
        db = SessionLocal()
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.hls_playlist_path = hls_path
                video.thumbnail_path = thumbnail_path
                video.is_processed = True
                db.commit()
                print(f"✅ Видео {video_id} успешно обработано")
        finally:
            db.close()
        
        return {
            "status": "success",
            "video_id": video_id,
            "hls_path": hls_path,
            "thumbnail": thumbnail_path
        }
        
    except Exception as e:
        print(f"❌ Ошибка обработки видео {video_id}: {str(e)}")
        
        db = SessionLocal()
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.is_processed = False
                db.commit()
        finally:
            db.close()
        
        raise self.retry(exc=e, countdown=60, max_retries=3)