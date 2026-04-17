import requests

API_BASE = "http://localhost:8000"

# 1. Récupérer les données
sections = requests.get(f"{API_BASE}/sections").json()
td_groups = requests.get(f"{API_BASE}/td-groups").json()

print(f"Synchronisation de {len(sections)} sections...")

updated_count = 0

for s in sections:
    section_id = s['id']
    # Filtrer les groupes appartenant à cette section
    child_groups = [g for g in td_groups if g.get('section_id') == section_id]
    
    if not child_groups:
        print(f"Section {s['name']} (# {section_id}) : Aucun groupe TD trouvé. On ignore.")
        continue
        
    new_capacity = sum(g.get('size', 0) for g in child_groups)
    
    if s.get('total_capacity') != new_capacity:
        print(f"Mise à jour Section {s['name']} : {s.get('total_capacity')} -> {new_capacity} étudiants")
        
        payload = {
            "name": s['name'],
            "semestre": s['semestre'],
            "total_capacity": new_capacity,
            "groupe_ids": [g['id'] for g in s.get('groupes', [])]
        }
        
        resp = requests.put(f"{API_BASE}/sections/{section_id}", json=payload)
        if resp.status_code == 200:
            updated_count += 1
        else:
            print(f"Erreur sur {s['name']}: {resp.text}")
        
print(f"\n--- Synchronisation terminée : {updated_count} sections mises à jour ---")
