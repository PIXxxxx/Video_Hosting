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
    """Полная обработка видео: Multi-quality HLS + миниатюра + превью"""
    
    print(f"\n{'='*60}")
    print(f"🎬 НАЧАЛО ОБРАБОТКИ ВИДЕО {video_id} (multi-quality)")
    print(f"{'='*60}")
    print(f"📁 Входной файл: {input_path}")
    print(f"📁 Файл существует: {os.path.exists(input_path)}")
    
    if not os.path.exists(input_path):
        print("❌ Входной файл НЕ НАЙДЕН — прерываем задачу")
        return {'status': 'failed', 'error': 'input file not found'}
    
    # Папки
    video_dir = f"media/videos/{video_id}/"
    thumbnails_dir = "media/thumbnails/"
    
    os.makedirs(video_dir, exist_ok=True)
    os.makedirs(thumbnails_dir, exist_ok=True)
    
    # Пути
    master_playlist = os.path.join(video_dir, "master.m3u8")
    preview_path   = os.path.join(video_dir, "preview.mp4")
    thumbnail_path = os.path.join(thumbnails_dir, f"{video_id}.jpg")
    
    print(f"📄 Master плейлист: {master_playlist}")
    print(f"📄 Превью:         {preview_path}")
    print(f"📄 Миниатюра:      {thumbnail_path}")
    
    if not os.path.exists(FFMPEG_PATH):
        error_msg = f"❌ FFmpeg не найден: {FFMPEG_PATH}"
        print(error_msg)
        return {'status': 'failed', 'error': error_msg}
    
    results = {}
    
    print(f"\n{'#'*50}")
    print("🔄 ШАГ 1/3: Создание multi-quality HLS (master.m3u8)")
    print(f"{'#'*50}")
    
    renditions = [
        {"name": "360p",  "width": 640,  "height": 360,  "bitrate": "800k",  "audio_bitrate": "96k"},
        {"name": "480p",  "width": 854,  "height": 480,  "bitrate": "1400k", "audio_bitrate": "128k"},
        {"name": "720p",  "width": 1280, "height": 720,  "bitrate": "2800k", "audio_bitrate": "128k"},
        {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "5000k", "audio_bitrate": "192k"},
    ]
    
    cmd = [FFMPEG_PATH, '-i', input_path]
    var_stream_map = []
    
    for i, r in enumerate(renditions):
        # Масштабирование с сохранением пропорций + чёрные полосы при необходимости
        vf = f"scale={r['width']}:{r['height']}:force_original_aspect_ratio=decrease,pad={r['width']}:{r['height']}:(ow-iw)/2:(oh-ih)/2"
        
        cmd.extend([
            '-filter:v:' + str(i), vf,
            '-c:v:' + str(i), 'libx264', '-preset', 'veryfast',
            '-b:v:' + str(i), r['bitrate'],
            '-maxrate:v:' + str(i), r['bitrate'],
            '-bufsize:v:' + str(i), str(int(r['bitrate'][:-1]) * 2) + 'k',
            '-c:a:' + str(i), 'aac', '-b:a:' + str(i), r['audio_bitrate'],
        ])
        
        # Сегменты и плейлист для каждой версии
        segment_path = os.path.join(video_dir, f"v{i}_%03d.ts")
        playlist_path = os.path.join(video_dir, f"v{i}.m3u8")
        
        cmd.extend([
            '-f', 'hls',
            '-hls_time', '6',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segment_path,
            playlist_path
        ])
        
        var_stream_map.append(f"v:{i},a:{i if i == 0 else 0},name:{r['name']}")
    
    # Финальная часть — master плейлист
    cmd.extend([
        '-var_stream_map', ' '.join(var_stream_map),
        '-master_pl_name', 'master.m3u8',
        '-f', 'hls',
        master_playlist
    ])
    
    print("FFmpeg команда (multi-quality):")
    print(' '.join(cmd))
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)  # 30 мин макс
        results['hls'] = result.returncode == 0
        
        if results['hls'] and os.path.exists(master_playlist):
            print(f"✅ Multi-HLS создан! Master: {master_playlist}")
            size = os.path.getsize(master_playlist)
            print(f"   Размер master.m3u8: {size} байт")
        else:
            print(f"❌ Ошибка HLS (код {result.returncode})")
            print(f"STDERR: {result.stderr[:800]}")
    except Exception as e:
        print(f"❌ Исключение при HLS: {type(e).__name__}: {e}")
        results['hls'] = False
    
    # ────────────────────────────────────────────────
    # 2. Миниатюра — максимально простой вариант для диагностики
    # ────────────────────────────────────────────────
    print(f"\n{'#'*60}")
    print("🖼️ ШАГ 2/3: Создание миниатюры (ДИАГНОСТИКА)")
    print(f"{'#'*60}")

    thumbnails_dir = "media/thumbnails/"
    os.makedirs(thumbnails_dir, exist_ok=True)
    thumbnail_path = os.path.join(thumbnails_dir, f"{video_id}.jpg")

    print(f"Путь к миниатюре: {thumbnail_path}")
    print(f"FFmpeg путь: {FFMPEG_PATH}")
    print(f"Исходный файл существует: {os.path.exists(input_path)}")

    # Самая простая команда FFmpeg
    cmd_thumb = [
        FFMPEG_PATH,
        '-i', input_path,
        '-ss', '00:00:03',      # берём 3 секунду
        '-vframes', '1',
        '-y', thumbnail_path
    ]

    print("Выполняем команду:")
    print(' '.join(cmd_thumb))

    try:
        result = subprocess.run(cmd_thumb, capture_output=True, text=True, timeout=30)

        print(f"Код возврата FFmpeg: {result.returncode}")
        if result.stdout:
            print(f"STDOUT: {result.stdout[:300]}...")
        if result.stderr:
            print(f"STDERR: {result.stderr[-500:]}")

        if result.returncode == 0 and os.path.exists(thumbnail_path):
            print(f"✅ Миниатюра УСПЕШНО создана: {thumbnail_path}")
            print(f"Размер файла: {os.path.getsize(thumbnail_path)} байт")
            results['thumbnail'] = True
        else:
            print("❌ Миниатюра НЕ создана")
            results['thumbnail'] = False

    except Exception as e:
        print(f"❌ Исключение при создании миниатюры: {type(e).__name__}: {e}")
        results['thumbnail'] = False
    
    # ────────────────────────────────────────────────
    # 3. Превью для hover (10 сек, 640x360)
    # ────────────────────────────────────────────────
    print(f"\n{'#'*50}")
    print("🎬 ШАГ 3/3: Превью-видео (hover)")
    print(f"{'#'*50}")
    
    cmd_preview = [
        FFMPEG_PATH, '-i', input_path,
        '-ss', '00:00:03', '-t', '10',
        '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264', '-preset', 'veryfast',
        '-c:a', 'aac',
        '-y', preview_path
    ]
    
    try:
        res_prev = subprocess.run(cmd_preview, capture_output=True, text=True)
        results['preview'] = res_prev.returncode == 0
        if results['preview']:
            print(f"✅ Превью: {preview_path}")
    except Exception as e:
        print(f"❌ Ошибка превью: {e}")
        results['preview'] = False
    
    # ────────────────────────────────────────────────
    # Обновление БД — важно: теперь путь к master.m3u8
    # ────────────────────────────────────────────────
    db = get_db_session()
    try:
        from models import Video
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            if results.get('hls') and os.path.exists(master_playlist):
                # Относительный путь для фронта
                video.hls_playlist_path = f"videos/{video_id}/master.m3u8"
            video.is_processed = True
            db.commit()
            print(f"✅ Видео {video_id} обновлено в БД (master.m3u8)")
        else:
            print(f"❌ Видео {video_id} не найдено в БД")
    except Exception as e:
        print(f"❌ Ошибка БД: {e}")
        db.rollback()
    finally:
        db.close()
    
    # Итог
    print(f"\n{'='*60}")
    print(f"📊 ИТОГИ ОБРАБОТКИ {video_id}")
    print(f"{'='*60}")
    print(f"  Multi-HLS:   {'✅' if results.get('hls') else '❌'}")
    print(f"  Миниатюра:   {'✅' if results.get('thumbnail') else '❌'}")
    print(f"  Превью:      {'✅' if results.get('preview') else '❌'}")
    print(f"{'='*60}\n")
    
    return {
        'video_id': video_id,
        'status': 'processed' if results.get('hls') else 'failed',
        'results': results
    }