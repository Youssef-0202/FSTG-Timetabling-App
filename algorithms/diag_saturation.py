import sys
import os

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager

def check_saturation():
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    # 1. Identifier les CM (Cours verrouillés)
    cm_slots_per_group = {}
    for mp in dm.module_parts:
        if mp.type == "CM":
            # Un CM bloque tous les groupes de la section
            # (Note: Dans ton code, Phase 1 place les CM et fixe leur slot)
            # Mais ici on regarde ce qui est fixe en DB.
            if mp.fixed_slot_id:
                for gid in mp.td_group_ids:
                    if gid not in cm_slots_per_group: cm_slots_per_group[gid] = set()
                    cm_slots_per_group[gid].add(mp.fixed_slot_id)
    
    with open('sat_report.txt', 'w', encoding='utf-8') as f:
        f.write("-" * 50 + "\n")
        f.write("DIAGNOSTIC DE SATURATION DES GROUPES TD\n")
        f.write("-" * 50 + "\n")
        
        total_slots = len(dm.timeslots)
        for gid, name in dm.group_map.items():
            busy = len(cm_slots_per_group.get(gid, []))
            free = total_slots - busy
            
            # Combien de TD ce groupe doit encore placer ?
            td_count = len([mp for mp in dm.module_parts if mp.type != "CM" and gid in mp.td_group_ids])
            
            status = "OK"
            if free < td_count: status = "!!! IMPOSSIBLE !!!"
            elif free < td_count + 3: status = "TENDU"
            
            line = f"Gr {gid:3} ({name:20}) : CM={busy:2} | Libres={free:2} | TD_à_placer={td_count:2} | Statut={status}\n"
            f.write(line)
            print(line.strip())

if __name__ == "__main__":
    check_saturation()
