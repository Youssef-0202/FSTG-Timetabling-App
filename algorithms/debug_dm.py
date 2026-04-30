import sys
import os
import requests

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager

def debug_dm():
    API_BASE_URL = "http://localhost:8000/api"
    
    # 1. Groups from API
    groups = requests.get(f"{API_BASE_URL}/groups").json()
    section_to_groups = {}
    for g in groups:
        sid = g.get('section_id')
        if sid not in section_to_groups: section_to_groups[sid] = []
        section_to_groups[sid].append(g['id'])
    
    print("-" * 50)
    print("SECTION -> GROUPS MAPPING")
    for sid, gids in section_to_groups.items():
        print(f"Section {sid:2} : {len(gids)} groups -> {gids}")
    
    # 2. CM check from DataManager
    dm = DataManager()
    dm.fetch_all_data()
    
    print("\n" + "-" * 50)
    print("CM GROUPS IN DATAMANAGER")
    for mp in dm.module_parts:
        if mp.type == "CM":
            print(f"CM ID {mp.id:3} (Sec {mp.section_id:2}) -> {mp.td_group_ids}")

if __name__ == "__main__":
    debug_dm()
