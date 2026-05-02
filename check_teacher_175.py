import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

tid = 175
t = dm.teacher_map.get(tid)
count = 0
for mp in dm.module_parts:
    if mp.teacher_id == tid:
        count += 1
        print(f"Assign {mp.id}: {mp.type} Section={mp.section_id} Groups={mp.td_group_ids}")

if t: print(f"Total sessions for Teacher {t.name} (ID {tid}): {count}")
else: print(f"Teacher {tid} not found")
