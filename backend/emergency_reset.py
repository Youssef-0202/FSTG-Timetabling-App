
import models
from database import SessionLocal

def reset_and_init():
    db = SessionLocal()
    try:
        from sqlalchemy import text
        # 1. On s'assure que c'est vide
        db.execute(text("DELETE FROM assignment_tdgroups"))
        db.execute(text("DELETE FROM assignments"))
        
        # 2. On récupère toutes les parties de modules qui doivent être placées
        parts = db.query(models.ModulePart).all()
        print(f"Initialisation de {len(parts)} affectations...")
        
        for p in parts:
            # Création d'une affectation vierge
            new_a = models.Assignment(
                module_part_id=p.id,
                teacher_id=p.teacher_id, # On met le prof par défaut défini dans le module_part
                room_id=None,
                slot_id=None,
                is_locked=False
            )
            db.add(new_a)
        
        db.commit()
        print("Base de travail réinitialisée avec succès !")
    except Exception as e:
        print(f"Erreur : {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_init()
