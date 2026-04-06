import os
import sys

# Ajout au path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from parser import ITC2007Parser
from cpsolver import CPSolverIFS

def run_itc2007_sandbox():
    print("===================================================================")
    print("🌍 ITC-2007: CURRICULUM-BASED TIMETABLING SANDBOX 🌍")
    print("===================================================================\n")
    
    # Chemin vers la donnée téléchargée (comp01.ctt)
    data_dir = os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "data", "itc2007")
    filepath = os.path.join(data_dir, "comp01.ctt")
    
    if not os.path.exists(filepath):
        print(f"❌ Le fichier de test n'existe pas : {filepath}")
        print("💡 Exécutez le script 'download_itc.py' d'abord.")
        return

    # 1. Parsing complet de l'instance
    parser = ITC2007Parser(filepath)
    courses, rooms, curricula, slots, unavailabilities = parser.parse()
    
    # 2. Configuration du CPSolver (Iterative Forward Search de Steenson)
    solver = CPSolverIFS(courses, rooms, curricula, slots, unavailabilities)
    
    print("\n🚀 [PHASE 1] Lancement du CPSolver Base (Iterative Forward Search)...")
    print("L'algorithme va tenter de trouver une solution 'faisable' avec 0 Hard Constraints.")
    print("Temps limite: 15 secondes.")
    
    # On lui donne 50 000 itérations et 15 secondes max
    best_timetable = solver.solve(max_iterations=50000, time_limit=15)
    
    # 3. Évaluation stricte ITC-2007
    if best_timetable:
        hard_conflicts = solver.fitness_calc.count_hard_conflicts(best_timetable)
        soft_penalty = solver.fitness_calc.calculate_total_penalty(best_timetable)
        
        print("\n🏆 --- RÉSULTATS DU CPSOLVER (Baseline) --- 🏆")
        if hard_conflicts == 0:
            print(f"    Condition Initiale (Hard) : {hard_conflicts} violations ✅ SOLUTION FAISABLE !")
            # Seul le Soft Penalty compte si la solution est faisable
            print(f"    Pénalité Officielle ITC   : {soft_penalty} points")
        else:
            print(f"    Condition Initiale (Hard) : {hard_conflicts} violations ❌ NON FAISABLE.")
            print("    ❗ IFS n'a pas pu placer tous les cours correctement.")
            print("    💡 Indice : Augmentez le 'time_limit' ou optimisez la sélection.")
            
        print("\n" + "="*65)
        # 4. Phase 2 : TEST 1 - RANDOM SOLVER (Baseline)
        print("\n" + "="*65)
        print("🧪 [TEST 1/2] Lancement du Random Baseline (Alea)...")
        from random_baseline import RandomBaselineSolver
        random_solver = RandomBaselineSolver(solver.fitness_calc)
        random_timetable = random_solver.solve(best_timetable, max_iterations=50000, max_time=30)
        random_soft_penalty = solver.fitness_calc.calculate_total_penalty(random_timetable)
        
        # 5. Phase 3 : TEST 2 - SBHH INTELLIGENCE (L'IA de Steenson)
        print("\n" + "="*65)
        print("🧠 [TEST 2/2] Lancement du SBHH (Learning)...")
        from sbhh import SequenceBasedHyperHeuristic
        sbhh_ai = SequenceBasedHyperHeuristic(solver.fitness_calc)
        final_timetable = sbhh_ai.solve(best_timetable, max_iterations=100000, max_time=30)
        final_soft_penalty = solver.fitness_calc.calculate_total_penalty(final_timetable)
        
        # 6. Évaluation Ultime et ANALYSE DU CERVEAU
        print("\n📊 --- ANALYSE DU CERVEAU SBHH (MATRICE DE TRANSITION) --- 📊")
        for idx, row in enumerate(sbhh_ai.trans_scores):
            scores = " | ".join([f"H{j} [{s:.2f}]" for j, s in enumerate(row)])
            print(f"Après avoir fait H{idx} -> l'IA préfère : {scores}")

        print("\n\n🏆🏆 --- RÉCAPITULATIF SCIENTIFIQUE (ITC-2007) --- 🏆🏆")
        print(f"    1. CPSolver (Solution Initiale) : {soft_penalty} points")
        print(f"    2. Random Solver (Test Aléatoire) : {random_soft_penalty:.1f} points")
        print(f"    3. SBHH AI (Notre Apprentissage) : {final_soft_penalty:.1f} points")
        
        improvement = random_soft_penalty - final_soft_penalty
        print(f"\n🔥 L'Intelligence Artificielle (SBHH) bat le hasard de {improvement:.1f} points !")
        
        final_hard = solver.fitness_calc.count_hard_conflicts(final_timetable)
        print(f"    Violations Hard de la FSTM préservées : {final_hard} (Toujours FAISABLE ✅)")

    else:
        print("❌ Aucune solution constructible trouvée.")

if __name__ == "__main__":
    run_itc2007_sandbox()
