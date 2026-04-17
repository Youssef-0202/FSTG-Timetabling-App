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
    new_capacity = sum(g.get('size', 0) for g in child_groups)
    current = int(s.get('total_capacity') or 0)
    target = int(new_capacity)
    
    if current != target:
        print(f"!!! ACTION : Mise à jour Section {s['name']} : {current} -> {target} étudiants")
        
        g_ids = [g['id'] for g in s.get('groupes', [])]
        payload = {
            "name": s['name'],
            "semestre": s['semestre'],
            "total_capacity": target,
            "groupe_ids": g_ids
        }
        
        resp = requests.put(f"{API_BASE}/sections/{section_id}", json=payload)
        if resp.status_code == 200:
            print(f"  OK : Section {s['name']} mise à jour.")
            updated_count += 1
        else:
            print(f"  ERREUR sur {s['name']}: {resp.status_code} - {resp.text}")
    else:
        print(f"  IDEM : Section {s['name']} déjà à jour ({current}).")
        
print(f"\n--- Synchronisation terminée : {updated_count} sections mises à jour ---")
