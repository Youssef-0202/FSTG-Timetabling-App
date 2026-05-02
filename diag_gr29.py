import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager
from collections import defaultdict

dm = DataManager()
dm.fetch_all_data()

mp1304 = next((m for m in dm.module_parts if m.id == 1304), None)
mp1516 = next((m for m in dm.module_parts if m.id == 1516), None)

if mp1304 and mp1516:
    shared = set(mp1304.td_group_ids) & set(mp1516.td_group_ids)
    print(f"#1304 groups: {sorted(mp1304.td_group_ids)}")
    print(f"#1516 groups: {sorted(mp1516.td_group_ids)}")
    print(f"Groups en COMMUN: {sorted(shared)}")
    for gid in shared:
        name = dm.group_map.get(gid, "?")
        print(f"  -> Groupe {gid}: {name}")

group_id = 29
all_cms_gr29 = sorted([mp.id for mp in dm.module_parts if group_id in mp.td_group_ids and mp.type == "CM"])
print(f"\nTous les CM IDs ciblant Gr 29: {all_cms_gr29}")
print(f"Nombre: {len(all_cms_gr29)}")
