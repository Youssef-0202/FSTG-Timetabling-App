
import time
import statistics
import os

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
        print(line + " [POLISSAGE]")

def generate_final_report(engine, total_duration, init_score, mask, verbose=True):
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
        f" Generations effectuees   : {len(final_fitnesses)} (population size)", # Note: actual gen count passed externally is better
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

    # Sauvegarde automatique
    log_path = os.path.join(os.getcwd(), "last_run_report.txt")
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(summary_text)
    except:
        pass
    
    return summary_text
