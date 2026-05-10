# celery_app_vidic.py
from celery import Celery
import subprocess
import os
import sys

sys.path.append(os.path.dirname(__file__))

FFMPEG_PATH = r"C:\ffmpeg\bin\ffmpeg.exe"

celery_vidic_app = Celery(
    'vidic_tasks',
    broker='redis://localhost:6379/2',  # отдельная БД
    backend='redis://localhost:6379/2'
)

celery_vidic_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Moscow',
    enable_utc=True,
)

os.makedirs("media/vidic_videos", exist_ok=True)
os.makedirs("media/vidic_thumbnails", exist_ok=True)
os.makedirs("vidic_uploads", exist_ok=True)

def get_db_session():
    from database import SessionLocal
    return SessionLocal()

def has_audio_stream(file_path):
    cmd = [FFMPEG_PATH, '-i', file_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return 'Audio:' in result.stderr

@celery_vidic_app.task(bind=True, name='process_vidic_task')
def process_vidic_task(self, video_id, input_path):
    """Специальная обработка для вертикальных Vidic видео"""
    
    print(f"\n{'='*85}")
    print(f"📱 VIDIC ОБРАБОТКА ВИДЕО {video_id}")
    print(f"{'='*85}")

    if not os.path.exists(input_path):
        print("❌ Входной файл не найден!")
        return {'status': 'failed'}

    # ВЕРТИКАЛЬНЫЕ РАЗРЕШЕНИЯ (9:16)
    video_dir = f"media/vidic_videos/{video_id}/"
    thumbnails_dir = "media/vidic_thumbnails/"
    
    os.makedirs(video_dir, exist_ok=True)
    os.makedirs(thumbnails_dir, exist_ok=True)

    master_playlist = os.path.join(video_dir, "master.m3u8")
    thumbnail_path = os.path.join(thumbnails_dir, f"{video_id}.jpg")

    # ========== 1. Кодирование вертикальных качеств ==========
    print("\n🔄 [1/2] Кодирование VERTICAL видео...")
    
    # Важно: вертикальные разрешения!
    renditions = [
        {"name": "360p",  "width": 360,  "height": 640,  "bitrate": "800k",  "maxrate": "856k",  "bufsize": "1200k"},
        {"name": "480p",  "width": 480,  "height": 854,  "bitrate": "1200k", "maxrate": "1284k", "bufsize": "1800k"},
        {"name": "720p",  "width": 720,  "height": 1280, "bitrate": "2500k", "maxrate": "2675k", "bufsize": "3750k"},
        {"name": "1080p", "width": 1080, "height": 1920, "bitrate": "4500k", "maxrate": "4815k", "bufsize": "6750k"},
    ]

    for r in renditions:
        output_mp4 = os.path.join(video_dir, f"{r['name']}.mp4")
        
        cmd = [
            FFMPEG_PATH, '-i', input_path,
            '-vf', f"scale={r['width']}:{r['height']}:force_original_aspect_ratio=decrease,"
                   f"pad={r['width']}:{r['height']}:(ow-iw)/2:(oh-ih)/2",
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

        print(f"   → Кодирую {r['name']} ({r['width']}x{r['height']})...")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=480)
            if result.returncode == 0 and os.path.exists(output_mp4):
                print(f"   ✅ {r['name']} готов")
            else:
                print(f"   ❌ Ошибка при кодировании {r['name']}")
                if result.stderr:
                    print(f"   {result.stderr[-500:]}")
                return {'status': 'failed'}
        except Exception as e:
            print(f"   ❌ Исключение: {e}")
            return {'status': 'failed'}

    # ========== 2. Упаковка через Shaka Packager ==========
    print("\n📦 [2/2] Создание HLS через Shaka Packager...")

    for r in renditions:
        os.makedirs(os.path.join(video_dir, r['name']), exist_ok=True)
    os.makedirs(os.path.join(video_dir, "audio"), exist_ok=True)

    packager_inputs = []
    for r in renditions:
        packager_inputs.append(
            f"in={video_dir}{r['name']}.mp4,stream=video,"
            f"init_segment={video_dir}{r['name']}/init.mp4,"
            f"segment_template={video_dir}{r['name']}/$Number$.m4s"
        )
    
    if has_audio_stream(input_path):
        packager_inputs.append(
            f"in={video_dir}1080p.mp4,stream=audio,"
            f"init_segment={video_dir}audio/init.mp4,"
            f"segment_template={video_dir}audio/$Number$.m4s"
        )
    
    packager_cmd = [
        r"..\packager.exe",
        *packager_inputs,
        "--generate_static_live_mpd",
        "--hls_master_playlist_output", master_playlist,
        "--segment_duration", "6",
    ]

    print("   → Запускаем Shaka Packager...")
    hls_success = False
    try:
        result = subprocess.run(packager_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0 and os.path.exists(master_playlist):
            with open(master_playlist, 'r', encoding='utf-8') as f:
                content = f.read()
            content = content.replace('./', '')
            with open(master_playlist, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ HLS плейлист создан")
            hls_success = True
        else:
            print(f"   ❌ Ошибка Packager")
            if result.stderr:
                print(f"   {result.stderr[-500:]}")
    except Exception as e:
        print(f"   ❌ Исключение: {e}")

    # ========== 3. Вертикальная миниатюра ==========
    print("\n🖼️ Создание вертикальной миниатюры...")
    cmd_thumb = [
        FFMPEG_PATH, '-i', input_path,
        '-ss', '00:00:03', '-vframes', '1',
        '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
        '-y', thumbnail_path
    ]
    
    try:
        result = subprocess.run(cmd_thumb, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and os.path.exists(thumbnail_path):
            print("   ✅ Миниатюра создана")
    except Exception as e:
        print(f"   ❌ Ошибка миниатюры: {e}")

    # ========== 4. Обновление БД ==========
    db = get_db_session()
    try:
        from models import VidicVideo  # Используем Video, не VidicVideo!
        video = db.query(VidicVideo).filter(VidicVideo.id == video_id).first()
        
        print(f"🔍 Найдено видео в БД: {video is not None}")
        print(f"📊 hls_success: {hls_success}")
        
        if video and hls_success:
            video.hls_playlist_path = f"media/vidic_videos/{video_id}/master.m3u8"
            video.is_processed = True
            # video.is_vertical уже True
            db.commit()
            print(f"\n✅ Vidic видео {video_id} успешно обработано!")
            print(f"📁 HLS путь сохранен: {video.hls_playlist_path}")
            
            # Удаляем исходный файл
            if os.path.exists(input_path):
                os.remove(input_path)
                print(f"🗑️ Исходный файл удален: {input_path}")
        else:
            print(f"⚠️ Видео {video_id} не найдено или HLS не создан")
            if not video:
                print(f"   → Видео с id={video_id} не существует в БД")
            if not hls_success:
                print(f"   → HLS не создан")
    except Exception as e:
        print(f"❌ Ошибка БД: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()