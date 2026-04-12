import requests
from data_manager import DataManager,API_BASE_URL
from engine import HybridEngine




def save_schedule_to_db(schedule):
    """Met à jour les affectations existantes avec les résultats de l'IA"""
    print(f"--- Mise à jour de {len(schedule.assignments)} affectations ---")
    
    for a in schedule.assignments:
        # On utilise l'ID de l'affectation existante pour la mettre à jour
        assignment_id = a.module_part.id 
        
        payload = {
            "room_id": a.room.id,
            "timeslot_id": a.timeslot.id,
            "status": "PLACED" # On change le statut de "À placer" à "Placé"
        }
        
        try:
            # On utilise PUT pour modifier l'enregistrement existant
            r = requests.put(f"{API_BASE_URL}/assignments/{assignment_id}", json=payload)
            if r.status_code != 200:
                print(f"Erreur sur l'ID {assignment_id}: {r.text}")
        except Exception as e:
            print(f"Erreur réseau: {e}")
            
    print(" Emploi du temps mis à jour avec succès dans la base !")

def print_solution_summary(schedule):
    """Affiche un résumé lisible du meilleur planning trouvé"""
    print("\n" + "="*50)
    print(" MEILLEURE SOLUTION TROUVÉE")
    print("="*50)
    
    # On trie par jour et par heure pour la lecture
    sorted_as = sorted(schedule.assignments, key=lambda a: (a.timeslot.day, a.timeslot.start_time))
    
    for a in sorted_as:
        print(f"[{a.timeslot.day}] {a.timeslot.start_time} -> {a.module_part.type} | "
              f"Salle: {a.room.name} | Section: {a.module_part.section_id}")
    
    print("="*50)

def run_optimization():
    # 1. Charger les données
    dm = DataManager()
    if not dm.fetch_all_data():
        return
    #  Vérification si des séances existent
    if not dm.module_parts:
        print("\n AUCUNE AFFECTATION À PLACER DANS LA BASE !")
        print("Ajoutez des séances via l'interface (Statut: À placer) avant de lancer.")
        return
    
    # 2. Configurer le moteur 
    engine = HybridEngine(dm, pop_size=20)
    print("\n--- Initialisation de la population ---")
    engine.create_initial_population()
    
    print("\n--- Lancement de l'optimisation Hybride (GA + SA) ---")
    
    for gen in range(1, 21): # 20 générations
        engine.evolve()
        best_gen = engine.population[0]
        
        score = engine.get_score(best_gen)
        h = int(score // 10000)
        s = int(score % 10000)
        
        print(f"Génération {gen:02d} | Conflits Hard: {h} | Pénalités Soft: {s}")
        
        if h == 0 and s < 5: # Si on trouve une solution quasi-parfaite
            break
    
    # 3. Résultat final
    best_overall = engine.population[0]
    print_solution_summary(best_overall)
    

if __name__ == "__main__":
    run_optimization()