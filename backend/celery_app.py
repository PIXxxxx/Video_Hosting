from celery import Celery
import subprocess
import os
import sys

sys.path.append(os.path.dirname(__file__))

FFMPEG_PATH = r"C:\ffmpeg\bin\ffmpeg.exe"

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

os.makedirs("media/videos", exist_ok=True)
os.makedirs("media/thumbnails", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

def get_db_session():
    from database import SessionLocal
    return SessionLocal()

def has_audio_stream(file_path):
    cmd = [FFMPEG_PATH, '-i', file_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return 'Audio:' in result.stderr

@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, video_id, input_path):
    """Оптимизированная обработка видео: FFmpeg + Shaka Packager"""
    
    print(f"\n{'='*85}")
    print(f"🎬 ОБРАБОТКА ВИДЕО {video_id}")
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

    # ========== 1. Кодирование разных качеств (ОДИН РАЗ) ==========
    print("\n🔄 [1/2] Кодирование видео в разные качества...")
    
    # Только ОДИН список качеств (убрал дублирование)
    renditions = [
        {"name": "360p",  "width": 640,  "height": 360,  "bitrate": "800k",  "maxrate": "856k",  "bufsize": "1200k"},
        {"name": "480p",  "width": 854,  "height": 480,  "bitrate": "1400k", "maxrate": "1498k", "bufsize": "2100k"},
        {"name": "720p",  "width": 1280, "height": 720,  "bitrate": "2800k", "maxrate": "2996k", "bufsize": "4200k"},
        {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k", "maxrate": "5350k", "bufsize": "7500k"},
    ]

    # Кодируем КАЖДОЕ качество ОДИН раз
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

        print(f"   → Кодирую {r['name']} ({r['bitrate']})...")
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

    # Создаем директории для каждого качества
    for r in renditions:
        os.makedirs(os.path.join(video_dir, r['name']), exist_ok=True)
    os.makedirs(os.path.join(video_dir, "audio"), exist_ok=True)

    # Формируем команду Packager (динамически)
    packager_inputs = []
    for r in renditions:
        packager_inputs.append(
            f"in={video_dir}{r['name']}.mp4,stream=video,"
            f"init_segment={video_dir}{r['name']}/init.mp4,"
            f"segment_template={video_dir}{r['name']}/$Number$.m4s"
        )
    
    # Добавляем аудио (из 1080p)
    if has_audio_stream(input_path):
        packager_inputs.append(
            f"in={video_dir}1080p.mp4,stream=audio,"
            f"init_segment={video_dir}audio/init.mp4,"
            f"segment_template={video_dir}audio/$Number$.m4s"
        )
    
    packager_cmd = [
        r"..\packager.exe",
        *packager_inputs,  # распаковываем список
        "--generate_static_live_mpd",
        "--hls_master_playlist_output", master_playlist,
        "--segment_duration", "6",
    ]

    print("   → Запускаем Shaka Packager...")
    hls_success = False
    try:
        result = subprocess.run(packager_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0 and os.path.exists(master_playlist):
            # Исправляем пути в master.m3u8
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

    # ========== 3. Миниатюра ==========
    print("\n🖼️ Создание миниатюры...")
    cmd_thumb = [
        FFMPEG_PATH, '-i', input_path,
        '-ss', '00:00:03', '-vframes', '1',
        '-vf', 'scale=1280:-1',
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
        from models import Video
        video = db.query(Video).filter(Video.id == video_id).first()
        if video and hls_success:
            video.hls_playlist_path = f"media/videos/{video_id}/master.m3u8"
            video.is_processed = True
            db.commit()
            print(f"\n✅ Видео {video_id} успешно обработано")
    except Exception as e:
        print(f"❌ Ошибка БД: {e}")
        db.rollback()
    finally:
        db.close()

    return {'status': 'processed' if hls_success else 'failed'}