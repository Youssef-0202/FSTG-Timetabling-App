import os
import sys
import time
import csv
from datetime import datetime

# Configuration du Path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from commun.data_manager import DataManager
from ga_sa_hybrid.v2.engine import HybridEngine

def run_refinement_grid_search():
    print("=" * 60)
    print("   GRID SEARCH RAFFINEMENT (ROUND 2) — HYBRID V2.0")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur de chargement des données.")
        return

    # Grille de Raffinement (Ciblée)
    # On teste l'élitisme et l'augmentation des itérations SA sur la meilleure population
    grid = {
        "pop_size": [50],
        "mutation_rate": [0.05, 0.1],
        "elitism": [2, 5],
        "sa_iterations": [400, 600],
        "sa_alpha": [0.9] # Fixé sur la meilleure valeur du Round 1
    }
    
    LIMIT_GEN = 120    # Un peu plus de temps pour le polissage
    STOP_AFTER_H0 = 35 # On laisse plus de temps de stabilisation

    results_file = os.path.join(os.path.dirname(__file__), "grid_search_v2_results.csv")
    
    # Nouveaux headers avec Elitism inclus
    headers = ["Timestamp", "PopSize", "MutRate", "Elitism", "SA_Iters", "SA_Alpha", "FinalScore", "H_Violations", "GenStop", "Duration"]

    file_exists = os.path.isfile(results_file)
    
    # On utilise le mode "a" pour ajouter sans écraser
    with open(results_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(headers)

        count = 1
        combos = [
            (pop, mut, elit, sa_it, sa_al)
            for pop in grid["pop_size"]
            for mut in grid["mutation_rate"]
            for elit in grid["elitism"]
            for sa_it in grid["sa_iterations"]
            for sa_al in grid["sa_alpha"]
        ]

        for pop, mut, elit, sa_it, sa_al in combos:
            print(f"\n[{count}/{len(combos)}] Test: Pop={pop}, Mut={mut}, Elit={elit}, SA_Iters={sa_it}")
            
            start_time = time.time()
            engine = HybridEngine(
                dm, 
                pop_size=pop, 
                mutation_rate=mut,
                elitism=elit,
                sa_iterations=sa_it,
                sa_cooling=sa_al
            )
            engine.create_initial_population()
            
            h_zero_since = 0
            actual_gens = 0
            
            for gen in range(1, LIMIT_GEN + 1):
                engine.evolve()
                actual_gens = gen
                
                if engine.population[0].h_violations == 0:
                    h_zero_since += 1
                    if h_zero_since >= STOP_AFTER_H0:
                        break
                else: h_zero_since = 0
                
                if gen % 20 == 0:
                    print(f"  > Gen {gen:03d} | Score: {engine.population[0].fitness:.1f}")

            duration = time.time() - start_time
            best = engine.population[0]
            
            # Sauvegarde (Append)
            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                pop, mut, elit, sa_it, sa_al,
                round(best.fitness, 2), 
                best.h_violations, 
                actual_gens,
                round(duration, 2)
            ])
            f.flush()
            print(f"  FINI: Score={best.fitness:.1f} | Gens={actual_gens} | Time={duration:.2f}s")
            count += 1

    print("-" * 60)
    print(f" RAFFINEMENT TERMINE. Données ajoutées à : {results_file}")
    print("-" * 60)

if __name__ == "__main__":
    run_refinement_grid_search()
