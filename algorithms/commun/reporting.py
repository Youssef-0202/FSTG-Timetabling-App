
import time
import statistics
import os
import sys

def get_log_path():
    """Détermine le chemin du fichier de log dans un dossier 'logs' dédié."""
    try:
        main_dir = os.path.dirname(os.path.abspath(sys.modules['__main__'].__file__))
        log_dir = os.path.join(main_dir, "logs")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        return os.path.join(log_dir, "last_run_report.txt")
    except:
        return os.path.join(os.getcwd(), "last_run_report.txt")

def initialize_log_file(params, db_stats):
    """Cree l'en-tete du fichier de log avec les parametres et stats DB."""
    log_path = get_log_path()

    header = [
        "=" * 60,
        " RAPPORT D'EXECUTION - GENERATION D'EMPLOIS DU TEMPS",
        f" Date : {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "=" * 60,
        "\n1. PARAMETRES DE L'ALGORITHME :",
        f" - Population Size      : {params['POP_SIZE']}",
        f" - Max Generations      : {params['MAX_GEN']}",
        f" - Mutation Rate        : {params['MUTATION_RATE']}",
        f" - SA Iterations        : {params['SA_ITERATIONS']}",
        f" - SA Temp Initial      : {params['SA_TEMP']}",
        "\n2. STATISTIQUES DE LA BASE DE DONNEES :",
        f" - Nombre d'Enseignants : {db_stats['nb_teachers']}",
        f" - Nombre de Salles     : {db_stats['nb_rooms']}",
        f" - Nombre de Sections   : {db_stats['nb_sections']}",
        f" - Seances a placer     : {db_stats['nb_module_parts']}",
        f" - Creneaux disponibles : {db_stats['nb_slots']}",
        "\n" + "=" * 60,
        " SUIVI DES GENERATIONS :",
        "=" * 60 + "\n"
    ]
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(header))

def print_generation_status(gen, individual, gen_duration, init_score, mask, verbose=True):
    """Affiche le statut d'une generation."""
    if not verbose:
        return

    from .constraints import calculate_fitness_full
    score, h, s, details = calculate_fitness_full(individual, mask)
    
    # Amelioration par rapport au debut
    improvement = ((init_score - score) / max(1, init_score)) * 100
    
    line = f" Gen {gen:03d} | Score: {score:8.0f} | H: {h} | S: {s:5.0f} | Imp: {improvement:>5.1f}% | Time: {gen_duration:4.2f}s"
    
    if h > 0:
        h_details = " → Hard: " + ", ".join([f"{k}:{v}" for k,v in details.items() if k.startswith('H') and v > 0])
        print(line + h_details)
    else:
        s_details = " → Soft: " + ", ".join([f"{k}:{v}" for k,v in details.items() if k.startswith('S') and v > 0])
        print(line + s_details)

def generate_final_report(engine, total_duration, init_score, mask, actual_generations=0, verbose=True):
    """Cree et affiche le rapport final, et le sauvegarde dans un fichier."""
    from .constraints import calculate_fitness_full
    
    best_overall = engine.population[0]
    final_fitnesses = [p.fitness for p in engine.population]
    avg_pop = statistics.mean(final_fitnesses)
    std_pop = statistics.stdev(final_fitnesses) if len(final_fitnesses) > 1 else 0
    worst_pop = max(final_fitnesses)
    
    final_score, final_h, final_s, final_details = calculate_fitness_full(best_overall, mask)
    
    report_lines = [
        "\n" + "=" * 60,
        " ANALYSE FINALE DES PERFORMANCES ",
        "=" * 60,
        f" Temps total d'execution  : {total_duration:.2f} secondes",
        f" Generations effectuees   : {actual_generations}", 
        "-" * 60,
        f" Score Initial (Best)     : {init_score}",
        f" Score Final   (Best)     : {final_score}",
        f" Amelioration Totale      : {((init_score - final_score)/max(1,init_score))*100:.1f} %",
        "-" * 60,
        " STATISTIQUES DE LA DERNIERE POPULATION :",
        f"  - Meilleure Solution    : {final_score}",
        f"  - Pire Solution         : {worst_pop}",
        f"  - Moyenne Population    : {avg_pop:.1f}",
        f"  - Ecart-type (Std Dev)  : {std_pop:.1f}",
        "-" * 60,
        " DETAIL DES CONFLITS (MEILLEUR INDIVIDU) :",
    ]
    
    for k, v in final_details.items():
        if v > 0 or k.startswith('S'): # On affiche tout le detail final
            report_lines.append(f"  - {k:20} : {v}")
    
    report_lines.append("=" * 60)
    summary_text = "\n".join(report_lines)
    
    if verbose:
        print(summary_text)

    # Sauvegarde automatique (Ajout a la fin du fichier existant)
    log_path = get_log_path()
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(summary_text)
    except:
        pass
    
    return summary_text


class HistoryLogger:
    """Enregistre l'historique complet (H1, H2, S1, S2...) dans un fichier CSV."""
    def __init__(self, filename="evolution_history.csv"):
        try:
            main_dir = os.path.dirname(os.path.abspath(sys.modules['__main__'].__file__))
            log_dir = os.path.join(main_dir, "logs")
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)
            self.filepath = os.path.join(log_dir, filename)
        except:
            self.filepath = os.path.join(os.getcwd(), filename)
        
        self.headers_written = False

    def log(self, gen, individual, gen_duration, diversity=0):
        import csv
        from .constraints import calculate_fitness_full
        
        # On recalcule les détails complets (pas de masque pour avoir tout)
        score, h, s, details = calculate_fitness_full(individual, None)
        
        row = {
            "gen": gen,
            "score": score,
            "h_total": h,
            "s_total": s,
            "time": gen_duration,
            "diversity": diversity
        }
        # Ajout de tous les détails (H1, H2, S1, S2...)
        row.update(details)

        mode = 'a' if self.headers_written else 'w'
        try:
            with open(self.filepath, mode, newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=row.keys())
                if not self.headers_written:
                    writer.writeheader()
                    self.headers_written = True
                writer.writerow(row)
        except:
            pass
