import sys
import os
import requests
from typing import Dict, List, Tuple

# Configuration locale
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import core.models as core_models 
from core.fitness import FitnessCalculator
from solvers.experimental.hybrid_ga_sa import HybridSolver

def fetch_data_from_api(api_url: str) -> Tuple[Dict[str, core_models.Module], 
                                                Dict[str, core_models.Room], 
                                                Dict[str, core_models.Teacher], 
                                                Dict[str, core_models.StudentGroup], 
                                                Dict[int, core_models.Timeslot]]:
    """
    RÉCUPÉRATION WEB : Télécharge les données réelles via l'API Docker.
    """
    print(f" Récupération des données depuis {api_url}...")
    response = requests.get(api_url)
    if response.status_code != 200:
        raise Exception(f"Erreur API : {response.status_code}")
    
    data = response.json()
    
    # --- 1. Reconstruction des Salles ---
    rooms = {}
    for r in data["rooms"]:
        cap = r["capacity"] if r["capacity"] > 0 else 50 # Valeur de secours
        r_type = core_models.CourseType.CM if r["type"] == "AMPHI" else core_models.CourseType.TD
        rooms[str(r["id"])] = core_models.Room(id=str(r["id"]), capacity=cap, room_type=r_type, building="FSTG")

    # --- 2. Reconstruction des Groupes (Sections + TD) ---
    groups = {}
    for s in data["sections"]:
        groups[f"SEC-{s['id']}"] = core_models.StudentGroup(id=f"SEC-{s['id']}", size=0, curriculum_id=s["semestre"], parent_id=None)
    for tg in data["td_groups"]:
        groups[f"TDG-{tg['id']}"] = core_models.StudentGroup(id=f"TDG-{tg['id']}", size=0, curriculum_id="TD", parent_id=f"SEC-{tg['section_id']}")

    # --- 3. Reconstruction des Créneaux ---
    slots = {}
    for s in data["timeslots"]:
        slots[int(s["id"])] = core_models.Timeslot(id=int(s["id"]), day=s["day"], start_time=s["start_time"], end_time=s["end_time"])

    # --- 4. Reconstruction des Modules et Professeurs Fictifs ---
    modules = {}
    teachers = {}
    for m in data["modules"]:
        # Création d'un prof unique par module pour le test (Évite les conflits impossibles)
        t_id = f"Prof_{m['id']}"
        teachers[t_id] = core_models.Teacher(id=t_id, name=f"Prof_{m['name']}", availabilities=list(slots.keys()))
        
        # On distribue sur les sections pour le test
        g_id = f"SEC-{(m['id'] % 10) + 1}" # Assigne à l'une des 10 sections
        
        modules[str(m["id"])] = core_models.Module(
            id=str(m["id"]), name=m["name"],
            weekly_hours=2, # Fixé à 2h comme demandé
            course_type=core_models.CourseType.CM,
            teacher_id=t_id,
            group_id=g_id,
            is_block=True
        )

    return modules, rooms, teachers, groups, slots

def run_local_optimization():
    print("\n" + "="*50)
    print(" GÉNÉRATEUR D'EMPLOI DU TEMPS FSTG ")
    print("="*50)

    try:
        # 1. Alimentation par l'API
        api_url = "http://localhost:8000/data-for-solver"
        modules, rooms, teachers, groups, slots = fetch_data_from_api(api_url)
        print(f" {len(modules)} Modules et {len(rooms)} Salles chargés avec succès.")

        # 2. Configuration IA
        calculator = FitnessCalculator(modules, rooms, teachers, groups, slots, incompatibilities=[])
        solver = HybridSolver(modules, rooms, slots, calculator)
        
        # Réglages pour une bonne solution
        solver.pop_size = 60
        solver.generations = 150 
        
        print("\n Lancement de l'IA (GA + SA)...")
        best_solution = solver.solve()

        # 3. Analyse du résultat
        f1 = calculator.calculate_f1_viability(best_solution)
        score = calculator.calculate_total_fitness(best_solution)
        
        print("\n" + "-"*30)
        print(f"  BILAN DE L'OPTIMISATION :")
        print(f"   - Stabilité Mathématique (Fitness) : {score:.2f}")
        print(f"   - Violations de Contraintes (Hard) : {f1}")
        
        if f1 == 0:
            print(f" FÉLICITATIONS : Une solution 100% valide a été trouvée pour les {len(modules)} modules !")
        else:
            print(f"  Solution quasi-optimale ({f1} conflits restants).")
        print("-"*30)

    except Exception as e:
        print(f" ERREUR : {e}")
        print("Assurez-vous que le Backend Docker tourne sur http://localhost:8000")

if __name__ == "__main__":
    run_local_optimization()
