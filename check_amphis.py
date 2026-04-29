import json
import requests

API_BASE_URL = "http://localhost:8000"

def check():
    path = r'c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend\generated_timetable.json'
    with open(path, 'r', encoding='utf-8') as f:
        assignments = json.load(f)

    rooms = {r['id']: r for r in requests.get(f"{API_BASE_URL}/rooms").json()}
    slots = {s['id']: s for s in requests.get(f"{API_BASE_URL}/timeslots").json()}
    
    amphis = [rid for rid, r in rooms.items() if "AMPHI" in r['name'].upper()]
    print(f"Amphis détectés: {[rooms[rid]['name'] for rid in amphis]}")

    # Grille d'occupation des Amphis (slot_id -> list of room_id)
    grid = {}
    for a in assignments:
        if a['room_id'] in amphis:
            sid = a['slot_id']
            if sid not in grid: grid[sid] = []
            grid[sid].append(a['room_id'])

    print("\nDisponibilité des Amphis en semaine :")
    week_slots = [s for s in slots.values() if s['day'] != "SAMEDI"]
    empty_count = 0
    for s in sorted(week_slots, key=lambda x: x['id']):
        occupied = grid.get(s['id'], [])
        free = [rooms[rid]['name'] for rid in amphis if rid not in occupied]
        if free:
            print(f"{s['day']} {s['start_time']} : LIBRE -> {free}")
            empty_count += 1
    
    if empty_count == 0:
        print("\n!!! ALERTE : TOUS LES AMPHIS SONT PLEINS TOUTE LA SEMAINE !!!")
    else:
        print(f"\nIl y a {empty_count} créneaux d'Amphis libres en semaine.")

check()
