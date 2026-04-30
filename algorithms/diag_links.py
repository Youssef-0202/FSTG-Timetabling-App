import sys
import os

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager

def diag_links():
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    print("-" * 70)
    print("DETAIL DES SECTIONS ET DES GROUPES")
    print("-" * 70)
    
    for s in dm.sections:
        gids = [g['id'] for g in s.get('groupes', [])]
        print(f"Sec {s['id']:2} | {s['name']:25} | Groups: {gids}")

if __name__ == "__main__":
    diag_links()
