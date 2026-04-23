# ==============================================================================
# main_solver.py — Chef d Orchestre de l algorithme GA+SA
# 
# Role        : Orchestre l execution complete de l algorithme de bout en bout.
#               Il decide QUAND lancer, COMBIEN de generations faire,
#               QUAND s arreter, et sauvegarde le resultat final.
# Dependances : DataManager | HybridEngine | calculate_fitness_full
# Execution   : python main_solver.py  
# ==============================================================================

import sys
import os
import json
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.data_manager import DataManager, API_BASE_URL
from commun.constraints import calculate_fitness_full
from engine import HybridEngine



# SECTION A : PARAMETRES GLOBAUX DE CONFIGURATION
# ==============================================================================

# ── Parametres de la boucle evolutive (GA) ──
POP_SIZE         = 100   # Nombre d individus (chromosomes) par generation
MAX_GEN          = 180   # Limite maximale de generations a executer
MAX_GEN_AFTER_H0 = 30    # Generations supplementaires apres Hard=0 

MUTATION_RATE    = 0.15  # Probabilite de mutation (exploration)
ELITISM          = 2     # Nombre d elites a conserver (stabilite)

# ── Parametres du Recuit Simule Local (SA - Polissage) ──
SA_ITERATIONS    = 400   # Budget d iterations SA par enfant (L_max)
SA_TEMP          = 50.0  # Temperature de depart (T0)
SA_COOLING       = 0.95  # Taux de refroidissement (Alpha)

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
        print("[ERREUR] Impossible de charger les donnees. Verifiez le backend.")
        return

    # ── ETAPE 2 : Initialisation du Moteur ──
    import time
    import statistics
    
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
    
    # Statistiques initiales pour calcul d'amelioration
    init_score, _, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    
    print(f"\n Population initiale creee : {POP_SIZE} individus")
    print(f" Score Initial (Best) : {init_score} | Soft: {init_soft}")
    print(f" Lancement de la boucle evolutive...\n")

    # Variables de controle de la boucle
    best_overall    = None   
    h_zero_since    = 0      
    history_report  = []

    # ── ETAPE 3 : Boucle Evolutive GA ──
    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        engine.evolve()
        gen_duration = time.time() - gen_start
        
        best_gen = engine.population[0]
        score, h, s, details = calculate_fitness_full(best_gen, CONSTRAINTS_MASK)
        
        # Calcul de l'amelioration par rapport au TOUT DEBUT
        improvement = ((init_score - score) / max(1, init_score)) * 100
        
        # --- Affichage Intelligent ---
        line = f" Gen {gen:03d} | Score: {score:8.0f} | H: {h} | S: {s:5.0f} | Imp: {improvement:>5.1f}% | Time: {gen_duration:4.2f}s"
        
        # Detail si conflits presents
        if h > 0:
            h_details = f" → Hard: " + ", ".join([f"{k}:{v}" for k,v in details.items() if k.startswith('H') and v > 0])
            print(line + h_details)
        else:
            print(line + " [POLISSAGE]")

        best_overall = best_gen
        history_report.append(score)

        # ── ETAPE 4 : Critere d Arret Anticipe  ──
        if h == 0:
            h_zero_since += 1
            if h_zero_since >= MAX_GEN_AFTER_H0:
                print(f"\n [STOP] Stabilite atteinte (H=0 depuis {MAX_GEN_AFTER_H0} gen).")
                break

    # ── ETAPE 5 : Rapport de Synthese Final ──
    duration = time.time() - start_time_exec
    
    # Stats de la population finale
    final_fitnesses = [p.fitness for p in engine.population]
    avg_pop = statistics.mean(final_fitnesses)
    std_pop = statistics.stdev(final_fitnesses) if len(final_fitnesses) > 1 else 0
    worst_pop = max(final_fitnesses)
    
    report_lines = [
        "\n" + "=" * 60,
        " ANALYSE FINALE DES PERFORMANCES ",
        "=" * 60,
        f" Temps total d'execution  : {duration:.2f} secondes",
        f" Vitesse moyenne          : {duration/gen:.2f} sec/gen",
        "-" * 60,
        f" Score Initial (Best)     : {init_score}",
        f" Score Final   (Best)     : {engine.population[0].fitness}",
        f" Amelioration Totale      : {((init_score - engine.population[0].fitness)/max(1,init_score))*100:.1f} %",
        "-" * 60,
        " STATISTIQUES DE LA DERNIERE POPULATION :",
        f"  - Meilleure Solution    : {engine.population[0].fitness}",
        f"  - Pire Solution         : {worst_pop}",
        f"  - Moyenne Population    : {avg_pop:.1f}",
        f"  - Ecart-type (Std Dev)  : {std_pop:.1f}",
        "-" * 60,
        " DETAIL DES CONFLITS (MEILLEUR INDIVIDU) :",
    ]
    
    final_score, final_h, final_s, final_details = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    for k, v in final_details.items():
        if v > 0: report_lines.append(f"  - {k:20} : {v}")
    
    report_lines.append("=" * 60)
    
    summary_text = "\n".join(report_lines)
    print(summary_text)

    # Sauvegarde
    with open(os.path.join(os.path.dirname(__file__), "last_run_report.txt"), "w", encoding="utf-8") as f:
        f.write(summary_text)

    # ── ETAPE 6 : Export JSON pour UI ──
    export_schedule_to_json(best_overall)


# 
# SECTION C : EXPORT DU RESULTAT EN JSON
# ==============================================================================

def export_schedule_to_json(schedule, filename="../../backend/generated_timetable.json"):
    """
    Exporte le meilleur emploi du temps en JSON pour l interface web.

    Le fichier JSON est lu directement par le frontend Next.js pour l affichage.
    Il est sauvegarde dans backend/generated_timetable.json 

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



# POINT D ENTREE
# ==============================================================================

if __name__ == "__main__":
    run_optimization()
