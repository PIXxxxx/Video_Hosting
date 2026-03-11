# celery_app.py
from celery import Celery
import subprocess
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

# Добавляем путь для импорта
sys.path.append(os.path.dirname(__file__))

# Создаем экземпляр Celery
celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    enable_utc=True,
)

# Создаем папки
os.makedirs("media/videos", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

def get_db_session():
    """Получение сессии SQLite для Celery"""
    from database import SessionLocal
    return SessionLocal()

@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, video_id, input_path):
    """Обработка видео в HLS формат"""
    print(f"🎬 Начинаем обработку видео {video_id}")
    
    output_dir = f"media/videos/{video_id}/"
    os.makedirs(output_dir, exist_ok=True)
    
    output_playlist = os.path.join(output_dir, "playlist.m3u8")
    
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-s', '1280x720',
        '-start_number', '0',
        '-hls_time', '10',
        '-hls_list_size', '0',
        '-f', 'hls',
        output_playlist
    ]
    
    try:
        print(f"🔄 Запуск FFmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            print(f"✅ FFmpeg успешно завершил работу")
            
            # Обновляем запись в БД
            db = get_db_session()
            try:
                from models import Video
                video = db.query(Video).filter(Video.id == video_id).first()
                if video:
                    video.hls_playlist_path = output_playlist
                    video.is_processed = True
                    db.commit()
                    print(f"✅ Видео {video_id} обработано")
                else:
                    print(f"❌ Видео {video_id} не найдено")
            except Exception as e:
                print(f"❌ Ошибка БД: {e}")
                db.rollback()
            finally:
                db.close()
        else:
            print(f"❌ Ошибка FFmpeg: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        raise
    
    return {
        'video_id': video_id,
        'status': 'processed' if result and result.returncode == 0 else 'failed',
    }