import models
from database import SessionLocal
from sqlalchemy.orm import Session
from datetime import time

def verify():
    db = SessionLocal()
    print("\n--- RÉSUMÉ DE LA BASE DE DONNÉES ---")
    
    print(f"\nFilières (Cycles) : {db.query(models.Filiere).count()}")
    for f in db.query(models.Filiere).all():
        print(f" - {f.name} ({f.type})")

    print(f"\nSections CM (Regroupements) : {db.query(models.Section).count()}")
    for s in db.query(models.Section).all():
        cohort_names = [f"{g.filiere.name}-{g.semestre}" for g in s.groupes]
        print(f" - {s.name} | Cohortes: {cohort_names}")

    print(f"\nModules extraits : {db.query(models.Module).count()}")
    for m in db.query(models.Module).limit(8).all():
        print(f" - {m.name} ({m.code})")

    print(f"\nAffectations (Emploi du Temps) : {db.query(models.Assignment).count()}")
    cm = db.query(models.Assignment).join(models.ModulePart).filter(models.ModulePart.type=="CM").count()
    td = db.query(models.Assignment).join(models.ModulePart).filter(models.ModulePart.type=="TD").count()
    print(f" - CM (Amphi) : {cm}")
    print(f" - TD/TP (Salles) : {td}")

    print("\n--- DÉTAILS LUNDI MATIN ---")
    try:
        monday_s1 = db.query(models.Assignment).join(models.Timeslot).filter(
            models.Timeslot.day == "LUNDI", 
            models.Timeslot.start_time >= time(8,30),
            models.Timeslot.start_time < time(10,0)
        ).all()
        for a in monday_s1:
            m_name = a.module_part.module.name
            type_s = a.module_part.type
            room = a.room.name
            target = a.section.name if a.section_id else f"Gr TD: {[g.name for g in a.td_groups]}"
            print(f" * 8h30 | {type_s} | {m_name} | {target} | Salle: {room}")
    except Exception as e:
        print(f"Erreur rendu: {e}")

    db.close()

if __name__ == "__main__":
    verify()
