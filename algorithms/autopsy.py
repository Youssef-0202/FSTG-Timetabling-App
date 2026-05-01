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

    with open("result_autopsy.txt", "w", encoding="utf-8") as out:
        out.write(f"Solution chargée: {len(schedule.assignments)} séances.\n")
        out.write("-" * 60 + "\n")
        out.write("AUTOPSIE DES CONFLITS (Full Diagnostics)\n")
        out.write("-" * 60 + "\n")
        
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
                    out.write(f"[H1 PROF] {dm.teacher_map[tid].name} @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}\n")
                prof_slots[(tid, ts)] = a.module_part
                
            # H2: Room
            if (rid, ts) in room_slots:
                prev = room_slots[(rid, ts)]
                out.write(f"[H2 ROOM] Salle {a.room.name} @ Slot {ts} ({a.timeslot.day} {a.timeslot.start_time}) : MP {prev.id} vs MP {a.module_part.id}\n")
            room_slots[(rid, ts)] = a.module_part
            
            # H3: Groups
            for gid in gids:
                if (gid, ts) in group_slots:
                    prev = group_slots[(gid, ts)]
                    out.write(f"[H3 GROUP] Gr {gid} ({dm.group_map[gid]}) @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}\n")
                group_slots[(gid, ts)] = a.module_part

            # H9: Unavailability
            if tid and tid != 231:
                prof_obj = dm.teacher_map.get(tid)
                if prof_obj and ts in prof_obj.unavailable_slots:
                    out.write(f"[H9 UNAVAIL] {prof_obj.name} est indisponible @ Slot {ts} ! (MP {a.module_part.id})\n")

            # H10: Room Type
            if a.module_part.required_room_type and a.room.type != a.module_part.required_room_type:
                out.write(f"[H10 ROOMTYPE] MP {a.module_part.id} requiert {a.module_part.required_room_type} mais est en {a.room.type} (Salle {a.room.name})\n")

            # H12: Saturday CM
            if a.timeslot.day == "SAMEDI" and a.module_part.type == "CM":
                out.write(f"[H12 SATURDAY] CM (MP {a.module_part.id}) placé un SAMEDI !\n")

            # Sections & Parenté (filière)
            if sid:
                sid_name = dm.sec_id_to_name.get(sid, "")
                sec_to_filieres = {}
                for s_item in dm.sections:
                    sec_to_filieres[s_item['id']] = set(g.get('filiere_id') for g in s_item.get('groupes', []) if g.get('filiere_id'))
                
                fils_current = sec_to_filieres.get(sid, set())
                related = []
                for s_other in dm.sections:
                    if s_other['id'] == sid: continue
                    if fils_current.intersection(sec_to_filieres.get(s_other['id'], set())):
                        related.append(s_other['id'])
                
                if (sid, ts) in sec_slots:
                     prev = sec_slots[(sid, ts)]
                     out.write(f"[H3 SECTION] Section {sid_name} @ Slot {ts} : MP {prev.id} vs MP {a.module_part.id}\n")
                for r_id in related:
                    if (r_id, ts) in sec_slots:
                        prev = sec_slots[(r_id, ts)]
                        out.write(f"[H13/14 FILIERE] {sid_name} vs {dm.sec_id_to_name[r_id]} @ Slot {ts} : MP {a.module_part.id} vs MP {prev.id}\n")
                sec_slots[(sid, ts)] = a.module_part

        out.write("-" * 60 + "\n")
        out.write("FIN DE L'AUTOPSIE\n")
        out.write("-" * 60 + "\n")

if __name__ == "__main__":
    autopsy()
