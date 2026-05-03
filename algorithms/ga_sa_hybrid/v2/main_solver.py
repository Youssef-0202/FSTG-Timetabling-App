
# ==============================================================================
# main_solver.py — Chef d Orchestre de l algorithme GA+SA
# 
# Role        : Orchestre l execution complete de l algorithme de bout en bout.
#               Il decide QUAND lancer, COMBIEN de generations faire,
#               QUAND s arreter, et sauvegarde le resultat final.
# Dependances : DataManager | HybridEngine | calculate_fitness_full
# Execution   : python main_solver.py  
# ==============================================================================

import os
import sys
import json
import time
from datetime import datetime

# Ajouter le chemin racine pour permettre les imports de 'commun'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from commun.data_manager import DataManager
from commun.models import Schedule
from commun.constraints import calculate_fitness_full
from engine import HybridEngine


# CONFIGURATION ET PARAMÈTRES 
# ==============================================================================

# 1. Parametres de l'Algorithme Genetique (GA)
POP_SIZE = 30          # Optimal selon Grid Search
MAX_GEN = 300          # Large budget pour convergence totale
MUTATION_RATE = 0.40   # Record de performance au Round 3
ELITISM = 2
MAX_GEN_AFTER_H0 = 50

# 2. Parametres du Recuit Simule (SA) - Recherche Locale
SA_ITERATIONS = 1200   # Force maximale pour polissage Soft (Score < 8000)
SA_TEMP = 50.0
SA_COOLING = 0.965     # Refroidissement ideal pour sortir des minima locaux

# 3. Masque des Contraintes (Activer/Desactiver des regles)
CONSTRAINTS_MASK = {
    # Contraintes Dures (Hard)
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,

    # Contraintes Souples (Soft)
    "S_GAPS":          True,  # Réduire les trous (S3)
    "S_LUNCH":         True,  # Pause déjeuner (S4)
    "S_BALANCE":       True,  # Équilibre journalier (S5)
    "S_STABILITY":     True,  # Stabilité des salles (S6)
    "S_SHORT_DAY":     True,  # Éviter les journées trop courtes (S7)
    "S_FREE_APM":      True,  # Après-midis libres (S8)
    "S_FATIGUE":       True,  # Éviter la fatigue de fin de journée (S9)
    "S_SATURDAY":      True,  # Pénalité samedi (S10)
    "S_MIXING":        True,  # Éviter le mélange de modules
    "S_CM_DISPERSION": True,  # Dispersion des CM
}

# 4. Parametres d'affichage
VERBOSE = True



# SECTION B : FLUX PRINCIPAL DE L ALGORITHME
# ==============================================================================

