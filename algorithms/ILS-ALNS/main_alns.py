# ==============================================================================
# main_alns.py v3 — Point d'entrée ILS-ALNS v3
#
# Paramètres v3 (corrigés pour les 5 fixes) :
#   sa_temp       : 60.0  (était 40 → T*0.8=48 pour non-élites, assez pour CompactProf)
#   sa_cooling    : 0.9985 (plus lent que 0.985 → exploite mieux le budget 2500 its)
#   pop_size      : 15    (inchangé)
#   sa_iterations : 2500  (inchangé)
#   PATIENCE      : 35    (augmenté de 30 pour laisser plus de temps au bandit v3)
# ==============================================================================

import os
import json
import time

from data_manager import DataManager
from models import Schedule
from constraints import calculate_fitness_full
from engine_alns import HybridEngine     # ← même import, fichier remplacé
from reporting import (print_generation_status, generate_final_report,
                       initialize_log_file, HistoryLogger)

# ── CONFIGURATION v3 ─────────────────────────────────────────────────────────
POP_SIZE      = 15
MAX_GEN       = 200
MUTATION_RATE = 0.40
ELITISM       = 2
SA_ITERATIONS = 2500
SA_TEMP       = 60.0    # ← v3 : 60 (était 40) pour T*0.8=48 sur non-élites
SA_COOLING    = 0.9985  # ← v3 : plus lent que 0.985

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True,
    "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True,
    "S_STABILITY": True, "S_SHORT_DAY": True, "S_FREE_APM": True,
    "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}


def run_alns_optimization():
    print("=" * 65)
    print("  [ILS-ALNS v3] — 5 CORRECTIONS ARCHITECTURALES")
    print("  FIX-1 : StabilizeRoom PARTIEL par (module, type)")
    print("  FIX-2 : Récompense normalisée (REWARD_UNIT=10)")
    print("  FIX-3 : UCB1 window=800 + ε-greedy=5%")
    print("  FIX-4 : T non-élites = 60*0.8=48 (était 20)")
    print("  FIX-5 : SwapSlotSameDay (nouveau opérateur S3)")
    print("=" * 65)

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
        "SA_COOLING": SA_COOLING, "ALGORITHM": "ILS-ALNS-UCB1-v3"
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="alns_v3_evolution_history.csv")

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

    print("\n[STEP 1] Génération de la population initiale (Greedy S6-aware 80% + Random 20%)...")
    engine.create_initial_population()
    init_score = engine.population[0].fitness
    print(f"  Score Initial (meilleur greedy) : {init_score:.1f}")
    print(f"  Hard violations                 : {engine.population[0].h_violations}")
    print(f"  Opérateurs actifs               : {', '.join(engine.get_bandit_stats().keys())}")

    print("\n[STEP 2] Évolution ILS-ALNS v3...\n")

    PATIENCE         = 35
    no_improve_count = 0
    best_score_ever  = float('inf')

    for gen in range(1, MAX_GEN + 1):
        gen_start        = time.time()
        sa_impact, diversity = engine.evolve()
        gen_dur          = time.time() - gen_start

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
            n_inj = max(2, POP_SIZE // 4)
            print(f"\n  [DIVERSITÉ] Plateau Gen {gen} → injection {n_inj} individus")
            engine.inject_diversity(n_replace=n_inj)
            no_improve_count = 0

        if no_improve_count >= PATIENCE:
            print(f"\n[STOP ANTICIPÉ] Convergence à Gen {gen}.")
            break

    total_dur = time.time() - start_time
    generate_final_report(engine, total_dur, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    # ── Rapport bandit v3 ─────────────────────────────────────────────────────
    bandit_stats = engine.get_bandit_stats()
    print("\n[BANDIT UCB1 v3] Statistiques des opérateurs (récompense normalisée) :")
    print(f"  {'Opérateur':<22} {'Utilisations':>12} {'Récompense Moy':>15}")
    print("  " + "-" * 52)
    for name, s in sorted(bandit_stats.items(), key=lambda x: -x[1]['avg_reward']):
        bar = '█' * min(20, int(s['avg_reward'] * 10))
        print(f"  {name:<22} {s['count']:>12} {s['avg_reward']:>12.4f}  {bar}")

    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "alns_v3_bandit_stats.json"), 'w') as f:
        json.dump(bandit_stats, f, indent=4)
    print(f"\n[ALNS] Stats sauvegardées dans logs/alns_v3_bandit_stats.json")

    # ── Export ────────────────────────────────────────────────────────────────
    best_final = engine.population[0]
    if hasattr(best_final, 'sync_to_db'):
        best_final.sync_to_db()

    try:
        root_dir    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_alns_v3.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[EXPORT] Solution sauvegardée : {export_path}")
        try:
            from export_excel_rl import run_export
            run_export()
        except Exception as e:
            print(f"[WARN] Export Excel : {e}")
    except Exception as e:
        print(f"[WARN] Export UI : {e}")


if __name__ == "__main__":
    run_alns_optimization()