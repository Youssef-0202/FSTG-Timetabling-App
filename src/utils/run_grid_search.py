import time
import numpy as np
import itertools
import sys
import os

# On s'assure d'importer la logique du back-end
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from main import run_optimization_process

def run_grid_search(num_runs_per_config=5):
    print("==========================================================")
    print(" PFE FSTM: GRID SEARCH HYPERPARAMETER TUNING ")
    print("==========================================================\n")
    
    # 1. Définition de la grille de paramètres (Les configurations à tester)
    # Tu peux modifier ces listes pour tester d'autres valeurs plus tard.
    grid = {
        'pop_size': [100, 200],                  # Explore l'impact de l'AG
        'generations': [200, 500],               # Explore l'impact de l'AG
        'cooling_rate': [0.95, 0.995]            # Explore l'agressivité du Recuit Simulé
    }
    
    # Génération du produit cartésien (toutes les combinaisons)
    keys = grid.keys()
    combinations = list(itertools.product(*(grid[k] for k in keys)))
    
    print(f"Total des configurations à tester : {len(combinations)}")
    print(f"Nombre d'exécutions (Runs) par configuration : {num_runs_per_config}\n")
    print("-" * 60)
    
    results = []
    
    # 2. Exécution du Grid Search
    for idx, combo in enumerate(combinations):
        config = dict(zip(keys, combo))
        print(f"\n[{idx+1}/{len(combinations)}] Testing Config: Pop={config['pop_size']}, Gen={config['generations']}, CR={config['cooling_rate']}")
        
        fitness_scores = []
        hard_violations = []
        exec_times = []
        
        # On lance N fois l'algo pour obtenir des vraies stats (car GA/SA est basé sur de l'aléatoire)
        for run in range(num_runs_per_config):
            start_time = time.time()
            
            # --- APPEL SILENCIEUX AU MOTEUR ---
            best_sol, calculator, _ = run_optimization_process(
                data_type="controlled",
                pop_size=config['pop_size'],
                generations=config['generations'],
                cooling_rate=config['cooling_rate'],
                initial_temp=2000 # Fixé pour limiter le temps d'exécution global
            )
            
            t_exec = time.time() - start_time
            
            # Récupération des scores de l'itération
            total_fit = calculator.calculate_total_fitness(best_sol)
            h_viol = calculator.calculate_f1_viability(best_sol)
            
            fitness_scores.append(total_fit)
            hard_violations.append(h_viol)
            exec_times.append(t_exec)
            
            print(f"  Run {run+1}: Fitness = {total_fit:,.1f} | Hard Violations = {h_viol} | Time = {t_exec:.2f}s")
            
        # 3. Calculs Statistiques (La preuve de Robustesse)
        best_fit = np.min(fitness_scores)
        worst_fit = np.max(fitness_scores)
        avg_fit = np.mean(fitness_scores)
        std_fit = np.std(fitness_scores, ddof=1) if num_runs_per_config > 1 else 0
        std_pct = (std_fit / avg_fit * 100) if avg_fit > 0 else 0
        avg_time = np.mean(exec_times)
        avg_hard = np.mean(hard_violations)
        
        # 4. Affichage du Rapport par Combinaison
        print("\n  --- Statistics ---")
        print(f"  Best solution value  : {best_fit:,.2f}")
        print(f"  Worst solution value : {worst_fit:,.2f}")
        print(f"  Average value        : {avg_fit:,.2f}")
        print(f"  Standard deviation   : {std_fit:,.2f}")
        print(f"  Std dev % of average : {std_pct:.2f}%")
        print(f"  Avg Hard Violations  : {avg_hard}")
        print(f"  Total time (s)       : {np.sum(exec_times):.2f}")
        print("-" * 60)
        
        results.append({
            'config': config,
            'best': best_fit,
            'worst': worst_fit,
            'avg': avg_fit,
            'std_pct': std_pct,
            'avg_hard': avg_hard,
            'avg_time': avg_time
        })
        
    # 5. Résumé Classement des Configurations
    print("\n\n==========================================================")
    print("SUMMARY: MEILLEURES CONFIGURATIONS (GRID SEARCH) ")
    print("==========================================================")
    
    # On trie d'abord par le nombre de violations Hard (0 en premier), puis par Fitness Moyenne (le plus bas possible)
    results.sort(key=lambda x: (x['avg_hard'], x['avg']))
    
    for rank, r in enumerate(results):
        cfg = r['config']
        medal = "🥇" if rank == 0 else "🥈" if rank == 1 else "🥉" if rank == 2 else "  "
        print(f"{medal} Rang {rank+1}: Pop={cfg['pop_size']:3d}, Gen={cfg['generations']:3d}, CR={cfg['cooling_rate']:.3f}")
        print(f"     -> Avg Fitness: {r['avg']:,.1f} | Best: {r['best']:,.1f} | Hard Violations Moy: {r['avg_hard']:.1f} | Ecart-type: {r['std_pct']:.2f}%")

if __name__ == "__main__":
    run_grid_search(num_runs_per_config=3)
