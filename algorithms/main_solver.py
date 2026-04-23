import requests
from data_manager import DataManager, API_BASE_URL
from engine import HybridEngine
from constraints import calculate_fitness_full


import json
import os

def run_optimization():
    
    dm = DataManager()
    if not dm.fetch_all_data(): return
    
    test_mask = {
        "H1": True, "H2": True, "H3": True, "H4": True, "H9": True,
        "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True,
        "S_BALANCE": True, "S_STABILITY": True, "S_EMPTY_DAYS": True, "S_PREFERENCES": True
    }

    engine = HybridEngine(dm, pop_size=100, constraints_mask=test_mask)
    engine.create_initial_population()
    
    best_overall = None # À chaque génération, si la solution actuelle est la meilleure qu'on ait jamais vue on la sauvegarde dans ce coffre-fort. À la toute fin, c'est ce best_overall qu'on va exporter en JSON.
    h_zero_since = 0
    MAX_GEN_AFTER_H0 = 30 

    for gen in range(1, 180): # Limite raisonnable
        engine.evolve() # create a new population 
        best_gen = engine.population[0] # select  best solution for current generation
        h, s, details = calculate_fitness_full(best_gen, test_mask)
        
        print(f"Génération {gen:03d} | Hard: {h} | Soft: {s} ")
        
        best_overall = best_gen
        if h == 0 :
            h_zero_since += 1
            if h_zero_since >= MAX_GEN_AFTER_H0: break

    # FAILSAVE : On sauvegarde AVANT tout affichage console risqué
    export_schedule_to_json(best_overall)

def export_schedule_to_json(schedule, filename="../backend/generated_timetable.json"):
    """Exporte le résultat de l'IA dans un fichier JSON pour l'interface sans toucher à la BDD"""
    print(f"\n---  Exportation de {len(schedule.assignments)} affectations vers {filename} ---")
    
    # 1. On récupère la base actuelle pour garder les infos (td_groups, is_locked...)
    try:
        current_db = requests.get(f"{API_BASE_URL}/assignments").json()
        db_map = {a['id']: a for a in current_db}
    except Exception as e:
        print(" Erreur de connexion au backend pour la récupération des données.")
        return
        
    export_data = []
    
    for a in schedule.assignments:
        assignment_id = a.module_part.id
        orig = db_map.get(assignment_id, {})
        
        # On formatte tel que l'interface frontend l'attend (comme l'API /assignments)
        export_item = {
            "id": assignment_id,
            "module_part_id": orig.get("module_part_id", getattr(a.module_part, 'module_id', 0)),
            "teacher_id": orig.get("teacher_id", getattr(a.module_part, 'teacher_id', 0)),
            "section_id": orig.get("section_id"),
            "room_id": a.room.id,
            "slot_id": a.timeslot.id,
            "is_locked": orig.get("is_locked", False),
            "td_groups": orig.get("td_groups", []),
            "module_part": orig.get("module_part", {}),
            "teacher": orig.get("teacher", {}),
            "room": {"id": a.room.id, "name": a.room.name},
            "timeslot": {"id": a.timeslot.id, "day": a.timeslot.day, "start_time": a.timeslot.start_time, "end_time": a.timeslot.end_time},
        }
        export_data.append(export_item)
        
    # On sauvegarde dans le fichier
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=4, ensure_ascii=False)
        
    print(f"   Planning sauvegardé avec succès dans {filepath}")
    print("   Allez sur localhost:3000/timetable-preview pour voir l'aperçu !\n")


if __name__ == "__main__":
    run_optimization()
