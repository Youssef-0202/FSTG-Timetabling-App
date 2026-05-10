# ==============================================================================
# main_alns.py — Paramètres exacts du run S=9217
# NE PAS CHANGER LES PARAMÈTRES SA AVANT D'AVOIR REPRODUIT LE 9217.
# ==============================================================================

import os
import json
import time

from data_manager import DataManager
from models import Schedule
from constraints import calculate_fitness_full
from engine_alns import HybridEngine
from reporting import (print_generation_status, generate_final_report,
                       initialize_log_file, HistoryLogger)

# ── PARAMÈTRES DU RUN GAGNANT (S=9217) ───────────────────────────────────────
POP_SIZE      = 20
MAX_GEN       = 150
MUTATION_RATE = 0.40
ELITISM       = 2
SA_ITERATIONS = 1200   # ← valeur du run 9217
SA_TEMP       = 50.0   # ← valeur du run 9217
SA_COOLING    = 0.965  # ← valeur du run 9217

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
    print("  ILS-ALNS v1 — VERSION ORIGINALE (S=9217)")
    print("  Objectif : reproduire puis améliorer ce score")
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
        "SA_COOLING": SA_COOLING, "ALGORITHM": "ILS-ALNS-v1-original"
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

    print("\n[STEP 1] Population initiale...")
    engine.create_initial_population()
    init_score = engine.population[0].fitness
    print(f"  Score Initial : {init_score:.1f} | H: {engine.population[0].h_violations}")

    print("\n[STEP 2] Évolution...\n")

    PATIENCE         = 25
    no_improve_count = 0
    best_score_ever  = float('inf')

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

        if no_improve_count == PATIENCE // 2:
            n_inj = max(2, POP_SIZE // 3)
            print(f"\n  [DIVERSITÉ] Plateau Gen {gen} → injection {n_inj} individus")
            engine.inject_diversity(n_replace=n_inj)
            no_improve_count = 0

        if no_improve_count >= PATIENCE:
            print(f"\n[STOP] Convergence à Gen {gen}.")
            break

    total_dur = time.time() - start_time
    generate_final_report(engine, total_dur, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    bandit_stats = engine.get_bandit_stats()
    print("\n[BANDIT UCB1] Opérateurs :")
    print(f"  {'Opérateur':<18} {'Count':>8} {'Avg Reward':>12}")
    print("  " + "-" * 42)
    for name, s in sorted(bandit_stats.items(), key=lambda x: -x[1]['avg_reward']):
        print(f"  {name:<18} {s['count']:>8} {s['avg_reward']:>12.4f}")

    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "alns_v1_bandit_stats.json"), 'w') as f:
        json.dump(bandit_stats, f, indent=4)

    best_final = engine.population[0]
    if hasattr(best_final, 'sync_to_db'):
        best_final.sync_to_db()

    try:
        root_dir    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_alns_v1.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"\n[EXPORT] {export_path}")
        try:
            from export_excel_rl import run_export
            run_export()
        except Exception as e:
            print(f"[WARN] Excel : {e}")
    except Exception as e:
        print(f"[WARN] Export : {e}")


if __name__ == "__main__":
    run_alns_optimization()