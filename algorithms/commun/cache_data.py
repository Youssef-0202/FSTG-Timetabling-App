import requests
import json
import os

API_BASE_URL = "http://localhost:8000"
CACHE_FILE = "data_cache.json"

def cache_all():
    print("--- Mise en cache des données API ---")
    data = {}
    endpoints = ["rooms", "teachers", "timeslots", "sections", "td-groups", "module-parts", "assignments"]
    
    for ep in endpoints:
        print(f" Récupération de {ep}...")
        try:
            resp = requests.get(f"{API_BASE_URL}/{ep}")
            data[ep] = resp.json()
        except Exception as e:
            print(f" Erreur sur {ep}: {e}")
            return

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print(f"--- Succès ! Données stockées dans {CACHE_FILE} ---")

if __name__ == "__main__":
    cache_all()
