import json
with open('data_cache.json', 'r', encoding='utf-8') as f: cache = json.load(f)
with open('backend/generated_timetable.json', 'r', encoding='utf-8') as f: timetable = json.load(f)

gi_groups = {str(g['id']): g['name'] for g in cache['td-groups'] if g['section_id'] == 4}
print(f"Groupes détectés pour GI S4 : {gi_groups}")

counts = {gid: 0 for gid in gi_groups}
for entry in timetable:
    gids = [str(g['id'] if isinstance(g, dict) else g) for g in entry.get('td_groups', []) or []]
    for gid in gids:
        if gid in counts:
            counts[gid] += 1

for gid, name in gi_groups.items():
    print(f"{name} (ID {gid}) : {counts[gid]} séances dans le planning.")
