import json
import os

def diagnose():
    path = r'c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend\generated_timetable.json'
    if not os.path.exists(path):
        print("Fichier non trouvé.")
        return

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    assignments = data.get('assignments', [])
    print(f"Analyse de {len(assignments)} séances...")

    # 1. Identifier les cours du Samedi
    sat_assignments = [a for a in assignments if a['timeslot']['day'] == "SAMEDI"]
    print(f"\n--- COURS SUR LE SAMEDI ({len(sat_assignments)}) ---")
    for a in sat_assignments:
        print(f"ID: {a['module_part']['id']} | {a['module_part']['module_id']} ({a['module_part']['type']})")
        print(f"  Prof: {a['module_part']['teacher_id']} | Salle: {a['room']['name']}")
        if a['module_part'].get('is_locked'):
            print("  ATTENTION: Ce cours est VERROUILLÉ (Locked) !")

    # 2. Identifier les chevauchements H3
    slots = {}
    overlaps = []
    for a in assignments:
        tid = a['timeslot']['id']
        for gid in a['module_part'].get('td_group_ids', []):
            key = (gid, tid)
            if key in slots:
                overlaps.append(f"Groupe {gid} en conflit sur le créneau {tid}")
                overlaps.append(f"  - {slots[key]['module_part']['module_id']}")
                overlaps.append(f"  - {a['module_part']['module_id']}")
            slots[key] = a
    
    if overlaps:
        print(f"\n--- CHEVAUCHEMENTS DÉTECTÉS ({len(overlaps)//3}) ---")
        for line in overlaps:
            print(line)

diagnose()
