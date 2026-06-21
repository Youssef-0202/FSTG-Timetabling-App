import os
import json
import time
import sys

# Chargement des contraintes communes
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from commun.data_manager import DataManager
from commun.models import Schedule
from constraints_optimized import calculate_fitness_full
from engine_alns import HybridEngine
from reporting import (print_generation_status, generate_final_report,
                       initialize_log_file, HistoryLogger)

# CONFIGURATION ULTRA (Target < 10000, ~12-15 min)
POP_SIZE = 20
MAX_GEN = 120
MUTATION_RATE = 0.40
ELITISM = 4
SA_ITERATIONS = 1200
SA_TEMP = 50.0
SA_COOLING = 0.99
PATIENCE = 40

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True,
    "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True,
    "S_STABILITY": True, "S_SHORT_DAY": True, "S_FREE_APM": True,
    "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}


def run_alns_optimization():
    print("=" * 60)
    print("  ILS-ALNS v1 — PARAMÈTRES EXACTS DU RUN 9217")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur chargement données.")
        return

    db_stats = {
        "nb_teachers":     len(dm.teachers),
        "nb_rooms":        len(dm.rooms),
        "nb_sections":     len(dm.sections),
        "nb_module_parts": len(dm.module_parts),
        "nb_slots":        len(dm.timeslots)
    }
    params = {
        "POP_SIZE": POP_SIZE, "MAX_GEN": MAX_GEN,
        "SA_ITERATIONS": SA_ITERATIONS, "SA_TEMP": SA_TEMP,
        "SA_COOLING": SA_COOLING, "ALGORITHM": "ILS-ALNS-v1"
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="alns_v1_evolution_history.csv")

    start_time = time.time()
    engine = HybridEngine(
        dm,
        pop_size=POP_SIZE,
        constraints_mask=CONSTRAINTS_MASK,
        mutation_rate=MUTATION_RATE,
        elitism=ELITISM,
        sa_iterations=SA_ITERATIONS,
        sa_temp=SA_TEMP,
        sa_cooling=SA_COOLING,
    )

    print("\n[STEP 1] Population initiale ...") # (Greedy 80% + Random 20%)
    engine.create_initial_population()
    init_score = engine.population[0].fitness
    print(f"  Score Initial : {init_score:.1f} | H: {engine.population[0].h_violations}")

    print("\n[STEP 2] Évolution...\n")

    PATIENCE         = 30
    no_improve_count = 0
    best_score_ever  = float('inf')
    inject_count     = 0
    MAX_INJECTIONS   = 4  # Limite 4 injections max pour ne pas boucler indéfiniment

    for gen in range(1, MAX_GEN + 1):
        gen_start            = time.time()
        sa_impact, diversity = engine.evolve()
        gen_dur              = time.time() - gen_start

        best          = engine.population[0]
        current_score = best.fitness if best.fitness is not None else float('inf')

        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK,
                       diversity=diversity, sa_impact=sa_impact)

        if current_score < best_score_ever - 0.5:
            best_score_ever  = current_score
            no_improve_count = 0
        else:
            no_improve_count += 1

        if no_improve_count == PATIENCE // 2 and inject_count < MAX_INJECTIONS:
            n_inj = max(2, POP_SIZE // 3)
            inject_count += 1
            print(f"\n  [DIVERSITE] Plateau Gen {gen} -> injection {n_inj} individus (#{inject_count}/{MAX_INJECTIONS})")
            engine.inject_diversity(n_replace=n_inj)
            no_improve_count = 0  # Reset uniquement si on injecte encore

        if no_improve_count >= PATIENCE:
            print(f"\n[STOP] Convergence a Gen {gen}.")
            break

    total_dur = time.time() - start_time
    generate_final_report(engine, total_dur, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    bandit_stats = engine.get_bandit_stats()
    print("\n[BANDIT UCB1] Statistiques :")
    print(f"  {'Opérateur':<18} {'Count':>8} {'Avg Reward':>12}")
    print("  " + "-" * 42)
    for name, s in sorted(bandit_stats.items(), key=lambda x: -x[1]['avg_reward']):
        print(f"  {name:<18} {s['count']:>8} {s['avg_reward']:>12.4f}")

    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "alns_v1_bandit_stats.json"), 'w') as f:
        json.dump(bandit_stats, f, indent=4)

    best_final = engine.population[0]
    # if hasattr(best_final, 'sync_to_db'):
    #     print("[DB] Synchronisation...")
    #     best_final.sync_to_db()

    try:
        import requests
        from datetime import datetime
        
        # Préparation des données pour l'archivage en DB
        result_payload = {
            "algo_type": "alns",
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
            print(f"[DB-ARCHIVE] Résultat ALNS sauvegardé avec succès en base de données.")
        else:
            print(f"[WARN] Échec de l'archivage en DB ({response.status_code}): {response.text}")

        # Pour compatibilité, on peut quand même garder une trace locale si besoin
        root_dir    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_alns.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
            
    except Exception as e:
        print(f"[WARN] Erreur lors de l'archivage/export : {e}")

    # --- NOUVEAUX : BACKUP JSON DANS LE DOSSIER LOGS ---
    try:
        backup_dir = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"backup_alns_v1_{int(time.time())}.json")
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[BACKUP] Copie de sauvegarde créée dans : {os.path.basename(backup_path)}")
    except Exception as e:
        print(f"[WARN] Erreur lors de la création du backup local : {e}")


if __name__ == "__main__":
    run_alns_optimization()