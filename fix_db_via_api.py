import requests

API_URL = "http://localhost:8000"

def fix_gi_s4():
    print("--- Recuperation des affectations ---")
    resp = requests.get(f"{API_URL}/assignments")
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}")
        return
    
    assignments = resp.json()
    
    # IDs des groupes pour GI S4
    GR1_ID = 19
    GR2_ID = 20
    GR3_ID = 33

    to_duplicate = []
    for a in assignments:
        gids = [g['id'] for g in a.get('td_groups', [])]
        if GR1_ID in gids:
            to_duplicate.append(a)

    print(f"Trouve {len(to_duplicate)} TD pour le Groupe 1. Duplication pour G2 et G3...")

    created = 0
    for a in to_duplicate:
        for new_gid in [GR2_ID, GR3_ID]:
            # On verifie si le groupe n'est pas DEJA dans une assignment identique
            # Pour eviter les doublons infinis si on relance le script
            payload = {
                "module_part_id": a['module_part_id'],
                "teacher_id": a['teacher_id'],
                "section_id": a['section_id'],
                "is_locked": False,
                "room_id": None,
                "slot_id": None,
                "tdgroup_ids": [new_gid]
            }
            
            res = requests.post(f"{API_URL}/assignments", json=payload)
            if res.status_code == 201:
                created += 1
    
    print(f"Done! {created} nouvelles affectations creees.")

if __name__ == "__main__":
    fix_gi_s4()
