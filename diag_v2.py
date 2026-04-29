import json
import requests
import os

API_BASE_URL = "http://localhost:8000"

def get_data(endpoint):
    return requests.get(f"{API_BASE_URL}/{endpoint}").json()

def diagnose():
    path = r'c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend\generated_timetable.json'
    with open(path, 'r', encoding='utf-8') as f:
        assignments = json.load(f)

    # Charger les référentiels
    rooms = {r['id']: r for r in get_data('rooms')}
    slots = {s['id']: s for s in get_data('timeslots')}
    teachers = {t['id']: t for t in get_data('teachers')}
    sections = {s['id']: s for s in get_data('sections')}
    module_parts = {m['id']: m for m in get_data('module-parts')}
    groups = {g['id']: g for g in get_data('td-groups')}

    print(f"Diagnostic de {len(assignments)} affectations...")

    # 1. Samedi
    sat_assignments = [a for a in assignments if slots.get(a['slot_id'], {}).get('day') == "SAMEDI"]
    print(f"\n--- COURS SUR LE SAMEDI ({len(sat_assignments)}) ---")
    for a in sat_assignments:
        ts = slots.get(a['slot_id'], {})
        mp = module_parts.get(a['module_part_id'], {})
        prof = teachers.get(a.get('teacher_id'), {'name': 'INCONNU'})
        room = rooms.get(a['slot_id'], {'name': 'INCONNUE'}) # Oups, room_id
        room = rooms.get(a['room_id'], {'name': 'INCONNUE'})
        
        print(f"ID: {a['id']} | {mp.get('module_id')} | {mp.get('type')} sur {ts.get('start_time')}")
        print(f"  Prof: {prof['name']} | Salle: {room['name']}")
        
        # Vérifier si c'est verrouillé
        if a.get('is_locked'):
            print("  !! VERROUILLÉ (Locked) !!")

    # 2. Chevauchements H3 (Groupes)
    occ = {} # (group_id, slot_id) -> a_id
    h3_list = []
    for a in assignments:
        sid = a['slot_id']
        for g in a.get('td_groups', []):
            gid = g['id']
            if (gid, sid) in occ:
                h3_list.append((occ[(gid, sid)], a['id'], gid, sid))
            occ[(gid, sid)] = a['id']

    if h3_list:
        print(f"\n--- CONFLITS DE GROUPES H3 ({len(h3_list)}) ---")
        for a1_id, a2_id, gid, sid in h3_list:
            g_name = groups.get(gid, {'name': gid})['name']
            ts = slots.get(sid, {})
            print(f"Conflit pour {g_name} sur {ts.get('day')} {ts.get('start_time')}")
            print(f"  Entre Assign {a1_id} et {a2_id}")

diagnose()
