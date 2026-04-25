import os
import sys
import time
import csv
from datetime import datetime

# Ajouter le chemin racine pour les imports (PFE_MST_Timetabling)
# main_dir est 'algorithms/utils', on remonte d'un niveau pour 'algorithms'
# et on ajoute le dossier 'algorithms' au path pour que 'commun' et 'ga_sa_hybrid' soient trouvables.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from commun.data_manager import DataManager
from ga_sa_hybrid.v2.engine import HybridEngine
from commun.constraints import calculate_fitness_full

def run_grid_search_v2():
    print("=" * 60)
    print("   LANCEMENT DU GRID SEARCH — HYBRID SOLVER V2.0")
    print("=" * 60)

    # 1. Charger les données une seule fois
    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur fatale : Impossible de charger les données depuis l'API.")
        return

    # 2. Configuration de la Grille de Paramètres
    # On choisit des valeurs stratégiques pour trouver le sweet spot vitesse/qualité
    grid = {
        "pop_size": [50, 100],
        "mutation_rate": [0.1, 0.2],
        "sa_iterations": [200, 400],
        "sa_cooling": [0.90, 0.95]
    }
    
    LIMIT_GEN = 100  # On teste sur 100 gens max pour chaque combinaison
    STOP_AFTER_H0 = 20 # Arrêt si stable à H=0 pendant 20 gens (gain de temps)

    results_file = os.path.join(os.path.dirname(__file__), "grid_search_v2_results.csv")
    headers = ["Timestamp", "PopSize", "MutRate", "SA_Iters", "SA_Alpha", "FinalScore", "H_Violations", "GenStop", "Duration"]

    # Préparer le fichier CSV
    file_exists = os.path.isfile(results_file)
    with open(results_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(headers)

        # 3. Exploration de la Grille
        count = 1
        total_combos = len(grid["pop_size"]) * len(grid["mutation_rate"]) * len(grid["sa_iterations"]) * len(grid["sa_cooling"])

        for pop in grid["pop_size"]:
            for mut in grid["mutation_rate"]:
                for sa_it in grid["sa_iterations"]:
                    for sa_alpha in grid["sa_cooling"]:
                        
                        print(f"\n[{count}/{total_combos}] Test: Pop={pop}, Mut={mut}, SA_Iters={sa_it}, SA_Alpha={sa_alpha}")
                        
                        start_time = time.time()
                        engine = HybridEngine(
                            dm, 
                            pop_size=pop, 
                            mutation_rate=mut,
                            sa_iterations=sa_it,
                            sa_cooling=sa_alpha
                        )
                        engine.create_initial_population()
                        
                        h_zero_since = 0
                        actual_gens = 0
                        
                        # Tournoi d'évolution
                        for gen in range(1, LIMIT_GEN + 1):
                            engine.evolve()
                            actual_gens = gen
                            
                            # Early stopping logic (V2)
                            if engine.population[0].h_violations == 0:
                                h_zero_since += 1
                                if h_zero_since >= STOP_AFTER_H0:
                                    break
                            else:
                                h_zero_since = 0
                            
                            if gen % 20 == 0:
                                print(f"  > Gen {gen:03d} | Best: {engine.population[0].fitness:.1f} (H:{engine.population[0].h_violations})")

                        duration = time.time() - start_time
                        best = engine.population[0]
                        
                        # Sauvegarde
                        writer.writerow([
                            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            pop, mut, sa_it, sa_alpha,
                            round(best.fitness, 2), 
                            best.h_violations, 
                            actual_gens,
                            round(duration, 2)
                        ])
                        f.flush()
                        
                        print(f"  FINI: Score={best.fitness:.1f} | Gens={actual_gens} | Time={duration:.2f}s")
                        count += 1

    print("\n" + "=" * 60)
    print(f" GRID SEARCH V2.0 TERMINE. Résultats dans :")
    print(f" {os.path.abspath(results_file)}")
    print("=" * 60)

if __name__ == "__main__":
    run_grid_search_v2()
