from database import SessionLocal
import models

def last_check():
    db = SessionLocal()
    assigns = db.query(models.Assignment).all()
    print(f"Total assignments: {len(assigns)}")
    # CM Example
    cm = [a for a in assigns if a.section_id is not None][:3]
    for a in cm:
        print(f"CM: ID {a.id}, Room {a.room.name if a.room else None}, Section {a.section.name}")
    
    # TD Example
    td = [a for a in assigns if a.td_groups][:10]
    for a in td:
        g_names = ", ".join([g.name for g in a.td_groups])
        print(f"TD: ID {a.id}, Room {a.room.name if a.room else None}, Groups [{g_names}]")
    db.close()

if __name__ == "__main__":
    last_check()
