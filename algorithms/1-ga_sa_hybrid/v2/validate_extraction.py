import json
import os
import requests

API = "http://localhost:8000"
BASE_DIR = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE"
CACHE_PATH = os.path.join(BASE_DIR, "data_cache.json")
TIMETABLE_PATH = os.path.join(BASE_DIR, "backend", "generated_timetable.json")

def norm_day(d):
    d = str(d).upper().strip()
    return {"MONDAY": "LUNDI", "TUESDAY": "MARDI", "WEDNESDAY": "MERCREDI",
            "THURSDAY": "JEUDI", "FRIDAY": "VENDREDI", "SATURDAY": "SAMEDI"}.get(d, d)

print("--- PHASE 3 : EXTRACTION RAFFINEE (MODE REEL) ---")

with open(CACHE_PATH, "r", encoding="utf-8") as f: cache = json.load(f)
with open(TIMETABLE_PATH, "r", encoding="utf-8") as f: timetable = json.load(f)

# 1. Mappings
sections_dict = {str(s['id']): s['name'] for s in cache.get('sections', [])}
groups_list = cache.get('td-groups', [])
group_to_sid = {str(g['id']): str(g['section_id']) for g in groups_list}
rooms_dict = {str(r['id']): r['name'] for r in cache.get('rooms', [])}
slots_lookup = {str(s['id']): s for s in cache.get('timeslots', [])}
mp_to_mid = {str(m['id']): str(m['module_id']) for m in cache.get('module-parts', [])}
mp_to_type = {str(m['id']): m.get('type', 'CM') for m in cache.get('module-parts', [])}

try: mod_names = {str(m['id']): m['name'] for m in requests.get(f"{API}/modules", timeout=5).json()}
except: mod_names = {}

# 3. Extraction de l'Emploi du Temps
# Un cours concerne une section S si :
# - La séance a section_id == S
# - OU l'un des td_groups de la séance appartient à S
final_data = {sid: [] for sid in sections_dict}

for entry in timetable:
    sl = slots_lookup.get(str(entry.get('slot_id')), {})
    day, time = norm_day(sl.get('day','')), sl.get('start_time','')
    
    mpid = str(entry.get('module_part_id'))
    mid = mp_to_mid.get(mpid)
    m_type = mp_to_type.get(mpid, 'CM') or 'CM'
    m_name = mod_names.get(mid, f"M-{mid}")
    r_name = rooms_dict.get(str(entry.get('room_id')), "Salle ?")

    # On cherche quelles sections sont DIRECTEMENT concernées par cette séance
    target_sids = set()
    e_sid = str(entry.get('section_id'))
    if e_sid != 'None': target_sids.add(e_sid)
    
    e_gids = [str(g['id']) if isinstance(g, dict) else str(g) for g in entry.get('td_groups', []) or []]
    for gid in e_gids:
        if gid in group_to_sid: target_sids.add(group_to_sid[gid])

    # On ajoute la séance à toutes les sections impactées
    for sid in target_sids:
        if sid not in final_data: continue
        
        # On calcule les groupes de cette section présents dans cette séance
        labels = []
        if m_type != 'CM':
            for gid in e_gids:
                if group_to_sid.get(gid) == sid:
                    g_obj = next((g for g in groups_list if str(g['id']) == gid), {})
                    labels.append(g_obj.get('name', '').split(' ')[-1]) # ex: "Gr 1"
        
        grp_str = f" ({'|'.join(labels)})" if labels else ""
        record = {"m": m_name, "t": m_type, "r": r_name, "g": grp_str}
        
        # Eviter doublons (si le JSON a des redondances)
        slot_key = (day, time)
        existing = [x for x in final_data[sid] if x['jour']==day and x['heure']==time and x['module']==m_name and x['type']==m_type]
        if not existing:
            final_data[sid].append({
                "jour": day, "heure": time, "module": m_name, "type": m_type, "salle": r_name, "groupes_label": grp_str
            })

# 4. Résumé Global et Cohérence
print(f"{'SECTION':<25} | {'NB SÉANCES':<10}")
print("-" * 40)
for sid in sorted(final_data.keys(), key=lambda x: sections_dict.get(x, '')):
    name = sections_dict.get(sid, sid)
    count = len(final_data[sid])
    print(f"{name[:25]:<25} | {count:<10}")

# Détail pour GI S4 pour vérification visuelle
gi_sid = next((sid for sid, name in sections_dict.items() if "GI S4" in name), None)
if gi_sid:
    print(f"\n--- FOCUS : {sections_dict[gi_sid]} ---")
    days_order = {"LUNDI":0, "MARDI":1, "MERCREDI":2, "JEUDI":3, "VENDREDI":4, "SAMEDI":5}
    sorted_gi = sorted(final_data[gi_sid], key=lambda x: (days_order.get(x['jour'], 9), x['heure']))
    for s in sorted_gi:
        print(f"[{s['jour']} {s['heure']}] {s['module']} ({s['type']})")
