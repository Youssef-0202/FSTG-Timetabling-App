import time
import sys
import os

# Ajouter le dossier parent au path pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Room, Teacher, StudentGroup, Module, Timeslot, CourseType
from core.fitness import FitnessCalculator
from solvers.experimental.hybrid_ga_sa import HybridSolver
from solvers.intelligent.sbhh_fstm import SBHHFSTMSolver

def generate_tight_puzzle_data():
    """Genere un défi 'serré' : Physiquement possible mais très difficile."""
    # 4 jours x 4 plages = 16 créneaux
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi"]
    times = [("8h30", "10h30"), ("10h30", "12h30"), ("14h30", "16h30"), ("16h30", "18h30")]
    
    slots = {}
    sid = 0
    for day in days:
        for start, end in times:
            # Très restrictif : on définit certains slots comme non-sensibles pour forcer le choix
            slots[sid] = Timeslot(id=sid, day=day, start_time=start, end_time=end, is_sensitive=False)
            sid += 1
    
    # 2 Salles : Total 32 slots de capacité
    rooms = {
        "A1": Room(id="A1", capacity=100, room_type=CourseType.CM, building="A", features=[]),
        "TD1": Room(id="TD1", capacity=100, room_type=CourseType.TD, building="B", features=[]),
    }

    # 10 Enseignants avec SEULEMENT 4 créneaux de disponibilité chacun (très dur !)
    import random
    random.seed(42)
    teachers = {}
    all_slot_ids = list(slots.keys())
    for i in range(1, 11):
        avail = random.sample(all_slot_ids, 5) # 5 slots sur 16
        teachers[f"P{i}"] = Teacher(id=f"P{i}", name=f"P{i}", availabilities=avail)

    groups = {f"G{i}": StudentGroup(id=f"G{i}", size=30, curriculum_id="X") for i in range(1, 6)}

    # 15 Modules de 2h = 30 séances à caser dans 32 places dispos
    # Les contraintes de profs vont rendre le placement ultra difficile
    modules = {}
    for i in range(1, 16):
        t_id = f"P{(i % 10) + 1}"
        g_id = f"G{(i % 5) + 1}"
        modules[f"M{i}"] = Module(id=f"M{i}", name=f"M{i}", weekly_hours=2, 
                                  course_type=CourseType.CM if i <= 8 else CourseType.TD, 
                                  teacher_id=t_id, group_id=g_id)
    
    return modules, rooms, teachers, groups, slots

def run_puzzle_test():
    print("==================================================")
    print("PUZZLE TEST : LE DEFI DES DISPONIBILITES")
    print("==================================================\n")

    modules, rooms, teachers, groups, slots = generate_tight_puzzle_data()
    calculator = FitnessCalculator(modules, rooms, teachers, groups, slots)
    
    # --- [1] TEST HYBRIDE ---
    print("[1] Test SOLVEUR HYBRIDE (Classique)...")
    solver_h = HybridSolver(modules, rooms, slots, calculator)
    solver_h.pop_size = 50
    solver_h.generations = 100 # On lui donne plus de chances
    
    start = time.time()
    best_h = solver_h.solve()
    time_h = time.time() - start
    hard_h = calculator.calculate_f1_viability(best_h)

    print("\n------------------------------------------------")

    # --- [2] TEST SBHH ---
    print("[2] Test SOLVEUR SBHH (IA/Apprenant)...")
    solver_s = SBHHFSTMSolver(modules, rooms, slots, calculator)
    
    start = time.time()
    # On laisse l'IA apprendre avec 30,000 itérations
    best_s = solver_s.solve(max_iterations=30000) 
    time_s = time.time() - start
    hard_s = calculator.calculate_f1_viability(best_s)

    # --- SYNTHÈSE ---
    print("\n" + "="*70)
    print(f"{'ALGO':<15} | {'VIOLATIONS':<10} | {'TEMPS':<10} | {'POINT FORT'}")
    print("-" * 70)
    print(f"{'Hybride':<15} | {hard_h:<10} | {time_h:<10.2f}s | Exploration Standard")
    print(f"{'SBHH (IA)':<15} | {hard_s:<10} | {time_s:<10.2f}s | Adaptation Dynamique")
    print("="*70)

    if hard_s < hard_h:
        print(f"\nVICTOIRE SBHH : L'IA a trouve un meilleur agencement ({hard_s} vs {hard_h} fautes) !")
    elif hard_s == hard_h and hard_s == 0:
        print("\nEGALITE : Les deux ont trouve une solution parfaite, mais comparez le temps.")
    else:
        print("\nLe probleme reste complexe. Essayez d'augmenter les iterations du SBHH.")

if __name__ == "__main__":
    run_puzzle_test()
