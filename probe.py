import json

with open("backend/my_db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

for mp in db.get('module_parts', []):
    if mp['id'] in [31, 33]:
        tid = mp.get('teacher_id')
        t = next((t for t in db['teachers'] if t['id'] == tid), None)
        print(f"\nMP {mp['id']} Type={mp['type']} size={mp['group_size']}")
        if t:
            print(f" Teacher: {t['name']}")
            unavail = t.get('availabilities', {}).get('unavailable_slots', [])
            print(f" Unavail slots: {unavail}")
            other = [m for m in db['module_parts'] if m.get('teacher_id') == tid and m['id'] != mp['id']]
            print(f" Other classes load: {len(other)}")
