# ==============================================================================
# main_solver.py — Chef d Orchestre de l algorithme GA+SA
# ==============================================================================
# Role        : Orchestre l execution complete de l algorithme de bout en bout.
#               Il decide QUAND lancer, COMBIEN de generations faire,
#               QUAND s arreter, et sauvegarde le resultat final.
# Dependances : DataManager | HybridEngine | calculate_fitness_full
# Execution   : python main_solver.py  (depuis le dossier ga_sa_hybrid/)
# ==============================================================================

import sys
import os
import json
import requests

# ── Ajout du dossier parent (algorithms/) au path pour les imports ──
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from data_manager import DataManager, API_BASE_URL
from constraints import calculate_fitness_full
from engine import HybridEngine


# ==============================================================================
# SECTION A : PARAMETRES GLOBAUX DE CONFIGURATION
# ==============================================================================

# ── Parametres de la boucle evolutive (GA) ──
POP_SIZE         = 100   # Nombre d individus (chromosomes) par generation
MAX_GEN          = 180   # Limite maximale de generations a executer
MAX_GEN_AFTER_H0 = 30    # Generations supplementaires apres Hard=0 (polissage Soft)

# ── Masque des contraintes (True = active, False = desactivee) ──
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
}


# ==============================================================================
# SECTION B : FLUX PRINCIPAL DE L ALGORITHME
# ==============================================================================

def run_optimization():
    """
    Flux complet de l algorithme hybride GA+SA :

    ETAPE 1 : Charger les donnees depuis l API (DataManager)
    ETAPE 2 : Creer la population initiale aleatoire (HybridEngine)
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
        print("[ERREUR] Impossible de charger les donnees. Verifiez le backend.")
        return

    # ── ETAPE 2 : Creation de la population initiale aleatoire ──
    engine = HybridEngine(dm, pop_size=POP_SIZE, constraints_mask=CONSTRAINTS_MASK)
    engine.create_initial_population()
    print(f"\n Population initiale creee : {POP_SIZE} individus aleatoires")
    print(f" Lancement de la boucle evolutive (max {MAX_GEN} generations)...\n")

    # Variables de controle de la boucle
    best_overall    = None   # Coffre-fort : meilleure solution jamais trouvee
    h_zero_since    = 0      # Compteur : generations consecutives avec Hard=0

    # ── ETAPE 3 : Boucle Evolutive GA ──
    for gen in range(1, MAX_GEN + 1):

        # Executer une generation complete (tri + elitisme + crossover + mutation + SA)
        engine.evolve()

        # Recuperer le meilleur individu de la generation (index [0] apres tri)
        best_gen = engine.population[0]

        # Evaluer le meilleur individu de cette generation
        h, s, details = calculate_fitness_full(best_gen, CONSTRAINTS_MASK)

        print(f"  Generation {gen:03d} | Hard: {h:3d} | Soft: {s:6.0f}")

        # Mettre a jour le coffre-fort si c est la meilleure solution globale
        best_overall = best_gen

        # ── ETAPE 4 : Critere d Arret Anticipe (Early Stopping) ──
        if h == 0:
            h_zero_since += 1
            print(f"           → Hard=0 depuis {h_zero_since} generations...")
            if h_zero_since >= MAX_GEN_AFTER_H0:
                print(f"\n [STOP] Critere d arret atteint : Hard=0 pendant {MAX_GEN_AFTER_H0} generations.")
                break

    # ── ETAPE 5 : Export du resultat final ──
    print("\n" + "=" * 55)
    export_schedule_to_json(best_overall)


# ==============================================================================
# SECTION C : EXPORT DU RESULTAT EN JSON
# ==============================================================================

def export_schedule_to_json(schedule, filename="../../backend/generated_timetable.json"):
    """
    Exporte le meilleur emploi du temps en JSON pour l interface web.

    Le fichier JSON est lu directement par le frontend Next.js pour l affichage.
    Il est sauvegarde dans backend/generated_timetable.json (sans toucher a la BDD).

    Format de chaque entree : compatible avec le format de l API /assignments
    """
    if schedule is None:
        print("[ERREUR] Aucune solution a exporter.")
        return

    print(f" Exportation de {len(schedule.assignments)} affectations...")

    # Recuperer les donnees actuelles de la BDD pour enrichir l export (td_groups, etc.)
    try:
        current_db = requests.get(f"{API_BASE_URL}/assignments").json()
        db_map = {a['id']: a for a in current_db}
    except Exception as e:
        print(f" [ERREUR] Connexion backend impossible : {e}")
        return

    export_data = []
    for a in schedule.assignments:
        assignment_id = a.module_part.id
        orig = db_map.get(assignment_id, {})

        # Construire l entree JSON au format attendu par le frontend
        export_item = {
            "id":             assignment_id,
            "module_part_id": orig.get("module_part_id", getattr(a.module_part, 'module_id', 0)),
            "teacher_id":     orig.get("teacher_id",     getattr(a.module_part, 'teacher_id', 0)),
            "section_id":     orig.get("section_id"),
            "room_id":        a.room.id,
            "slot_id":        a.timeslot.id,
            "is_locked":      orig.get("is_locked", False),
            "td_groups":      orig.get("td_groups", []),
            "module_part":    orig.get("module_part", {}),
            "teacher":        orig.get("teacher", {}),
            "room":           {"id": a.room.id,      "name": a.room.name},
            "timeslot":       {
                "id":         a.timeslot.id,
                "day":        a.timeslot.day,
                "start_time": a.timeslot.start_time,
                "end_time":   a.timeslot.end_time
            },
        }
        export_data.append(export_item)

    # Sauvegarder le fichier JSON
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=4, ensure_ascii=False)

    print(f" Sauvegarde reussie : {filepath}")
    print(" Consultez localhost:3000/timetable/preview pour voir le resultat.\n")


# ==============================================================================
# POINT D ENTREE
# ==============================================================================

if __name__ == "__main__":
    run_optimization()
