import sys
import os
import json

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager
from commun.models import Schedule, Assignment

def autopsy():
    # 1. Charger les données
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    # 2. Charger le dernier emploi du temps généré (s'il existe)
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "generated_timetable.json")
    if not os.path.exists(file_path):
        print("Aucun fichier generated_timetable.json trouvé.")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Reconstruire l'objet Schedule
    schedule = Schedule(dm)
    room_map = {r.id: r for r in dm.rooms}
    slot_map = {s.id: s for s in dm.timeslots}
    mp_map = {mp.id: mp for mp in dm.module_parts}
    
    for item in data:
        mp = mp_map.get(item['id'])
        r = room_map.get(item['room_id'])
        s = slot_map.get(item['slot_id'])
        if mp and r and s:
            schedule.assignments.append(Assignment(mp, r, s))

    print(f"Solution chargée: {len(schedule.assignments)} séances.")
    print("-" * 60)
    print("AUTOPSIE DES CONFLITS (Best Intermediate Solution)")
    print("-" * 60)
    
    prof_slots = {}
    room_slots = {}
    group_slots = {}
    sec_slots = {}
    
    for a in schedule.assignments:
        ts = a.timeslot.id
        tid = a.module_part.teacher_id
        rid = a.room.id
        gids = a.module_part.td_group_ids
        sid = a.module_part.section_id
        
        # H1: Prof
        if tid and tid != 231:
            if (tid, ts) in prof_slots:
                prev = prof_slots[(tid, ts)]
                print(f"[H1 PROF] {dm.teacher_map[tid].name} @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}")
            prof_slots[(tid, ts)] = a.module_part
            
        # H2: Room
        if (rid, ts) in room_slots:
            prev = room_slots[(rid, ts)]
            print(f"[H2 ROOM] Salle {rid} @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}")
        room_slots[(rid, ts)] = a.module_part
        
        # H3: Groups
        for gid in gids:
            if (gid, ts) in group_slots:
                prev = group_slots[(gid, ts)]
                print(f"[H3 GROUP] Gr {gid} ({dm.group_map[gid]}) @ Slot {ts} : MP {prev.id} ({prev.type}) vs MP {a.module_part.id} ({a.module_part.type})")
            group_slots[(gid, ts)] = a.module_part

        # Sections & Parenté
        if sid:
            sid_name = dm.sec_id_to_name.get(sid, "")
            related = []
            if " S2" in sid_name:
                for p in sid_name.replace(" S2", "").split("-"):
                    child_name = f"{p} S4"
                    for r_id, r_name in dm.sec_id_to_name.items():
                        if r_name == child_name: related.append(r_id)
            elif " S4" in sid_name:
                prefix = sid_name.replace(" S4", "")
                for r_id, r_name in dm.sec_id_to_name.items():
                    if " S2" in r_name and prefix in r_name: related.append(r_id)
            
            if (sid, ts) in sec_slots:
                 prev = sec_slots[(sid, ts)]
                 print(f"[H3 SECTION] Section {sid_name} @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}")
            for r_id in related:
                if (r_id, ts) in sec_slots:
                    prev = sec_slots[(r_id, ts)]
                    print(f"[H13/14 PARENT] {sid_name} vs {dm.sec_id_to_name[r_id]} @ Slot {ts} : MP {a.module_part.id} vs MP {prev.id}")
            sec_slots[(sid, ts)] = a.module_part

    print("-" * 60)
    print("FIN DE L'AUTOPSIE")
    print("-" * 60)

if __name__ == "__main__":
    autopsy()
