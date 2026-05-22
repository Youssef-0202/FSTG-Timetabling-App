import os
import sys
import json
import time
from datetime import datetime

# Chargement des contraintes communes
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Imports locaux
from commun.data_manager import DataManager
from commun.models import Schedule
from constraints_optimized import calculate_fitness_full
from engine_optimized import HybridEngine
from agent import QLearningAgent
from reporting import print_generation_status, generate_final_report, initialize_log_file, HistoryLogger

# CONFIGURATION ULTRA (Target < 12000, ~12-15 min)
POP_SIZE = 20
MAX_GEN = 120
MUTATION_RATE = 0.40
ELITISM = 4
SA_ITERATIONS = 1200
SA_TEMP = 50.0
SA_COOLING = 0.99
PATIENCE = 40

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True, "S_STABILITY": True,
    "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}

def run_rl_optimization():
    print("=" * 60)
    print(" [RL-CONTROLLER] - MASTER PFE OPTIMIZATION")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur chargement donnees.")
        return

    db_stats = {
        "nb_teachers": len(dm.teachers),
        "nb_rooms": len(dm.rooms),
        "nb_sections": len(dm.sections),
        "nb_module_parts": len(dm.module_parts),
        "nb_slots": len(dm.timeslots)
    }
    params = {
        "POP_SIZE": POP_SIZE, "MAX_GEN": MAX_GEN, "MUTATION_RATE": MUTATION_RATE,
        "SA_ITERATIONS": SA_ITERATIONS, "SA_TEMP": SA_TEMP
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="rl_evolution_history.csv")
    
    # Initialisation de l agent
    agent = QLearningAgent(actions=[0, 1, 2, 3])
    
    start_time_exec = time.time()
    engine = HybridEngine(
        dm, 
        pop_size=POP_SIZE, 
        constraints_mask=CONSTRAINTS_MASK,
        mutation_rate=MUTATION_RATE,
        elitism=ELITISM,
        sa_iterations=SA_ITERATIONS,
        sa_temp=SA_TEMP,
        sa_cooling=SA_COOLING,
        agent=agent
    )

    print("\n[STEP 1] Generation de la population initiale...")
    engine.create_initial_population()
    
    init_score, init_h, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    engine.population[0].h_violations = init_h
    engine.population[0].fitness = init_score

    print(f" Score Initial: {init_score} | H: {init_h}")

    print("\n[STEP 2] Debut de l evolution dirigee par RL...")
    # ── ETAPE 3 : EVOLUTION ──
    # Note: PATIENCE est défini dans la config en haut
    no_improve_count = 0
    best_score_ever = float('inf')

    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        
        sa_impact, diversity = engine.evolve()
        
        gen_dur = time.time() - gen_start
        best = engine.population[0]
        current_score = best.fitness if best.fitness is not None else float('inf')
        
        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK, diversity=diversity, sa_impact=sa_impact)

        # Early stopping
        if current_score < best_score_ever - 0.5:
            best_score_ever = current_score
            no_improve_count = 0
        else:
            no_improve_count += 1
            if no_improve_count >= PATIENCE:
                print(f"\n[STOP ANTICIPÉ] Pas d'amélioration depuis {PATIENCE} générations. Convergence atteinte à Gen {gen}.")
                break

    total_duration = time.time() - start_time_exec
    generate_final_report(engine, total_duration, init_score, CONSTRAINTS_MASK, actual_generations=gen)
    
    # Sauvegarde du savoir de l agent
    knowledge_path = os.path.join(os.path.dirname(__file__), "logs", "rl_knowledge.json")
    agent.save_knowledge(knowledge_path)
    print(f"\n[RL] Intelligence de l agent sauvegardee dans : {knowledge_path}")

    # --- INTEGRATION UI & BACKEND ---
    best_final = engine.population[0]
    
    # 1. Mise à jour SQL (Archive) via l API ou methode interne
    # if hasattr(best_final, 'sync_to_db'):
    #     print("[DB] Synchronisation de la solution RL dans la base de données...")
    #     best_final.sync_to_db()

    # 2. Exportation et Archivage en Base de Données
    try:
        import requests
        
        # Préparation des données pour l'archivage en DB
        _, h_final, s_final, _ = calculate_fitness_full(best_final, CONSTRAINTS_MASK)
        
        result_payload = {
            "algo_type": "rl",
            "created_at": datetime.now().isoformat(),
            "score_hard": 0,
            "score_soft": 0,
            "data": best_final.to_dict(),
            "is_validated": False
        }
        
        # Envoi au backend
        API_URL = "http://localhost:8000/timetable-results"
        response = requests.post(API_URL, json=result_payload)
        
        if response.status_code == 201:
            print(f"[DB-ARCHIVE] Résultat RL sauvegardé avec succès en base de données.")
        else:
            print(f"[WARN] Échec de l'archivage en DB ({response.status_code}): {response.text}")

        # Export JSON local pour compatibilité
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_rl.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
            
    except Exception as e:
        print(f"[ERREUR] Archivage/Export UI échoué : {e}")

    # --- NOUVEAUX : BACKUP JSON DANS LE DOSSIER LOGS ---
    try:
        backup_dir = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"backup_rl_{int(time.time())}.json")
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[BACKUP] Copie de sauvegarde créée dans : {os.path.basename(backup_path)}")
    except Exception as e:
        print(f"[WARN] Erreur lors de la création du backup local : {e}")

if __name__ == "__main__":
    run_rl_optimization()
