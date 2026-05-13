import sys
import os

# Ajout du chemin pour importer les modèles
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, engine
import models

def clean_and_update_db():
    db = SessionLocal()
    try:
        # 1. Supprimer toutes les données existantes dans timetable_results car le schéma a changé
        db.query(models.TimetableResult).delete()
        print("Table timetable_results vidée.")
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Erreur lors du nettoyage : {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_and_update_db()
