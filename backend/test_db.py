# test_db.py
from sqlalchemy import create_engine, text

# Строка подключения
DATABASE_URL = "postgresql://admin:password@localhost:5432/video_db"

try:
    print(f"🔌 Подключение к: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Успешное подключение к PostgreSQL!")
        
        # Проверяем список таблиц
        tables = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)).fetchall()
        
        print(f"📊 Таблицы в базе: {[t[0] for t in tables]}")
        
except Exception as e:
    print(f"❌ Ошибка: {e}")