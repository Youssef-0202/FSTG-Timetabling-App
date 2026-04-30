import time
import sys
import os

# Ajouter le chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager
from commun.constraints import calculate_fitness_full
from ga_sa_hybrid.v3.engine import HybridEngine

def test():
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    engine = HybridEngine(dm)
    sch = engine._build_greedy_individual()
    
    print("Test de vitesse fitness full...")
    start = time.time()
    for _ in range(100):
        calculate_fitness_full(sch)
    end = time.time()
    
    avg = (end - start) / 100
    print(f"Moyenne : {avg:.5f} sec / fitness")
    print(f"Estimation pour 5000 iters : {avg * 5000:.2f} sec")

if __name__ == "__main__":
    test()
