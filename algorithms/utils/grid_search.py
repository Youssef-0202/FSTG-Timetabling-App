import os
import sys
import time
import csv
from datetime import datetime

# Configuration du Path pour trouver 'commun' et 'ga_sa_hybrid'
# On remonte de 'algorithms/utils' vers 'algorithms/'
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from commun.data_manager import DataManager
from ga_sa_hybrid.v2.engine import HybridEngine

# Masque de contraintes par défaut (Activer tout pour l'audit)
DEFAULT_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H11": True, "H12": True,
    "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True,
    "S_BALANCE": True, "S_STABILITY": True, "S_EMPTY_DAYS": True,
    "S_PREFERENCES": True, "S_FREE_AFTERNOONS": True
}

def run_refinement_grid_search():
    print("=" * 60)
    print("   GRID SEARCH OPTIMISATION — HYBRID V2.1 (NEW CONSTRAINTS)")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur de chargement des données depuis l'API.")
        return

    # Grille de Raffinement (Round 3) — Basée sur le succès du Test #3
    grid = {
        "pop_size": [30],
        "mutation_rate": [0.38, 0.40, 0.42],
        "elitism": [2],
        "sa_iterations": [800, 1000, 1200], # On pousse la recherche locale plus loin
        "sa_cooling": [0.96, 0.965]
    }
    
    LIMIT_GEN = 80      # Un peu plus profond
    STOP_AFTER_H0 = 20  # Stabilisation pour le peaufinage

    results_file = os.path.join(os.path.dirname(__file__), "grid_search_v2_results.csv")
    headers = ["Timestamp", "PopSize", "MutRate", "Elitism", "SA_Iters", "SA_Cool", "FinalScore", "H_Violations", "GenStop", "Duration"]

    file_exists = os.path.isfile(results_file)
    
    with open(results_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(headers)

        combos = [
            (pop, mut, elit, sa_it, sa_cl)
            for pop in grid["pop_size"]
            for mut in grid["mutation_rate"]
            for elit in grid["elitism"]
            for sa_it in grid["sa_iterations"]
            for sa_cl in grid["sa_cooling"]
        ]

        count = 1
        for pop, mut, elit, sa_it, sa_cl in combos:
            print(f"\n[{count}/{len(combos)}] TEST: Pop={pop}, Mut={mut}, Elit={elit}, SA_I={sa_it}, SA_C={sa_cl}")
            
            start_time = time.time()
            engine = HybridEngine(
                dm, 
                pop_size=pop, 
                mutation_rate=mut,
                elitism=elit,
                sa_iterations=sa_it,
                sa_cooling=sa_cl,
                constraints_mask=DEFAULT_MASK
            )
            
            print("  > Initialisation de la population...")
            engine.create_initial_population()
            
            h_zero_since = 0
            actual_gens = 0
            
            for gen in range(1, LIMIT_GEN + 1):
                engine.evolve()
                actual_gens = gen
                
                best = engine.population[0]
                if best.h_violations == 0:
                    h_zero_since += 1
                    if h_zero_since >= STOP_AFTER_H0:
                        print(f"  🏁 Cible Hard=0 atteinte et stabilisée à Gen {gen}.")
                        break
                else: h_zero_since = 0
                
                if gen % 10 == 0:
                    print(f"    Gen {gen:03d} | Score: {best.fitness:.1f} | H: {best.h_violations}")

            duration = time.time() - start_time
            best = engine.population[0]
            
            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                pop, mut, elit, sa_it, sa_cl,
                round(best.fitness, 2), 
                best.h_violations, 
                actual_gens,
                round(duration, 2)
            ])
            f.flush()
            print(f"  ✅ FINI: Score={best.fitness:.1f} | H={best.h_violations} | Temps={duration:.2f}s")
            count += 1

    print("-" * 60)
    print(f" GRID SEARCH TERMINE. Résultats : {results_file}")
    print("-" * 60)

if __name__ == "__main__":
    run_refinement_grid_search()
