# utils/file_validator.py
import os
import mimetypes
from fastapi import HTTPException, UploadFile

# Белый список разрешенных расширений
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v'}
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

# Соответствие расширений MIME типам
EXTENSION_TO_MIME = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.flv': 'video/x-flv',
    '.m4v': 'video/x-m4v',
}


def get_safe_extension(filename: str, allowed_extensions: set = None) -> str:
    
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_VIDEO_EXTENSIONS
    
    # Берем только последнее расширение (защита от .tar.gz)
    ext = os.path.splitext(filename)[1].lower()
    
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Файл не имеет расширения"
        )
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемое расширение: {ext}. Разрешенные: {', '.join(sorted(allowed_extensions))}"
        )
    
    return ext


def validate_video_file(file: UploadFile) -> str:
    
    # 1. Проверяем расширение
    ext = get_safe_extension(file.filename, ALLOWED_VIDEO_EXTENSIONS)
    
    # 2. Проверяем MIME тип
    expected_mime = EXTENSION_TO_MIME.get(ext)
    if expected_mime and not file.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail=f"MIME тип {file.content_type} не соответствует расширению {ext}"
        )
    
    # 3. Проверяем, что это действительно видео (опционально, через магические числа)
    if not file.content_type.startswith('video/'):
        raise HTTPException(
            status_code=400,
            detail="Файл должен быть видео"
        )
    
    return ext

