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
# Ajouter le chemin racine 
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from commun.data_manager import DataManager
from commun.models import Schedule
from commun.constraints import calculate_fitness_full
from engine import HybridEngine


# CONFIGURATION ET PARAMÈTRES 
# ==============================================================================

# 1. Parametres de l'Algorithme Genetique (GA) selon Grid Search
POP_SIZE = 30          
MAX_GEN = 120          # Limité à 120 pour comparaison avec RL
MUTATION_RATE = 0.40   # Record de performance en GS
ELITISM = 2
MAX_GEN_AFTER_H0 = 50

# 2. Parametres du Recuit Simule (SA) - Recherche Locale
SA_ITERATIONS = 1200   # Force maximale pour polissage Soft 
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
    Flux d'optimisation mémétique V2.1 :
    
    1. INIT : Synchronisation des données (API REST) et initialisation des logs (CSV Analytics).
    2. SEEDING : Création d'une population initiale par recherche gloutonne (Greedy) pour limiter H au départ.
    3. MÉMÉTIQUE : Boucle d'évolution combinant :
       - Sélection par tournoi et Croisement modulaire.
       - Mutation guidée par les conflits.
       - Raffinement par Recuit Simulé (SA) local pour chaque individu.
    4. STABILITÉ : Surveillance de la convergence pour un arrêt anticipé (Early Stopping).
    5. ARCHIVAGE : Exportation JSON, génération du rapport et synchronisation SQL (Archive DB).
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
    init_score, init_h, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    engine.population[0].h_violations = init_h
    engine.population[0].fitness = init_score
    
    if VERBOSE:
        print(f"\n[START] Lancement GA-SA Hybrid Solver")
        print(f"        Seances a placer: {db_stats['nb_module_parts']} | Score Initial: {init_score}")
        print(f"        Initial H-Violations: {init_h} | Soft Score: {init_soft}")
    
    # ── ETAPE 3 : Evolution Memetique ──
    PATIENCE = 20  # Même condition que RL : arrêt si pas d'amélioration pendant 20 gens
    no_improve_count = 0
    best_score_ever = float('inf')

    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        
        # Executer une generation complete (tri + elitisme + crossover + mutation + SA)
        sa_impact, diversity = engine.evolve()
        
        gen_dur = time.time() - gen_start
        
        best = engine.population[0]
        current_score = best.fitness if best.fitness is not None else float('inf')
        
        # Affichage status console
        if VERBOSE:
            # Correction : on passe init_score et le masque de contraintes
            print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
            
        # Enregistrement CSV
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK, diversity=diversity, sa_impact=sa_impact)
        
        # Critere d'Arret Anticipe (même logique que RL — score-based, PATIENCE=20)
        if current_score < best_score_ever - 0.5:
            best_score_ever = current_score
            no_improve_count = 0
        else:
            no_improve_count += 1
            if no_improve_count >= PATIENCE:
                print(f"\n[STOP ANTICIPÉ] Pas d'amélioration depuis {PATIENCE} générations. Convergence atteinte à Gen {gen}.")
                break
        
    # ── ETAPE 4 : Finalisation et Archivage ──
    total_duration = time.time() - start_time_exec
    best_final = engine.population[0]
    
    # 1. Mise a jour SQL (Archive)
    best_final.sync_to_db()
    
    # 2. Rapport Final
    # Correction : Respect de l'ordre (engine, duration, init_score, mask, gens)
    generate_final_report(engine, total_duration, init_score, CONSTRAINTS_MASK, actual_generations=gen)
    
    # 3. Exportation et Archivage en Base de Données
    try:
        import requests
        
        # Préparation des données pour l'archivage en DB
        _, h_final, s_final, _ = calculate_fitness_full(best_final, CONSTRAINTS_MASK)
        
        result_payload = {
            "algo_type": "ga_sa",
            "created_at": datetime.now().isoformat(),
            "score_hard": int(h_final),
            "score_soft": float(s_final),
            "data": best_final.to_dict(),
            "is_validated": False
        }
        
        # Envoi au backend pour stockage centralisé
        API_URL = "http://localhost:8000/timetable-results"
        response = requests.post(API_URL, json=result_payload)
        
        if response.status_code == 201:
            print(f"[DB-ARCHIVE] Résultat GA-SA sauvegardé avec succès en base de données.")
        else:
            print(f"[WARN] Échec de l'archivage en DB ({response.status_code}): {response.text}")

        # On garde quand même l'export JSON local pour compatibilité
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        export_path = os.path.join(root_dir, "backend", "generated_timetable.json")
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
            
    except Exception as e:
        print(f"[ERREUR] Archivage/Export échoué : {e}")

if __name__ == "__main__":
    run_optimization()
