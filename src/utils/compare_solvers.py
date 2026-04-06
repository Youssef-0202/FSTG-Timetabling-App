import time
import sys
import os

# Ajouter le dossier parent au path pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_manager.controlled_data import generate_controlled_data
from core.fitness import FitnessCalculator
from solvers.experimental.hybrid_ga_sa import HybridSolver
from solvers.intelligent.sbhh_fstm import SBHHFSTMSolver
from solvers.intelligent.alns_fstm import ALNSSolver

def run_comparison():
    print("==================================================")
    print("ANALYSIS : HYBRIDE vs SBHH vs ALNS ")

    # 1. Chargement des données
    modules, rooms, teachers, groups, slots = generate_controlled_data()
    calculator = FitnessCalculator(modules, rooms, teachers, groups, slots)
    
    results = {}

    # --- TEST ALGO 1 : HYBRIDE (GA + SA) ---
    print("Evaluation du SOLVEUR HYBRIDE (GA + SA)...")
    solver_h = HybridSolver(modules, rooms, slots, calculator)
    solver_h.pop_size = 50
    solver_h.generations = 50 
    
    start = time.time()
    best_h = solver_h.solve()
    end = time.time()
    
    results['Hybrid (GA+SA)'] = {
        'time': end - start,
        'fitness': calculator.calculate_total_fitness(best_h),
        'hard': calculator.calculate_f1_viability(best_h),
        'soft': calculator.calculate_f2_quality(best_h) + calculator.calculate_f3_comfort(best_h)
    }

    print("\n------------------------------------------------")

    # --- TEST ALGO 2 : SBHH ---
    print("Evaluation du SOLVEUR SBHH (INTELLIGENT)...")
    solver_s = SBHHFSTMSolver(modules, rooms, slots, calculator)
    
    start = time.time()
    # On met 20000 itérations pour lui laisser le temps de passer en Phase 2 (H=0)
    best_s = solver_s.solve(max_iterations=20000)
    end = time.time()
    
    results['SBHH (Steenson)'] = {
        'time': end - start,
        'fitness': calculator.calculate_total_fitness(best_s),
        'hard': calculator.calculate_f1_viability(best_s),
        'soft': calculator.calculate_f2_quality(best_s) + calculator.calculate_f3_comfort(best_s)
    }

    print("\n------------------------------------------------")

    # --- TEST ALGO 3 : ALNS ---
    print("Evaluation du SOLVEUR ALNS ...")
    solver_a = ALNSSolver(modules, rooms, slots, calculator)
    
    start = time.time()
    # On met 800 iterations (Recherche Approfondie Etat de l'Art - Total Fitness)
    best_a = solver_a.solve(max_iterations=800)
    end = time.time()
    
    results['ALNS (2024)'] = {
        'time': end - start,
        'fitness': calculator.calculate_total_fitness(best_a),
        'hard': calculator.calculate_f1_viability(best_a),
        'soft': calculator.calculate_f2_quality(best_a) + calculator.calculate_f3_comfort(best_a)
    }

    # --- AFFICHAGE DU TABLEAU FINAL ---
    print("\n" + "="*60)
    print(f"{'ALGORITHME':<20} | {'TEMPS (s)':<10} | {'FITNESS':<10} | {'HARD-V':<8}")
    print("-" * 60)
    for name, data in results.items():
        print(f"{name:<20} | {data['time']:<10.2f} | {data['fitness']:<10.2f} | {data['hard']:<8}")
    print("="*60)
    
    # --- DIAGNOSTIC DU GAGNANT ---
    winner_name = min(results, key=lambda k: results[k]['fitness'])
    if winner_name == 'Hybrid (GA+SA)': winner_sol = best_h
    elif winner_name == 'SBHH (Steenson)': winner_sol = best_s
    else: winner_sol = best_a
    
    print(f"\n--- DIAGNOSTIC DE L'ALGORITHME {winner_name.upper()} ---")
    h_details = {
        "H1 Prof":      calculator.check_h1_teacher_conflict(winner_sol),
        "H2 Salle":     calculator.check_h2_room_conflict(winner_sol),
        "H3 Groupe":    calculator.check_h3_group_conflict(winner_sol),
        "H4 Capacity":  calculator.check_h4_capacity(winner_sol),
        "H5 Equipment": calculator.check_h5_equipment(winner_sol),
        "H6 Consecut":  calculator.check_h6_consecutivity(winner_sol),
        "H7 Volume":    calculator.check_h7_weekly_volume(winner_sol),
        "H8 Online":    calculator.check_h8_online_consistency(winner_sol),
        "H9 Availab":   calculator.check_h9_teacher_availability(winner_sol),
        "H10 Curricul": calculator.check_h10_curriculum_conflict(winner_sol),
        "H11 RoomType": calculator.check_h11_room_type(winner_sol),
        "H13 DailyLim": calculator.check_h13_daily_limit(winner_sol),
    }
    for name, val in h_details.items():
        status = "[OK]" if val == 0 else "[X]"
        print(f"  {status} {name:12} : {val} violations")

    print(f"\nMEILLEUR RESULTAT : {winner_name.upper()}")

if __name__ == "__main__":
    run_comparison()
