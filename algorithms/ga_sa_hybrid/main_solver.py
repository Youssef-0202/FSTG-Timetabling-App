
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
from datetime import datetime

# Ajouter le chemin racine pour permettre les imports de 'commun'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from commun.data_manager import DataManager
from commun.models import Schedule
from commun.constraints import calculate_fitness_full
from .engine import HybridEngine


# CONFIGURATION ET PARAMÈTRES 
# ==============================================================================

# 1. Parametres de l'Algorithme Genetique (GA)
POP_SIZE = 100
MAX_GEN = 150
MUTATION_RATE = 0.15
ELITISM = 2
MAX_GEN_AFTER_H0 = 30 # Nombre de gens a faire apres avoir atteint 0 conflit

# 2. Parametres du Recuit Simule (SA) - Recherche Locale
SA_ITERATIONS = 400
SA_TEMP = 50.0
SA_COOLING = 0.95

# 3. Masque des Contraintes (Activer/Desactiver des regles)
CONSTRAINTS_MASK = {
    # Contraintes Dures (Hard) — a respecter absolument
    "H1": True,   # Pas deux cours au meme creneau pour le meme prof
    "H2": True,   # Pas deux cours au meme creneau dans la meme salle
    "H3": True,   # Pas deux cours au meme creneau pour le meme groupe
    "H4": True,   # La capacite de la salle >= effectif du groupe
    "H9": True,   # Respecter les indisponibilites des enseignants

    # Contraintes Souples (Soft) — a optimiser
    "S_MIXING":        True,   # Eviter le melange de modules dans une demi-journee
    "S_CM_DISPERSION": True,   # Eviter les CM disperses matin + apres-midi
    "S_GAPS":          True,   # Reduire les trous entre les cours
    "S_BALANCE":       True,   # Equilibrer la charge horaire quotidienne
    "S_STABILITY":     True,   # Un module reste dans la meme salle d une semaine a l autre
    "S_EMPTY_DAYS":    True,   # Eviter les journees a une seule seance (trop courtes)
    "S_PREFERENCES":   True,   # Eviter les creneaux sensibles (Samedi, fin de journee)
    "S_FREE_AFTERNOONS": True, # Favoriser au moins 2 apres-midis vides par semaine
}



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
    from commun.reporting import print_generation_status, generate_final_report, initialize_log_file
    
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
    init_score, _, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    
    if VERBOSE:
        print(f"\n[START] Lancement GA-SA Hybrid Solver")
        print(f"        Seances a placer: {db_stats['nb_module_parts']} | Score Initial: {init_score}")

    h_zero_since = 0

    # ── ETAPE 3 : Boucle Evolutive GA ──
    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        
        # Executer une generation complete (tri + elitisme + crossover + mutation + SA)
        engine.evolve()
        
        gen_dur = time.time() - gen_start
        
        # Affichage du statut (Encapsule dans reporting.py)
        print_generation_status(gen, engine.population[0], gen_dur, init_score, 
                                CONSTRAINTS_MASK, verbose=VERBOSE)

        # Critere d'Arret Anticipe (Si Hard=0 depusi N generations)
        if engine.population[0].h_violations == 0:
            h_zero_since += 1
            if h_zero_since >= MAX_GEN_AFTER_H0:
                if VERBOSE: print(f"\n[STOP] Convergence de stabilite atteinte.")
                break
        else:
            h_zero_since = 0

    # ── ETAPE 4 : Rapport Final et Statistiques ──
    duration = time.time() - start_time_exec
    generate_final_report(engine, duration, init_score, CONSTRAINTS_MASK, verbose=VERBOSE)

    # ── ETAPE 5 : Export JSON final pour l'interface ──
    export_schedule_to_json(engine.population[0])

def export_schedule_to_json(schedule):
    """Convertit l'emploi du temps en format JSON compatible avec le frontend."""
    output = []
    for a in schedule.assignments:
        output.append({
            "id": a.module_part.id,
            "module_part_id": a.module_part.id,
            "teacher_id": a.module_part.teacher_id,
            "room_id": a.room.id,
            "slot_id": a.timeslot.id,
            "section_id": a.module_part.section_id,
            "td_groups": [{"id": g.id, "name": g.name} for g in a.module_part.td_groups]
        })
    
    file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                             "backend", "generated_timetable.json")
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4)
    
    if VERBOSE:
        print(f"\n[EXPORT] Solution sauvegardee dans : {os.path.basename(file_path)}")

if __name__ == "__main__":
    run_optimization()
