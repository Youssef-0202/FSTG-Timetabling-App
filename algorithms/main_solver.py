import requests
from data_manager import DataManager, API_BASE_URL
from engine import HybridEngine
from constraints import calculate_fitness_full


import json
import os

def export_schedule_to_json(schedule, filename="../backend/generated_timetable.json"):
    """Exporte le résultat de l'IA dans un fichier JSON pour l'interface sans toucher à la BDD"""
    print(f"\n--- 💾 Exportation de {len(schedule.assignments)} affectations vers {filename} ---")
    
    # 1. On récupère la base actuelle pour garder les infos (td_groups, is_locked...)
    try:
        current_db = requests.get(f"{API_BASE_URL}/assignments").json()
        db_map = {a['id']: a for a in current_db}
    except Exception as e:
        print("❌ Erreur de connexion au backend pour la récupération des données.")
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
        
    print(f"  ✅ Planning sauvegardé avec succès dans {filepath}")
    print("  🌐 Allez sur localhost:3000/timetable-preview pour voir l'aperçu !\n")


def print_solution_summary(schedule):
    """Affiche un résumé lisible du meilleur planning trouvé"""
    print("\n" + "="*50)
    print(" MEILLEURE SOLUTION TROUVÉE")
    print("="*50)
    
    sorted_as = sorted(schedule.assignments, key=lambda a: (a.timeslot.day, a.timeslot.start_time))
    
    for a in sorted_as:
        m_type = getattr(a.module_part, 'type', '??')
        print(f"[{a.timeslot.day}] {a.timeslot.start_time} -> {m_type} | "
              f"Salle: {a.room.name} ({a.room.capacity}) | Section: {a.module_part.section_id}")
    
    print("="*50)


def run_optimization():
    # 1. Charger les données
    dm = DataManager()
    if not dm.fetch_all_data():
        return
    if not dm.module_parts:
        print("\n AUCUNE AFFECTATION À PLACER DANS LA BASE !")
        return
    
    # 2. Configurer le moteur 
    engine = HybridEngine(dm, pop_size=100)
    print("\n--- Initialisation de la population ---")
    engine.create_initial_population()
    
    print("\n--- Lancement de l'optimisation Hybride (GA + SA) ---")
    
    best_overall = None
    h_zero_since = 0
    MAX_GEN_AFTER_H0 = 30  # Polishing phase

    for gen in range(1, 401): # Increased total max generations
        engine.evolve()
        best_gen = engine.population[0]
        
        h, s, details = calculate_fitness_full(best_gen)
        detail_str = f"H1(P):{details['H1_Teacher']} H2(S):{details['H2_Room']} H3(G):{details['H3_Section']} H4(C):{details['H4_Capacity']}"
        
        # UI: Add a tag if we are in polishing phase
        status = ""
        if h == 0:
            h_zero_since += 1
            status = f" [POLISSAGE {h_zero_since}/{MAX_GEN_AFTER_H0}]"
        
        print(f"Génération {gen:03d} | Total Hard: {h} | Gaps: {s} | {detail_str}{status}")
        
        best_overall = best_gen
        
        # Stop condition: H=0 found AND we spent enough time polishing OR we hit very low gaps
        if h == 0 and (h_zero_since >= MAX_GEN_AFTER_H0 or s <= 1):
            print(f"\n✨ Optimisation terminée avec succès !")
            break
    
    # 3. Afficher le résumé en console
    print_solution_summary(best_overall)
    
    # 4. Synchroniser vers le fichier JSON → Frontend aperçu
    export_schedule_to_json(best_overall)


if __name__ == "__main__":
    run_optimization()
