from sqlalchemy.orm import Session
from database import SessionLocal
import models

def check_entities():
    db = SessionLocal()
    print("--- ROOMS ---")
    rooms = db.query(models.Room).all()
    for r in rooms:
        print(f"ID: {r.id}, Name: {r.name}, Type: {r.type}")
    
    print("\n--- TD GROUPS ---")
    groups = db.query(models.TDGroup).all()
    for g in groups:
        print(f"ID: {g.id}, Name: {g.name}, Section_ID: {g.section_id}")
    db.close()

if __name__ == "__main__":
    check_entities()
