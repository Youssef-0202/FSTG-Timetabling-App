import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

mp_map = {mp.id: mp for mp in dm.module_parts}

for mp_id in [1304, 1516]:
    mp = mp_map.get(mp_id)
    if mp:
        print(f"Assign ID {mp_id}: ParentSection={mp.section_id} Type={mp.type} Teacher={mp.teacher_id} Groups={mp.td_group_ids}")
    else:
        print(f"Assign ID {mp_id} not found in DM")
