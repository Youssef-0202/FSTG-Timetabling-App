import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

cm_count = len([mp for mp in dm.module_parts if mp.type == 'CM'])
amphi_count = len([r for r in dm.rooms if r.type == 'AMPHI'])
print(f"CMs: {cm_count}")
print(f"Amphis: {amphi_count}")
print(f"Amphi Slots: {amphi_count * 25}") # Removing Saturday CM slots (5 slots)
