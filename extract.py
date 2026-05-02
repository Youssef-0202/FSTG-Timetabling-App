import json

with open("backend/generated_timetable.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for row in data:
    mid = row.get("id")
    mp_id = row.get("module_part_id")
    if mid in [1269, 1295] or mp_id in [1269, 1295]:
        print(f"Affectation ID: #{mid}, Module Part ID: {mp_id}")
