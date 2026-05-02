import json
with open("backend/generated_timetable.json", "r", encoding="utf-8") as f:
    data = json.load(f)
ids = [1304, 1516]
for el in data:
    if el.get('id') in ids:
        print(f"ID: {el.get('id')}, MP_ID: {el.get('module_part_id')}, Teacher: {el.get('teacher_id')}, Slot: {el.get('slot_id')}, Groups: {el.get('td_groups')}")
