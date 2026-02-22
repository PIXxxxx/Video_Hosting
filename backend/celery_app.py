# celery_app.py
from celery import Celery
import subprocess
import os
from models import SessionLocal, Video
import sys

# Добавляем текущую директорию в путь Python
sys.path.append(os.path.dirname(__file__))

# Создаем папки, если их нет
os.makedirs("media/videos", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# Создаем экземпляр Celery
celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# Настройки Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 минут
    task_soft_time_limit=25 * 60,  # 25 минут
)

@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, video_id, input_path):
    """
    Задача для обработки видео: конвертация в HLS формат
    """
    print(f"🎬 [Task {self.request.id}] Начинаем обработку видео {video_id}")
    print(f"📁 Входной файл: {input_path}")
    
    # Создаем папку для результатов HLS
    output_dir = f"media/videos/{video_id}/"
    os.makedirs(output_dir, exist_ok=True)
    
    output_playlist = os.path.join(output_dir, "playlist.m3u8")
    
    # Команда FFmpeg для создания HLS-потока
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-s', '1280x720',          # 720p
        '-start_number', '0',
        '-hls_time', '10',
        '-hls_list_size', '0',
        '-f', 'hls',
        output_playlist
    ]
    
    try:
        # Запускаем FFmpeg
        print(f"🔄 Запуск FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            print(f"✅ FFmpeg успешно завершил работу")
            
            # Обновляем запись в БД
            db = SessionLocal()
            try:
                video = db.query(Video).filter(Video.id == video_id).first()
                if video:
                    video.hls_playlist_path = output_playlist
                    video.is_processed = True
                    db.commit()
                    print(f"✅ Видео {video_id} успешно обработано и сохранено в БД")
                    print(f"📁 Плейлист: {output_playlist}")
                else:
                    print(f"❌ Видео с ID {video_id} не найдено в БД")
            except Exception as e:
                print(f"❌ Ошибка при обновлении БД: {e}")
                db.rollback()
            finally:
                db.close()
        else:
            print(f"❌ Ошибка FFmpeg (код {result.returncode})")
            print(f"STDERR: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print(f"❌ Таймаут при обработке видео {video_id}")
    except Exception as e:
        print(f"❌ Непредвиденная ошибка: {e}")
        raise
    
    return {
        'video_id': video_id,
        'status': 'processed' if result and result.returncode == 0 else 'failed',
        'playlist_path': output_playlist if result and result.returncode == 0 else None
    }