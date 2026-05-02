import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

dm = DataManager()
dm.fetch_all_data()

for tid in [217, 175]:
    t = dm.teacher_map.get(tid)
    if t:
        print(f"Teacher {tid} ({t.name}): Unavail={t.unavailable_slots}")
