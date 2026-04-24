import os
import sys
import time
import csv
from datetime import datetime

# Ajouter le chemin racine pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from commun.data_manager import DataManager
from ga_sa_hybrid.engine import HybridEngine
from commun.constraints import calculate_fitness_full

def run_grid_search():
    print("=======================================================")
    print("   LANCEMENT DU GRID SEARCH - OPTIMISATION PFE")
    print("=======================================================")

    # 1. Charger les donnees une seule fois
    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur de chargement des donnees.")
        return

    # 2. Definir la grille de parametres (Ciblee pour gagner du temps)
    pop_sizes = [100, 200]
    mutation_rates = [0.15, 0.30]
    elitism_val = 5
    sa_iters_fixed = 400
    max_gens = 100 # Un bon compromis pour voir la convergence

    results_file = "grid_search_results.csv"
    headers = ["Timestamp", "PopSize", "MutRate", "Elitism", "FinalScore", "H_Violations", "Duration"]

    # Preparer le fichier CSV
    file_exists = os.path.isfile(results_file)
    with open(results_file, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(headers)

        # 3. Boucles imbriquees (Le Grid Search)
        for pop in pop_sizes:
            for mut in mutation_rates:
                print(f"\n[TESTING] Pop:{pop} | Mut:{mut} | Elitism:{elitism_val} ...")
                
                start_time = time.time()
                
                # Initialisation du moteur
                engine = HybridEngine(
                    dm, 
                    pop_size=pop, 
                    mutation_rate=mut,
                    elitism=elitism_val,
                    sa_iterations=sa_iters_fixed
                )
                engine.create_initial_population()
                
                # Execution
                for gen in range(1, max_gens + 1):
                    engine.evolve()
                    if gen % 10 == 0:
                        print(f"  > Gen {gen}/{max_gens} | Best Score: {engine.population[0].fitness}")

                duration = time.time() - start_time
                best = engine.population[0]
                
                # Sauvegarde du resultat
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    pop, mut, elitism_val, 
                    best.fitness, 
                    best.h_violations, 
                    round(duration, 2)
                ])
                f.flush() # Ecriture immediate sur le disque
                
                print(f"[DONE] Score: {best.fitness} | Time: {duration:.2f}s")

    print(f"\n=======================================================")
    print(f" GRID SEARCH TERMINE. Resultats dans '{results_file}'")
    print("=======================================================")

if __name__ == "__main__":
    run_grid_search()
