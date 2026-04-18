# celery_app.py
from celery import Celery
import subprocess
import os
import sys

# Добавляем путь для импорта
sys.path.append(os.path.dirname(__file__))

# Путь к FFmpeg (оставляем твой)
FFMPEG_PATH = r"C:\ffmpeg\bin\ffmpeg.exe"

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
os.makedirs("media/thumbnails", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

def get_db_session():
    """Получение сессии SQLite для Celery"""
    from database import SessionLocal
    return SessionLocal()
@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, video_id, input_path):
    """Shaka Packager — стабильный multi-quality HLS"""
    
    print(f"\n{'='*85}")
    print(f"🎬 ОБРАБОТКА ВИДЕО {video_id} — SHAKA PACKAGER")
    print(f"{'='*85}")

    if not os.path.exists(input_path):
        print("❌ Входной файл не найден!")
        return {'status': 'failed'}

    video_dir = f"media/videos/{video_id}/"
    thumbnails_dir = "media/thumbnails/"
    
    os.makedirs(video_dir, exist_ok=True)
    os.makedirs(thumbnails_dir, exist_ok=True)

    master_playlist = os.path.join(video_dir, "master.m3u8")
    thumbnail_path = os.path.join(thumbnails_dir, f"{video_id}.jpg")

    # ====================== 1. Кодирование разных качеств (FFmpeg) ======================
    print("\n🔄 [1/3] Кодирование видео в разные качества...")

    renditions = [
        {"name": "360p",  "width": 640,  "height": 360,  "crf": 24},
        {"name": "480p",  "width": 854,  "height": 480,  "crf": 23},
        {"name": "720p",  "width": 1280, "height": 720,  "crf": 22},
        {"name": "1080p", "width": 1920, "height": 1080, "crf": 21},
    ]

    mp4_files = []   # список готовых mp4 файлов

    for r in renditions:
        output_mp4 = os.path.join(video_dir, f"{r['name']}.mp4")
        mp4_files.append(output_mp4)

        cmd = [
            FFMPEG_PATH, '-i', input_path,
            '-vf', f"scale={r['width']}:{r['height']}:force_original_aspect_ratio=decrease,pad={r['width']}:{r['height']}:(ow-iw)/2:(oh-ih)/2",
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', str(r['crf']),
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',
            output_mp4
        ]

        print(f"   → Кодирую {r['name']}...")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=480)
            if result.returncode == 0 and os.path.exists(output_mp4):
                print(f"   ✅ {r['name']} готов")
            else:
                print(f"   ❌ Ошибка при кодировании {r['name']}")
        except Exception as e:
            print(f"   ❌ Исключение при кодировании {r['name']}: {e}")

    # ====================== 2. Упаковка через Shaka Packager ======================
    print("\n📦 [2/3] Создание HLS через Shaka Packager...")

    # Очищаем старые mp4 файлы (если нужно)
    mp4_files = []
    renditions = [
        {"name": "360p",  "width": 640,  "height": 360,  "bitrate": "800k",  "maxrate": "856k",  "bufsize": "1200k"},
        {"name": "480p",  "width": 854,  "height": 480,  "bitrate": "1400k", "maxrate": "1498k", "bufsize": "2100k"},
        {"name": "720p",  "width": 1280, "height": 720,  "bitrate": "2800k", "maxrate": "2996k", "bufsize": "4200k"},
        {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k", "maxrate": "5350k", "bufsize": "7500k"},
    ]

    # 1. Кодирование видео с правильными параметрами
    for r in renditions:
        output_mp4 = os.path.join(video_dir, f"{r['name']}.mp4")
        mp4_files.append(output_mp4)

        cmd = [
            FFMPEG_PATH, '-i', input_path,
            '-vf', f"scale={r['width']}:{r['height']}:force_original_aspect_ratio=decrease,pad={r['width']}:{r['height']}:(ow-iw)/2:(oh-ih)/2",
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-b:v', r['bitrate'],
            '-maxrate', r['maxrate'],
            '-bufsize', r['bufsize'],
            '-profile:v', 'high',
            '-level', '4.0',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '48000',
            '-ac', '2',
            '-movflags', '+faststart',
            '-y',
            output_mp4
        ]

        print(f"   → Кодирую {r['name']} ({r['bitrate']})...")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=480)
            if result.returncode == 0 and os.path.exists(output_mp4):
                print(f"   ✅ {r['name']} готов")
            else:
                print(f"   ❌ Ошибка при кодировании {r['name']}")
                if result.stderr:
                    print(f"   {result.stderr[-500:]}")
        except Exception as e:
            print(f"   ❌ Исключение: {e}")

    # 2. Упаковка в HLS (ПРАВИЛЬНЫЙ СПОСОБ)
    packager_cmd = [
        "packager",
        f"in={video_dir}1080p.mp4,stream=video,init_segment={video_dir}1080p/init.mp4,segment_template={video_dir}1080p/$Number$.m4s",
        f"in={video_dir}720p.mp4,stream=video,init_segment={video_dir}720p/init.mp4,segment_template={video_dir}720p/$Number$.m4s",
        f"in={video_dir}480p.mp4,stream=video,init_segment={video_dir}480p/init.mp4,segment_template={video_dir}480p/$Number$.m4s",
        f"in={video_dir}360p.mp4,stream=video,init_segment={video_dir}360p/init.mp4,segment_template={video_dir}360p/$Number$.m4s",
        f"in={video_dir}1080p.mp4,stream=audio,init_segment={video_dir}audio/init.mp4,segment_template={video_dir}audio/$Number$.m4s",
        "--generate_static_live_mpd",
        "--hls_master_playlist_output", master_playlist,
        "--segment_duration", "6",
    ]

    # Создаем директории для каждого качества
    for r in renditions:
        os.makedirs(os.path.join(video_dir, r['name']), exist_ok=True)
    os.makedirs(os.path.join(video_dir, "audio"), exist_ok=True)

    print("Запускаем Shaka Packager...")
    try:
        result = subprocess.run(packager_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # Проверяем, что master.m3u8 создан
            if os.path.exists(master_playlist) and os.path.getsize(master_playlist) > 0:
                print(f"✅ Shaka Packager успешно завершил работу!")
                print(f"   Master playlist: {master_playlist}")
                
                # Исправляем пути в master.m3u8
                with open(master_playlist, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Корректируем относительные пути
                content = content.replace('./', '')
                
                with open(master_playlist, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                hls_success = True
            else:
                print(f"❌ Master playlist не создан")
                hls_success = False
        else:
            print(f"❌ Shaka Packager вернул код: {result.returncode}")
            if result.stderr:
                print(f"STDERR:\n{result.stderr[-2000:]}")
            hls_success = False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        hls_success = False

    # ====================== 3. Миниатюра ======================
    print("\n🖼️ [3/3] Создание миниатюры...")
    # (оставляем как было — твой текущий код миниатюры)

    cmd_thumb = [
        FFMPEG_PATH, '-i', input_path,
        '-ss', '00:00:03', '-vframes', '1',
        '-vf', 'scale=1280:-1',
        '-y', thumbnail_path
    ]

    thumbnail_success = False
    try:
        result = subprocess.run(cmd_thumb, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and os.path.exists(thumbnail_path):
            print(f"✅ Миниатюра создана")
            thumbnail_success = True
    except Exception as e:
        print(f"❌ Ошибка миниатюры: {e}")

    # ====================== Обновление БД ======================
    db = get_db_session()
    try:
        from models import Video
        video = db.query(Video).filter(Video.id == video_id).first()
        if video and hls_success:
            video.hls_playlist_path = f"media/videos/{video_id}/master.m3u8"
            video.is_processed = True
            db.commit()
            print(f"✅ Видео {video_id} успешно обработано и обновлено в БД")
    except Exception as e:
        print(f"❌ Ошибка обновления БД: {e}")
        db.rollback()
    finally:
        db.close()

    print(f"\n📊 ИТОГ: HLS = {hls_success}")
    return {'status': 'processed' if hls_success else 'failed'}