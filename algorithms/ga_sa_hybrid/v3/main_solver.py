
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
POP_SIZE = 60
MAX_GEN = 150
MUTATION_RATE = 0.2
ELITISM = 2
MAX_GEN_AFTER_H0 = 50 # On pousse le polissage encore un peu plus loin

# 2. Parametres du Recuit Simule (SA) - Recherche Locale
SA_ITERATIONS = 1200
SA_TEMP = 50.0
SA_COOLING = 0.90

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
    
    # --- PHASE 1 : SQUELETTE (PLACEMENT DES CM) ---
    print("\n>>> PHASE 1 : Placement des Cours Magistraux (CM)...")
    all_mps = list(dm.module_parts)
    # On ne garde que les CM pour la phase 1
    dm.module_parts = [mp for mp in all_mps if mp.type == "CM"]
    
    engine_cm = HybridEngine(dm, pop_size=30, sa_iterations=600, constraints_mask=CONSTRAINTS_MASK)
    engine_cm.create_initial_population()
    
    best_cm = None
    for gen in range(1, 41): 
        best_cm = engine_cm.evolve()
        print(f" Phase 1 - Gen {gen:02d} | H: {best_cm.h_violations}")
        if best_cm.h_violations == 0:
            print(f" [SUCCÈS] Squelette CM terminé à Gen {gen} avec 0 conflit !")
            break
    
    # --- PHASE 2 : REMPLISSAGE (PLACEMENT DES TD) ---
    print("\n>>> PHASE 2 : Placement des Travaux Dirigés (TD)...")
    # On fige les CM trouvés en Phase 1
    for a in best_cm.assignments:
        a.module_part.is_locked = True
        a.module_part.fixed_room_id = a.room.id
        a.module_part.fixed_slot_id = a.timeslot.id
    
    # On remet tout le monde pour la Phase 2
    dm.module_parts = all_mps
    engine_td = HybridEngine(dm, pop_size=POP_SIZE, sa_iterations=SA_ITERATIONS, constraints_mask=CONSTRAINTS_MASK)
    engine_td.create_initial_population()
    
    best_final = None
    start_time_exec = time.time()
    for gen in range(1, MAX_GEN + 1):
        best_final = engine_td.evolve()
        print(f" Phase 2 - Gen {gen:03d} | H: {best_final.h_violations} | S: {best_final.soft_score}")
        if best_final.h_violations == 0:
             print(f" [SUCCÈS] Emploi du temps complet terminé à Gen {gen} !")
             break
             
    # Étape finale : Exportation
    try:
        output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", "generated_timetable.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(best_final.to_dict(), f, indent=4, ensure_ascii=False)
        print(f"\n[EXPORT] Solution V3 sauvegardée : {output_path}")
    except Exception as e:
        print(f"Erreur exportation: {e}")

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

if __name__ == "__main__":
    run_optimization()
