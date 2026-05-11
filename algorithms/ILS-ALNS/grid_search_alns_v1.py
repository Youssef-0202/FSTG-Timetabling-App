
import os
import json
import time
import copy
from data_manager import DataManager
from models import Schedule
from constraints import calculate_fitness_full
from engine_alns import HybridEngine
from reporting import initialize_log_file

# Grid Search Configurations
CONFIGS = [
    {"name": "V1_Original_Ref", "SA_ITERATIONS": 1200, "SA_TEMP": 50, "SA_COOLING": 0.965},
    {"name": "Intensification_Focus", "SA_ITERATIONS": 2000, "SA_TEMP": 30, "SA_COOLING": 0.975},
    {"name": "High_Temp_Jump", "SA_ITERATIONS": 1500, "SA_TEMP": 100, "SA_COOLING": 0.985}
]

POP_SIZE = 20
MAX_GEN = 60 # Reduced generations for grid search to be faster
ELITISM = 2

def run_grid_search():
    print("="*60)
    print("   GRID SEARCH ILS-ALNS v1 — 3 ESSAIS")
    print("="*60)
    
    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur : Impossible de charger les données.")
        return

    results = []
    
    for cfg in CONFIGS:
        print(f"\n>>> DÉMARRAGE ESSAI : {cfg['name']}")
        print(f"    Paramètres: iterations={cfg['SA_ITERATIONS']}, temp={cfg['SA_TEMP']}, cooling={cfg['SA_COOLING']}")
        
        engine = HybridEngine(
            data_manager=dm,
            pop_size=POP_SIZE,
            elitism=ELITISM,
            sa_iterations=cfg['SA_ITERATIONS'],
            sa_temp=cfg['SA_TEMP'],
            sa_cooling=cfg['SA_COOLING']
        )
        
        engine.create_initial_population()
        init_score = engine.population[0].fitness
        
        start_time = time.time()
        
        for gen in range(1, MAX_GEN + 1):
            impact, div = engine.evolve()
            best = engine.population[0]
            print(f"  Gen {gen:03} | Best: {best.fitness:10.1f} | H: {best.h_violations} | S: {best.soft_penalty:10.1f} | Imp: {impact:8.1f} | Time: {time.time()-start_time:.1f}s")
            
            # Early stop if H > 0 after 20 gens (bad config)
            if gen > 20 and best.h_violations > 0:
                print("  [STOP] Trop de violations hard.")
                break

        duration = time.time() - start_time
        final_best = engine.population[0]
        
        results.append({
            "name": cfg['name'],
            "score": final_best.fitness,
            "h": final_best.h_violations,
            "s": final_best.soft_penalty,
            "duration": duration,
            "bandit": engine.get_bandit_stats()
        })
        
        print(f"\nFIN DE L'ESSAI {cfg['name']}: {final_best.fitness}")

    # Final summary
    print("\n" + "="*60)
    print("   RÉSULTATS FINAUX DU GRID SEARCH")
    print("="*60)
    for res in sorted(results, key=lambda x: (x['h'], x['s'])):
        print(f" {res['name']:<20} | H: {res['h']:<2} | S: {res['score']:<10.1f} | Time: {res['duration']:.0f}s")
    
    # Save results to file
    with open("grid_search_results.json", "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    run_grid_search()
