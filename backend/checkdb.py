from database import SessionLocal
from models import Video, VidicVideo

db = SessionLocal()

# Посмотри все видео
for v in db.query(Video).all():
    print(f"ID:{v.id} processed:{v.is_processed} private:{v.is_private} {v.title[:40]}")

# Удали необработанные
db.query(Video).filter(Video.is_processed == False).delete()
db.commit()

print("Очищено!")
db.close()