def run_optimization():
    """
    Flux complet de l algorithme hybride GA+SA :

    ETAPE 1 : Charger les donnees depuis l API 
    ETAPE 2 : Creer la population initiale aleatoire 
    ETAPE 3 : Boucle evolutive GA Generation par Generation
    ETAPE 4 : Critere d arret anticipe (Early Stopping quand Hard=0)
    ETAPE 5 : Exporter le meilleur emploi du temps en JSON
    """

    # ── ETAPE 1 : Chargement des donnees ──
    print("=" * 55)
    print(" SYSTEME DE GENERATION D EMPLOIS DU TEMPS — FSTG")
    print(" Algorithme Hybride GA + SA")
    print("=" * 55)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur : Impossible de charger les donnees.")
        return

    # ── ETAPE 2 : Statistiques et Initialisation Log ──
    from commun.reporting import print_generation_status, generate_final_report, initialize_log_file, HistoryLogger
    
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
    csv_logger = HistoryLogger()
    
    start_time_exec = time.time()
    engine = HybridEngine(
        dm, 
        pop_size=POP_SIZE, 
        constraints_mask=CONSTRAINTS_MASK,
        mutation_rate=MUTATION_RATE,
        elitism=ELITISM,
        sa_iterations=SA_ITERATIONS,
        sa_temp=SA_TEMP,
        sa_cooling=SA_COOLING
    )
    
    engine.create_initial_population()
    
    # Statistiques initiales
    # BUG 7 FIX: déballer h_violations et le stocker sur la schedule pour éviter AttributeError
    init_score, init_h, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    engine.population[0].h_violations = init_h
    engine.population[0].fitness = init_score
    
    if VERBOSE:
        print(f"\n[START] Lancement GA-SA Hybrid Solver")
        print(f"        Seances a placer: {db_stats['nb_module_parts']} | Score Initial: {init_score}")

    h_zero_since = 0
    stagnation_count = 0          # P11 : Compteur de stagnation
    last_best_score = init_score  # P11 : Référence pour détecter le plateau

    # ── ETAPE 3 : Boucle Evolutive GA ──
    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        
        # Executer une generation complete (tri + elitisme + crossover + mutation + SA)
        engine.evolve()
        
        gen_dur = time.time() - gen_start
        
        current_best_score = engine.population[0].fitness

        # P11 : Détection de stagnation et injection de diversité
        if current_best_score >= last_best_score:
            stagnation_count += 1
        else:
            stagnation_count = 0
            last_best_score = current_best_score

        if stagnation_count >= 5 and engine.population[0].h_violations > 0:
            if VERBOSE: print(f"\n[DIVERSITY] Stagnation détectée à Gen {gen} (score={current_best_score:.0f}). Injection de diversité...")
            engine.inject_diversity()
            stagnation_count = 0

        # Affichage du statut (Encapsule dans reporting.py)
        print_generation_status(gen, engine.population[0], gen_dur, init_score, 
                                CONSTRAINTS_MASK, verbose=VERBOSE)

        # Enregistrement CSV (PFE Analytics)
        csv_logger.log(gen, engine.population[0], gen_dur)

        # Critere d'Arret Anticipe (Si Hard=0 depusi N generations)
        if engine.population[0].h_violations == 0:
            if h_zero_since == 0:
                # PREMIÈRE fois qu'on atteint H=0 : on sauvegarde immédiatement !
                if VERBOSE: print(f"\n[SAVE] H=0 atteint à la Gen {gen} ! Sauvegarde intermédiaire...")
                export_schedule_to_json(engine.population[0])
            h_zero_since += 1
            if h_zero_since >= MAX_GEN_AFTER_H0:
                if VERBOSE: print(f"\n[STOP] Convergence de stabilite atteinte.")
                break
        else:
            h_zero_since = 0

    # ── ETAPE 4 : Rapport Final et Statistiques ──
    duration = time.time() - start_time_exec
    generate_final_report(engine, duration, init_score, CONSTRAINTS_MASK, actual_generations=gen, verbose=VERBOSE)

    # ── ETAPE 5 : Export JSON final pour l'interface ──
    export_schedule_to_json(engine.population[0])

def export_schedule_to_json(schedule):
    """Convertit l'emploi du temps en format JSON compatible avec le frontend."""
    output = []
    for a in schedule.assignments:
        output.append({
            "id": a.module_part.id, # ID de l'affectation
            "module_part_id": a.module_part.module_id, # ID réel de la partie de module (DB)
            "teacher_id": a.module_part.teacher_id,
            "room_id": a.room.id,
            "slot_id": a.timeslot.id,
            "section_id": a.module_part.section_id,
            "td_groups": [{"id": g_id} for g_id in a.module_part.td_group_ids]
        })
    
    # On remonte de 4 niveaux : main_solver.py -> v2 -> ga_sa_hybrid -> algorithms -> Racine/_Project_PFE
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    file_path = os.path.join(root_dir, "backend", "generated_timetable.json")
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4)
    
    if VERBOSE:
        print(f"\n[EXPORT] Solution sauvegardee dans : {os.path.basename(file_path)}")
    
    # ── ÉTAPE 6 : Archivage permanent en Base de Données ──
    # On délègue à une fonction séparée pour ne pas bloquer si l'API est éteinte
    save_result_to_db(schedule, output)

def save_result_to_db(schedule, formatted_data):
    """Envoie le résultat à l'API pour stockage permanent dans la table TimetableResult."""
    import requests
    try:
        url = "http://localhost:8000/timetable-results"
        
        # On recalcule h et soft pour être sûr d'avoir les dernières valeurs
        _, h, soft, _ = calculate_fitness_full(schedule, CONSTRAINTS_MASK)
        
        payload = {
            "created_at": datetime.now().isoformat(),
            "score_hard": int(h),
            "score_soft": float(soft),
            "data": formatted_data,
            "is_validated": False
        }
        
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 201:
            res_id = response.json().get('id')
            if VERBOSE:
                print(f"[DB] Succès : Résultat archivé dans l'historique (ID : {res_id})")
        else:
            if VERBOSE:
                print(f"[DB] Erreur lors de l'archivage : {response.status_code}")
    except Exception as e:
        if VERBOSE:
            print(f"[DB] Note : API indisponible pour l'archivage automatique ({e})")

if __name__ == "__main__":
    run_optimization()
