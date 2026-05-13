import json
import requests
import os
from datetime import datetime

API_URL = "http://localhost:8000/timetable-results"
BACKEND_DIR = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend"

files_to_migrate = [
    {"file": "generated_timetable_alns_v1.json", "type": "alns", "name": "ILS-ALNS"},
    {"file": "generated_timetable_rl.json", "type": "rl", "name": "Reinforcement Learning"},
    {"file": "generated_timetable.json", "type": "ga_sa", "name": "GA-SA Hybrid"}
]

def migrate():
    print("--- Migration des fichiers JSON vers la Base de Données ---")
    for item in files_to_migrate:
        file_path = os.path.join(BACKEND_DIR, item["file"])
        
        if not os.path.exists(file_path):
            print(f" [SKIP] {item['file']} non trouvé. Ignoré.")
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Préparation du payload
            # Comme on n'a pas les scores exacts dans le JSON, on met des valeurs par défaut pour le test
            payload = {
                "algo_type": item["type"],
                "created_at": datetime.now().isoformat(),
                "score_hard": 0,
                "score_soft": 75.0, # Score fictif pour le test
                "data": data,
                "is_validated": False
            }
            
            response = requests.post(API_URL, json=payload)
            
            if response.status_code == 201:
                print(f" [SUCCESS] {item['name']} ({item['file']}) archivé en base de données.")
            else:
                print(f" [ERROR] Échec pour {item['name']}: {response.text}")
                
        except Exception as e:
            print(f" [CRITICAL] Une erreur est survenue pour {item['name']}: {e}")

if __name__ == "__main__":
    migrate()
