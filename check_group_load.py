import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

group_id = 29
count = 0
for mp in dm.module_parts:
    if group_id in mp.td_group_ids:
        count += 1
        print(f"Assign {mp.id}: {mp.type}")

print(f"Total sessions for Group {group_id}: {count}")
