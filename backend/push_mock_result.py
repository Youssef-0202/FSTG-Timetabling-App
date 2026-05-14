import sys
import os
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import models
from database import SessionLocal

def push_mock_result():
    db = SessionLocal()
    try:
        # Charger le JSON simulé
        file_path = os.path.join(os.path.dirname(__file__), 'generated_timetable_alns_v1.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Créer l'entrée dans timetable_results comme si l'ALNS venait de s'exécuter
        mock_result = models.TimetableResult(
            algo_type="alns",
            created_at=datetime.now().isoformat(),
            score_hard=0,
            score_soft=8540,  # Score fictif pour le test
            data=data,
            is_validated=False
        )
        
        db.add(mock_result)
        db.commit()
        
        print("✅ Données Mock ALNS insérées avec succès dans 'timetable_results' !")
        print("👉 Tu peux maintenant recharger ta page Preview pour tester.")
        
    except Exception as e:
        db.rollback()
        print(f"Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    push_mock_result()
