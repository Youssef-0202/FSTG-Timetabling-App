# ==============================================================================
# main_alns.py — Point d'entrée ILS-ALNS
#
# Remplace main_rl.py en utilisant le nouveau moteur engine_alns.py
# Interface identique : même reporting, même export, même CSV logger.
#
# Paramètres optimaux suggérés (basés sur votre Grid Search) :
#   pop_size=20, sa_iterations=2000, sa_cooling=0.98, mutation_rate=0.4
# ==============================================================================

import os
import sys
import json
import time

from data_manager import DataManager
from models import Schedule
from constraints import calculate_fitness_full
from engine_alns import HybridEngine        # ← NOUVEAU moteur
from reporting import (print_generation_status, generate_final_report,
                       initialize_log_file, HistoryLogger)

# ── CONFIGURATION (inspirée de vos meilleurs résultats Grid Search) ──────────
POP_SIZE       = 20      # Grid search : 20 était optimal
MAX_GEN        = 150     # Plus de générations, chaque gén est plus ciblée
MUTATION_RATE  = 0.40
ELITISM        = 2
SA_ITERATIONS  = 2000    # Budget SA plus élevé (pas d'overhead RL)
SA_TEMP        = 80.0    # Température plus élevée pour accepter + de mouvements
SA_COOLING     = 0.980   # Refroidissement lent = exploration plus longue

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
    print("  [ILS-ALNS] MOTEUR ADAPTATIF — MASTER PFE OPTIMIZATION")
    print("  Algorithme : ILS + SA + Bandit UCB1 (8 opérateurs)")
    print("=" * 65)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur chargement données.")
        return

    db_stats = {
        "nb_teachers":    len(dm.teachers),
        "nb_rooms":       len(dm.rooms),
        "nb_sections":    len(dm.sections),
        "nb_module_parts":len(dm.module_parts),
        "nb_slots":       len(dm.timeslots)
    }
    params = {
        "POP_SIZE": POP_SIZE, "MAX_GEN": MAX_GEN, "MUTATION_RATE": MUTATION_RATE,
        "SA_ITERATIONS": SA_ITERATIONS, "SA_TEMP": SA_TEMP, "SA_COOLING": SA_COOLING,
        "ALGORITHM": "ILS-ALNS-UCB1"
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="alns_evolution_history.csv")

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

    print("\n[STEP 1] Génération de la population initiale (Greedy 80% + Random 20%)...")
    engine.create_initial_population()

    init_score = engine.population[0].fitness
    print(f"  Score Initial (meilleur): {init_score:.1f} | H: {engine.population[0].h_violations}")

    print("\n[STEP 2] Début de l'évolution ILS-ALNS...")
    print(f"  Opérateurs actifs : {', '.join(['Op'+str(i) for i in range(8)])}")
    print(f"  Bandit : UCB1 (C=1.5) — apprend en ligne\n")

    PATIENCE         = 25
    no_improve_count = 0
    best_score_ever  = float('inf')

    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        sa_impact, diversity = engine.evolve()
        gen_dur = time.time() - gen_start

        best = engine.population[0]
        current_score = best.fitness if best.fitness is not None else float('inf')

        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK,
                       diversity=diversity, sa_impact=sa_impact)

        # Early stopping avec patience
        if current_score < best_score_ever - 0.5:
            best_score_ever  = current_score
            no_improve_count = 0
        else:
            no_improve_count += 1

        # Injection de diversité si plateau court (< PATIENCE/2)
        if no_improve_count == PATIENCE // 2:
            print(f"\n  [DIVERSITÉ] Plateau détecté à Gen {gen} → injection de {POP_SIZE//3} nouveaux individus")
            engine.inject_diversity()
            no_improve_count = 0

        # Arrêt si plateau long
        if no_improve_count >= PATIENCE:
            print(f"\n[STOP ANTICIPÉ] Convergence à Gen {gen} (pas d'amélioration depuis {PATIENCE} gén.)")
            break

    total_duration = time.time() - start_time

    # ── Rapport final ─────────────────────────────────────────────────────────
    generate_final_report(engine, total_duration, init_score, CONSTRAINTS_MASK, actual_generations=gen)

    # Affichage des statistiques du bandit UCB1
    bandit_stats = engine.get_bandit_stats()
    print("\n[BANDIT UCB1] Statistiques des opérateurs :")
    print(f"  {'Opérateur':<20} {'Utilisations':>12} {'Récompense Moy':>15}")
    print("  " + "-" * 50)
    for name, stats in sorted(bandit_stats.items(), key=lambda x: -x[1]['avg_reward']):
        print(f"  {name:<20} {stats['count']:>12} {stats['avg_reward']:>15.4f}")

    # Sauvegarde des stats bandit (remplace rl_knowledge.json)
    knowledge_path = os.path.join(os.path.dirname(__file__), "logs", "alns_bandit_stats.json")
    os.makedirs(os.path.dirname(knowledge_path), exist_ok=True)
    with open(knowledge_path, 'w') as f:
        json.dump(bandit_stats, f, indent=4)
    print(f"\n[ALNS] Statistiques bandit sauvegardées : {knowledge_path}")

    # ── Export ────────────────────────────────────────────────────────────────
    best_final = engine.population[0]

    if hasattr(best_final, 'sync_to_db'):
        print("[DB] Synchronisation dans la base de données...")
        best_final.sync_to_db()

    try:
        root_dir    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable_alns.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"[EXPORT] Solution ALNS sauvegardée : {export_path}")

        try:
            print("[EXCEL] Génération du fichier Excel Premium (ALNS)...")
            from export_excel_rl import run_export
            run_export()
        except Exception as e:
            print(f"[WARN] Export Excel : {e}")

    except Exception as e:
        print(f"[WARN] Export UI : {e}")


if __name__ == "__main__":
    run_alns_optimization()