import time
import sys
import os

# Garantir les imports propres depuis "src"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_manager.controlled_data import generate_controlled_data
from core.fitness import FitnessCalculator
from solvers.experimental.hybrid_ga_sa import HybridSolver

def run_hybrid_alone():
    print("==========================================================")
    print("🚀 LANCEMENT DU SOLVEUR 1 : HYBRIDE (Algorithme Génétique + Recuit Simulé)")
    print("==========================================================\n")

    # 1. Charger les données FSTM test
    print("[1] Chargement des donnees...")
    modules, rooms, teachers, groups, slots = generate_controlled_data()
    calculator = FitnessCalculator(modules, rooms, teachers, groups, slots)
    
    # 2. Configurer le solveur
    print("[2] Initialisation de la population (Pop=50, Gen=50)...")
    solver = HybridSolver(modules, rooms, slots, calculator)
    solver.pop_size = 50
    solver.generations = 50 
    
    # 3. Exécution avec chronomètre
    start_time = time.time()
    best_table = solver.solve()
    runtime = time.time() - start_time
    
    # 4. Affichage du bilan
    fitness_totale = calculator.calculate_total_fitness(best_table)
    hard_violations = calculator.calculate_f1_viability(best_table)
    soft_violations = calculator.calculate_f2_quality(best_table) + calculator.calculate_f3_comfort(best_table)

    print("\n==================== BILAN HYBRIDE ====================")
    print(f"Temps d'execution  : {runtime:.2f} secondes")
    print(f"Fitness Globale    : {fitness_totale} points")
    print(f"Violations (Hard)  : {hard_violations} conflits critiques refusés")
    print(f"Inconfort (Soft)   : {soft_violations} pénalités de confort")
    print("=========================================================\n")

if __name__ == "__main__":
    run_hybrid_alone()
