# reset_db.py
from models import Base, engine
import psycopg2
from sqlalchemy import text

print("🔄 Подготовка к пересозданию таблиц...")

# Удаляем все таблицы
print("🗑️ Удаляем старые таблицы...")
Base.metadata.drop_all(bind=engine)

# Создаем новые таблицы
print("🏗️ Создаем новые таблицы...")
Base.metadata.create_all(bind=engine)

print("✅ База данных успешно пересоздана!")

# Проверяем, что таблицы создались
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """))
    tables = [row[0] for row in result]
    print(f"📊 Созданные таблицы: {', '.join(tables)}")