import sys, os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'algorithms'))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

print("\n=== DIAGNOSTIC H3 / H13 ===")
print("Sections avec leurs groupes/filières :")
for s in dm.sections:
    groupes = s.get('groupes', [])
    filieres = set(g.get('filiere_id') for g in groupes if g.get('filiere_id'))
    print(f"  Section {s['id']:2} ({s['name']:20}) → {len(groupes)} groupes, filière IDs: {filieres}")

print("\nRelated SIDs (via filière) :")
sec_to_filieres = {}
for s in dm.sections:
    sec_to_filieres[s['id']] = set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
related_sids = {}
for s1 in dm.sections:
    sid1, fils1 = s1['id'], sec_to_filieres.get(s1['id'], set())
    related_sids[sid1] = []
    if not fils1: continue
    for s2 in dm.sections:
        sid2 = s2['id']
        if sid1 == sid2: continue
        if fils1.intersection(sec_to_filieres.get(sid2, set())):
            related_sids[sid1].append(sid2)
    if related_sids[sid1]:
        print(f"  {s1['name']:20} → liée à {[dm.sec_id_to_name.get(x, x) for x in related_sids[sid1]]}")

print("\n=== DIAGNOSTIC H10 ===")
required_types = set(mp.required_room_type for mp in dm.module_parts if mp.required_room_type)
available_types = set(r.type for r in dm.rooms)
print(f"Types requis    : {required_types}")
print(f"Types dispos    : {available_types}")
missing = required_types - available_types
if missing:
    print(f"⚠️  TYPES MANQUANTS (cause H10 permanent) : {missing}")
else:
    print("✅ Tous les types requis sont disponibles")
