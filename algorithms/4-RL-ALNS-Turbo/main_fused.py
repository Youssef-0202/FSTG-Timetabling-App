import os
import json
import time
import sys

# Chargement des contraintes communes
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'commun')))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_manager import DataManager
from models import Schedule
from engine_fused import HybridEngine
from agent import QLearningAgent
from reporting import (print_generation_status, generate_final_report,
                       initialize_log_file, HistoryLogger)

# CONFIGURATION ULTRA (Target < 7000, ~12-15 min)
POP_SIZE      = 20
MAX_GEN       = 120
MUTATION_RATE = 0.30
ELITISM       = 4
SA_ITERATIONS = 1200
SA_TEMP       = 50.0
SA_COOLING    = 0.99
PATIENCE      = 40

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True,
    "S_STABILITY": True, "S_SHORT_DAY": True, "S_FREE_APM": True,
    "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}

def run_fused_optimization():
    print("=" * 60)
    print("  RECHERCHE FUSIONNEE : RL (STRATEGE) + ALNS (FOURMI)")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur chargement donnees.")
        return

    params = {
        "POP_SIZE": POP_SIZE, 
        "MAX_GEN": MAX_GEN,
        "MUTATION_RATE": MUTATION_RATE,
        "ELITISM": ELITISM,
        "SA_ITERATIONS": SA_ITERATIONS, 
        "SA_TEMP": SA_TEMP,
        "SA_COOLING": SA_COOLING,
        "ALGORITHM": "FUSED-RL-ALNS"
    }
    initialize_log_file(params, dm.get_stats())
    csv_logger = HistoryLogger(filename="fused_evolution_history.csv")

    # Initialisation de l'Agent intelligent (12 actions : 8 Micro + 4 Macro)
    agent = QLearningAgent(actions=list(range(12)), epsilon=0.15)
    
    engine = HybridEngine(
        dm,
        pop_size=POP_SIZE,
        constraints_mask=CONSTRAINTS_MASK,
        sa_iterations=SA_ITERATIONS,
        agent=agent
    )

    print("\n[STEP 1] Generation de la population hybride...")
    engine.create_initial_population()
    init_score = engine.population[0].fitness

    print("\n[STEP 2] Optimisation Fusionnee...\n")
    start_time = time.time()
    
    best_overall_score = float('inf')
    no_improvement_count = 0
    
    for gen in range(1, MAX_GEN + 1):
        # --- STRATEGIE DYNAMIQUE : Intensification en fin de parcours ---
        if gen > 80:
            engine.agent.epsilon = 0.05
        elif gen > 40:
            engine.agent.epsilon = 0.10
            
        gen_start = time.time()
        _, _ = engine.evolve()
        gen_dur = time.time() - gen_start

        best = engine.population[0]
        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK)
        
        # --- EARLY STOPPING (Optimisation Turbo) ---
        if best.fitness < best_overall_score:
            best_overall_score = best.fitness
            no_improvement_count = 0
        else:
            no_improvement_count += 1
            
        if no_improvement_count >= PATIENCE:
            print(f"\n[ULTRA] Arret precoce : Pas d'amelioration depuis {PATIENCE} generations.")
            break

    total_dur = time.time() - start_time
    generate_final_report(engine, total_dur, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    # --- 1. SAUVEGARDE BASE DE CONNAISSANCES RL (Q-Table) ---
    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    agent.save_knowledge(os.path.join(log_dir, "fused_strategic_intelligence.json"))
    print("[RL] Base de connaissances (Q-Table) sauvegardee.")

    best_final = engine.population[0]
    best_score = best_final.fitness
    best_hard  = best_final.h_violations

    # --- 2. PUSH AUTOMATIQUE VERS LA BASE DE DONNEES (via API REST) ---
    try:
        import requests
        from datetime import datetime

        result_payload = {
            "name": f"RL-ALNS Fused — Score: {best_score:.1f} | {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "algo_type": "fused",
            "created_at": datetime.now().isoformat(),
            "score_hard": int(best_hard),
            "score_soft": float(best_score),
            "data": best_final.to_dict(),
            "is_validated": False
        }

        API_URL = "http://localhost:8000/timetable-results"
        response = requests.post(API_URL, json=result_payload, timeout=30)

        if response.status_code == 201:
            res_id = response.json().get("id", "?")
            print(f"[DB] Resultat RL-ALNS Fused sauvegarde en base (ID={res_id}, score={best_score:.1f})")
        else:
            print(f"[DB] Echec du push en DB ({response.status_code}): {response.text[:200]}")

    except Exception as e:
        print(f"[DB] Erreur lors du push en base : {e}")

    # --- 3. EXPORT JSON LOCAL (backend/) pour compatibilité ---
    try:
        root_dir    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_fused.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[EXPORT] JSON local sauvegarde -> backend/generated_timetable_fused.json")
    except Exception as e:
        print(f"[EXPORT] Erreur lors de l'export local : {e}")

    # --- 4. BACKUP TIMESTAMPÉ dans logs/ (comme main_alns.py) ---
    try:
        backup_path = os.path.join(log_dir, f"backup_fused_{int(time.time())}.json")
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[BACKUP] Copie de sauvegarde creee -> {os.path.basename(backup_path)}")
    except Exception as e:
        print(f"[BACKUP] Erreur lors du backup : {e}")

    print(f"\n{'='*60}")
    print(f"  RUN TERMINE  - Score Final : {best_score:.1f} | Hard : {best_hard}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    run_fused_optimization()
