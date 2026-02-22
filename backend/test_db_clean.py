# test_db_clean.py
from sqlalchemy import create_engine, text

# Пишем строку вручную, без копирования
DB_USER = "admin"
DB_PASSWORD = "password"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "video_db"

# Собираем строку из частей
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Длина строки: {len(DATABASE_URL)}")
print(f"Символы строки: {[ord(c) for c in DATABASE_URL]}")

try:
    print(f"🔌 Подключение к: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Успешное подключение к PostgreSQL!")
        
except Exception as e:
    print(f"❌ Ошибка: {e}")
    print("\n🔍 Диагностика:")
    print(f"Тип ошибки: {type(e)}")
    print(f"Аргументы ошибки: {e.args}")