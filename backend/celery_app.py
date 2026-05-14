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

def run_ffmpeg(cmd, timeout=480):
    """Запуск FFmpeg с правильной кодировкой"""
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=timeout)

def has_audio_stream(file_path):
    cmd = [FFMPEG_PATH, '-i', file_path, '-hide_banner']
    result = run_ffmpeg(cmd, timeout=10)
    return 'Audio:' in result.stderr

def get_video_dimensions(file_path):
    """Получить ширину и высоту видео"""
    cmd = [FFMPEG_PATH, '-i', file_path, '-hide_banner']
    result = run_ffmpeg(cmd, timeout=10)
    for line in result.stderr.split('\n'):
        if 'Stream' in line and 'Video' in line:
            # Ищем что-то вроде "1920x1080" или "1080x1080"
            import re
            match = re.search(r'(\d{2,4})x(\d{2,4})', line)
            if match:
                return int(match.group(1)), int(match.group(2))
    return None, None

@celery_app.task(bind=True, name='process_video_task')
def process_video_task(self, video_id, input_path):
    """Обработка видео с поддержкой любых соотношений сторон"""
    
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

    # Определяем размеры исходного видео
    src_width, src_height = get_video_dimensions(input_path)
    if not src_width:
        print("⚠️ Не удалось определить размеры видео, использую 16:9")
        src_width, src_height = 1920, 1080
    
    aspect_ratio = src_width / src_height
    print(f"📐 Исходное видео: {src_width}x{src_height} (соотношение: {aspect_ratio:.2f})")

    # ========== 1. Кодирование ==========
    print("\n🔄 [1/2] Кодирование видео...")
    
    # Динамические разрешения с сохранением пропорций
    renditions = [
        {"name": "360p",  "height": 360},
        {"name": "480p",  "height": 480},
        {"name": "720p",  "height": 720},
        {"name": "1080p", "height": 1080},
    ]
    
    # Не кодируем качество выше исходного
    renditions = [r for r in renditions if r["height"] <= src_height]

    for r in renditions:
        h = r["height"]
        w = round(h * aspect_ratio)
        # Ширина должна быть чётной
        if w % 2 != 0:
            w += 1
        
        output_mp4 = os.path.join(video_dir, f"{r['name']}.mp4")
        
        bitrate_map = {360: "800k", 480: "1400k", 720: "2800k", 1080: "5000k"}
        maxrate_map = {360: "856k", 480: "1498k", 720: "2996k", 1080: "5350k"}
        bufsize_map = {360: "1200k", 480: "2100k", 720: "4200k", 1080: "7500k"}
        
        cmd = [
            FFMPEG_PATH, '-i', input_path,
            '-vf', f"scale={w}:{h}:force_original_aspect_ratio=decrease",
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-b:v', bitrate_map.get(h, "1400k"),
            '-maxrate', maxrate_map.get(h, "1498k"),
            '-bufsize', bufsize_map.get(h, "2100k"),
            '-profile:v', 'high',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '48000',
            '-ac', '2',
            '-movflags', '+faststart',
            '-y',
            output_mp4
        ]

        print(f"   → Кодирую {r['name']} ({w}x{h})...")
        try:
            result = run_ffmpeg(cmd, timeout=480)
            if result.returncode == 0 and os.path.exists(output_mp4):
                print(f"   ✅ {r['name']} готов ({w}x{h})")
            else:
                print(f"   ❌ Ошибка при кодировании {r['name']}")
                if result.stderr:
                    print(f"   {result.stderr[-300:]}")
                return {'status': 'failed'}
        except Exception as e:
            print(f"   ❌ Исключение: {e}")
            return {'status': 'failed'}

    # ========== 2. Shaka Packager ==========
    print("\n📦 [2/2] Создание HLS...")

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
    
    # Аудио из лучшего качества
    best_quality = renditions[-1]["name"]
    if has_audio_stream(input_path):
        packager_inputs.append(
            f"in={video_dir}{best_quality}.mp4,stream=audio,"
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
        result = run_ffmpeg(packager_cmd, timeout=300)
        
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
                print(f"   {result.stderr[-300:]}")
    except Exception as e:
        print(f"   ❌ Исключение: {e}")

    # ========== 3. Миниатюра ==========
    print("\n🖼️ Создание миниатюры...")
    cmd_thumb = [
        FFMPEG_PATH, '-i', input_path,
        '-ss', '00:00:02', '-vframes', '1',
        '-vf', 'scale=1280:-1',
        '-y', thumbnail_path
    ]
    
    try:
        result = run_ffmpeg(cmd_thumb, timeout=30)
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