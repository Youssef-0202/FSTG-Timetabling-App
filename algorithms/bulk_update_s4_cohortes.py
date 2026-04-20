import requests

API_BASE = "http://localhost:8000"
TARGET_S = "S4"
NEW_SIZE = 63

# 1. Récupérer toutes les cohortes
cohortes = requests.get(f"{API_BASE}/groupe-filieres").json()

updated_count = 0
for c in cohortes:
    if c['semestre'] == TARGET_S:
        print(f"Mise à jour Cohorte #{c['id']} ({c['academic_year']}) -> {NEW_SIZE} étudiants")
        
        payload = {
            "filiere_id": c['filiere_id'],
            "semestre": c['semestre'],
            "academic_year": c['academic_year'],
            "total_students": NEW_SIZE
        }
        
        resp = requests.put(f"{API_BASE}/groupe-filieres/{c['id']}", json=payload)
        if resp.status_code == 200:
            updated_count += 1
        else:
            print(f"Erreur sur #{c['id']}: {resp.text}")

print(f"\n--- Terminé : {updated_count} cohortes S4 mises à jour à {NEW_SIZE} ---")
