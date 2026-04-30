import sys
import os

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager

def check_prof_saturation():
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    # 1. Identifier l'occupation des profs par les CM
    prof_busy_slots = {}
    for mp in dm.module_parts:
        if mp.type == "CM" and mp.teacher_id:
            if mp.teacher_id not in prof_busy_slots: prof_busy_slots[mp.teacher_id] = set()
            if mp.fixed_slot_id:
                prof_busy_slots[mp.teacher_id].add(mp.fixed_slot_id)
            
    with open('prof_report.txt', 'w', encoding='utf-8') as f:
        f.write("-" * 60 + "\n")
        f.write("DIAGNOSTIC DE SATURATION DES ENSEIGNANTS\n")
        f.write("-" * 60 + "\n")
        
        total_slots = len(dm.timeslots)
        for tid, prof in dm.teacher_map.items():
            if tid == 231: continue # On ignore le prof générique
            
            cm_busy = len(prof_busy_slots.get(tid, []))
            # actual_busy = len(prof_busy_slots.get(tid, set()).union(set(prof.unavailable_slots)))
            # SIMPLIFICATION : On ne compte que les CM pour l'instant
            actual_busy = cm_busy
            free = total_slots - actual_busy
            
            # Combien de TD ce prof doit encore assurer ?
            td_sessions = len([mp for mp in dm.module_parts if mp.type != "CM" and mp.teacher_id == tid])
            
            if td_sessions > 0:
                status = "OK"
                if free < td_sessions: status = "!!! SATURÉ !!!"
                elif free < td_sessions + 2: status = "TENDU"
                
                line = f"Prof {tid:3} ({prof.name:20}) : CM={actual_busy:2} | Libres={free:2} | TD_à_faire={td_sessions:2} | {status}\n"
                f.write(line)
                print(line.strip())

if __name__ == "__main__":
    check_prof_saturation()
