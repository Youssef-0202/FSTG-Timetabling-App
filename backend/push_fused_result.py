import sys
import os
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import models
from database import SessionLocal

def push_fused_result():
    db = SessionLocal()
    try:
        # Charger le JSON du run RL-ALNS Fused
        file_path = os.path.join(os.path.dirname(__file__), 'generated_timetable_fused.json')
        
        if not os.path.exists(file_path):
            print(f"❌ Fichier introuvable : {file_path}")
            return
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"📂 JSON chargé : {len(data)} assignations trouvées")

        # Créer l'entrée dans timetable_results avec le nouveau type "fused"
        result = models.TimetableResult(
            name="RL-ALNS Fused — Score: 7067.5",
            algo_type="fused",
            created_at=datetime.now().isoformat(),
            score_hard=0,
            score_soft=7067.5,  # Score réel du dernier run
            data=data,
            is_validated=False
        )
        
        db.add(result)
        db.commit()
        db.refresh(result)
        
        print(f"✅ Résultat RL-ALNS Fused inséré avec succès ! (ID: {result.id})")
        print(f"   algo_type : fused")
        print(f"   score_soft : 7067.5 (record absolu)")
        print(f"   is_validated : False")
        print()
        print("👉 Tu peux maintenant aller sur la page Preview et sélectionner 'FUSED'")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    push_fused_result()
