import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

for mp_id in [1304, 1516]:
    mp = next((m for m in dm.module_parts if m.id == mp_id), None)
    if mp:
        print(f"MP {mp_id}: Locked={mp.is_locked} Section={mp.section_id}")
