# ==============================================================================
# main_alns.py (V1.1 - IMPROVED TURBO)
# ==============================================================================

import os
import json
import time
import sys
from datetime import datetime

# Configurer les chemins pour importer les modules partagés
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "algorithms"))
sys.path.append(os.path.join(BASE_DIR, "algorithms", "commun"))

from commun.data_manager import DataManager
from engine_alns import HybridEngine
from commun.constraints import calculate_fitness_full

# --- CONFIGURATION V1.1 (OPTIMISATION TEMPS) ---
POP_SIZE = 12
MAX_GEN = 60
MUTATION_RATE = 0.40
ELITISM = 3
SA_ITERATIONS = 800
SA_TEMP = 50.0
SA_COOLING = 0.98   # Plus rapide que 0.99
PATIENCE = 20

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True, "S_STABILITY": True,
    "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True,
}

def run_alns_optimization():
    print("=" * 60)
    print(" ILS-ALNS V1.1 - OPTIMISATION TEMPS (TARGET < 8 MIN)")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("[ERROR] Échec chargement.")
        return

    from commun.reporting import print_generation_status, generate_final_report, initialize_log_file, HistoryLogger
    
    db_stats = {"nb_teachers": len(dm.teachers), "nb_rooms": len(dm.rooms), "nb_sections": len(dm.sections), "nb_module_parts": len(dm.module_parts), "nb_slots": len(dm.timeslots)}
    params = {
        "POP_SIZE": POP_SIZE, 
        "MAX_GEN": MAX_GEN, 
        "SA_ITERATIONS": SA_ITERATIONS, 
        "SA_TEMP": SA_TEMP,
        "SA_COOLING": SA_COOLING,
        "MUTATION_RATE": 0.35, # Valeur factice pour le log
        "ALGO": "ALNS-Improved"
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="alns_improved_history.csv")

    start_time = time.time()
    engine = HybridEngine(
        dm, pop_size=POP_SIZE, constraints_mask=CONSTRAINTS_MASK,
        mutation_rate=MUTATION_RATE, elitism=ELITISM,
        sa_iterations=SA_ITERATIONS, sa_temp=SA_TEMP, sa_cooling=SA_COOLING
    )

    print("\n[STEP 1] Population initiale...")
    engine.create_initial_population()
    init_score = engine.get_score(engine.population[0])
    print(f"  Score Initial : {init_score:.1f} | H: {engine.population[0].h_violations}")

    print("\n[STEP 2] Évolution ALNS...")
    best_score_ever = float('inf')
    no_improve_count = 0

    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        sa_impact, diversity = engine.evolve()
        gen_dur = time.time() - gen_start
        
        best = engine.population[0]
        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK, diversity=diversity, sa_impact=sa_impact)
        
        if best.fitness < best_score_ever - 1:
            best_score_ever = best.fitness
            no_improve_count = 0
        else:
            no_improve_count += 1
            if no_improve_count >= PATIENCE:
                print(f"\n[STOP] Convergence ALNS à Gen {gen}.")
                break

    total_dur = time.time() - start_time
    generate_final_report(engine, total_dur, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    # Exportation finale
    try:
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_alns.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(engine.population[0].to_dict(), f, indent=4, ensure_ascii=False)
    except: pass

    print(f"\n[FIN] Temps total : {total_dur/60:.2f} minutes.")

if __name__ == "__main__":
    run_alns_optimization()
