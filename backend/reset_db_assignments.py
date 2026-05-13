import sys
import os

# Ajout du chemin pour importer les modèles
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
import models

def reset_assignments():
    db = SessionLocal()
    try:
        # Met à NULL slot_id et room_id pour les affectations non verrouillées
        affected_rows = db.query(models.Assignment).filter(models.Assignment.is_locked == False).update({
            models.Assignment.slot_id: None,
            models.Assignment.room_id: None
        }, synchronize_session=False)
        
        db.commit()
        print(f"Succès : {affected_rows} affectations ont été réinitialisées (slot=NULL, room=NULL).")
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de la réinitialisation : {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_assignments()
