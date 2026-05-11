import json
import os

def move_cm_to_mardi():
    # Séance CM FUSIONNÉE (ID 8260) au créneau commun
    # MARDI 10:35 (Slot 6)
    shared_cm = {
        "id": 8260,
        "module_part_id": 33,
        "teacher_id": 193, # KOURAD Hanane
        "room_id": 87,     # Amphi 1
        "slot_id": 6,      # MARDI 10:35
        "section_id": 10,  # GEG
        "td_groups": [
            {"id": 29, "name": "GB S4 Gr 1", "section_id": 9},
            {"id": 31, "name": "GEG S4 Gr 1", "section_id": 10}
        ]
    }
    
    # TD GB (ID 8285) - MERCREDI 08:30 (Slot 9)
    td_gb = {
        "id": 8285,
        "module_part_id": 34,
        "teacher_id": 231,
        "room_id": 110,
        "slot_id": 9,
        "section_id": 9,
        "td_groups": [{"id": 29, "name": "GB S4 Gr 1", "section_id": 9}]
    }

    # TD GEG (ID 8368) - MERCREDI 10:35 (Slot 10)
    td_geg = {
        "id": 8368,
        "module_part_id": 34,
        "teacher_id": 231,
        "room_id": 108,
        "slot_id": 10,
        "section_id": 10,
        "td_groups": [{"id": 31, "name": "GEG S4 Gr 1", "section_id": 10}]
    }

    files = ["generated_timetable.json", "generated_timetable_alns.json", "generated_timetable_rl.json"]
    base_path = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend"

    for filename in files:
        path = os.path.join(base_path, filename)
        if not os.path.exists(path): continue
        
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Supprimer tout ce qui concerne Dev Pers pour GB (9) et GEG (10)
        cleaned = [a for a in data if not (
            (a.get('section_id') in [9, 10] or any(g.get('id') in [29, 31] for g in a.get('td_groups', []))) 
            and a.get('module_part_id') in [33, 34]
        )]
        
        # Réinjecter avec le nouveau créneau pour le CM
        cleaned.append(shared_cm)
        cleaned.append(td_gb)
        cleaned.append(td_geg)
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, indent=4, ensure_ascii=False)
        print(f"SUCCESS: {filename} mis à jour : CM déplacé au MARDI 10:35.")

if __name__ == "__main__":
    move_cm_to_mardi()
