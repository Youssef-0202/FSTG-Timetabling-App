import os
import sys
import time
import csv
import itertools
from datetime import datetime

# Path setup to import commun
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from commun.data_manager import DataManager
from engine import HybridEngine

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True, "S_STABILITY": True,
    "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}

def run_grid_search():
    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur data_manager")
        return

    # Grille de recherche conçue pour la vitesse et performance
    param_grid = {
        'pop_size': [20, 40],
        'mutation_rate': [0.3, 0.6],
        'sa_iterations': [500, 1500],
        'sa_cooling': [0.95, 0.98]
    }
    
    max_generations = 40  # Generations test pour echantillonner rapidement

    keys, values = zip(*param_grid.items())
    combinations = [dict(zip(keys, v)) for v in itertools.product(*values)]
    
    csv_file = os.path.join(os.path.dirname(__file__), "grid_search_gasa_results.csv")
    
    with open(csv_file, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['pop_size', 'mutation_rate', 'sa_iterations', 'sa_cooling', 'time_sec', 'hard_score', 'soft_score'])

    print(f"=== DEMARRAGE GRID SEARCH GA+SA ({len(combinations)} combinaisons) ===")
    
    # Sauvegarde des meilleurs
    best_overall_score = float('inf')
    best_overall_params = None

    for idx, params in enumerate(combinations):
        print(f"\n[{idx+1}/{len(combinations)}] Test GA+SA avec: {params}")
        
        start_time = time.time()
        
        engine = HybridEngine(
            dm,
            pop_size=params['pop_size'],
            constraints_mask=CONSTRAINTS_MASK,
            mutation_rate=params['mutation_rate'],
            elitism=2,
            sa_iterations=params['sa_iterations'],
            sa_temp=50.0,
            sa_cooling=params['sa_cooling']
        )
        
        engine.create_initial_population()
        
        for gen in range(max_generations):
            engine.evolve()
            
        elapsed_time = time.time() - start_time
        best_ind = engine.population[0]
        
        h_score = best_ind.h_violations
        s_score = best_ind.fitness if best_ind.fitness is not None else 999999
        
        print(f"-> Résultat: Hard={h_score}, Soft={s_score:.2f} en {elapsed_time:.1f}s")
        
        with open(csv_file, mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([params['pop_size'], params['mutation_rate'], params['sa_iterations'], params['sa_cooling'], round(elapsed_time, 2), h_score, round(s_score, 2)])
            
        if s_score < best_overall_score and h_score == 0:
            best_overall_score = s_score
            best_overall_params = params

    print(f"\n" + "="*50)
    print(" FIN DU GRID SEARCH GA+SA")
    print(f" Meilleur Score (Zero Hard): {best_overall_score}")
    print(f" Meilleurs Params: {best_overall_params}")
    print("="*50)

if __name__ == "__main__":
    run_grid_search()
