import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

import json
with open("backend/generated_timetable.json", "r", encoding="utf-8") as f:
    timetable = json.load(f)

# Build current slot->assignments map
mp_map = {mp.id: mp for mp in dm.module_parts}
slot_map = {s.id: s for s in dm.timeslots}
room_map = {r.id: r for r in dm.rooms}

# Find GB S4 and GEG S4 section IDs
gb_s4_id = next((s['id'] for s in dm.sections if s['name'] == 'GB S4'), None)
geg_s4_id = next((s['id'] for s in dm.sections if s['name'] == 'GEG S4'), None)
print(f"GB S4 ID: {gb_s4_id}, GEG S4 ID: {geg_s4_id}")

# Find all Amphi non-Saturday slots
amphi_ids = {r.id for r in dm.rooms if r.type == 'AMPHI'}
non_sat_slots = {s.id for s in dm.timeslots if s.day != 'SAMEDI'}
valid_amphi_slots = {(r_id, sl_id) for r_id in amphi_ids for sl_id in non_sat_slots}

# Current occupancy per (room, slot) for both sections
occupied = {}
for row in timetable:
    mp = mp_map.get(row['id'])
    if not mp: continue
    r_id = row.get('room_id')
    sl_id = row.get('slot_id')
    if r_id and sl_id:
        occupied[(r_id, sl_id)] = mp

# Find which slots are being used by GB S4 OR GEG S4 courses
busy_for_gb_or_geg = set()
for (r_id, sl_id), mp in occupied.items():
    if mp.section_id in (gb_s4_id, geg_s4_id):
        busy_for_gb_or_geg.add(sl_id)

# Free Amphi slots for #1516 (must not conflict with GB S4 or GEG S4)
free_for_1516 = {(r_id, sl_id) for (r_id, sl_id) in valid_amphi_slots
                 if sl_id not in busy_for_gb_or_geg}

print(f"\nTotal Amphi slots (non-Sam): {len(valid_amphi_slots)}")
print(f"Slots occupes par GB S4 ou GEG S4: {len(busy_for_gb_or_geg)}")
print(f"Slots LIBRES pour #1516 (non conflictuels): {len(free_for_1516)}")

# Where is #1516 right now?
row1516 = next((r for r in timetable if r['id'] == 1516), None)
row1304 = next((r for r in timetable if r['id'] == 1304), None)
if row1516:
    sl = slot_map.get(row1516.get('slot_id'))
    print(f"\n#1516 actuellement: Slot {row1516.get('slot_id')} ({sl.day if sl else '?'} {sl.start_time if sl else '?'})")
if row1304:
    sl = slot_map.get(row1304.get('slot_id'))
    print(f"#1304 actuellement: Slot {row1304.get('slot_id')} ({sl.day if sl else '?'} {sl.start_time if sl else '?'})")
