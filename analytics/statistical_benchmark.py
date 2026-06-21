import subprocess
import re
import statistics
import time
import os
import json

# ==============================================================================
# CONFIGURATION DU BENCHMARK STATISTIQUE
# ==============================================================================
CONFIG = {
    "runs_per_model": 5,
    "models": [
        {
            "name": "RL (Sans Curriculum)",
            "path": r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\algorithms\_ARCHIVE\6-RL-ALNS-NoCurriculum\main_fused.py",
            "cwd": r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\algorithms\_ARCHIVE\6-RL-ALNS-NoCurriculum"
        }
    ],
    "output_file": "no_curriculum_results.json"
}

def run_single_benchmark(model_name, script_path, cwd):
    print(f"\n[RUNNING] {model_name}...")
    start_time = time.time()
    
    try:
        # On lance le script et on récupère la sortie standard
        result = subprocess.run(
            ["python", script_path],
            capture_output=True,
            text=True,
            cwd=cwd,
            check=True
        )
        output = result.stdout
        duration = time.time() - start_time
        
        # Extraction du score final avec une regex robuste
        # On cherche "Score Final : XXX.X" ou "Score Final   (Best)     : XXX.X"
        match = re.search(r"Score Final.*?(\d+\.?\d*)", output, re.IGNORECASE | re.DOTALL)
        if not match:
            # Deuxième tentative si le format est différent
            match = re.search(r"S_Total\s*:\s*(\d+\.?\d*)", output)
            
        if match:
            score = float(match.group(1))
            print(f"  -> Success: Score = {score} | Time: {duration:.2f}s")
            return score, duration
        else:
            print(f"  [ERROR] Impossible d'extraire le score pour {model_name}")
            # print(output) # Debug
            return None, None
            
    except Exception as e:
        print(f"  [CRASH] {model_name} a échoué : {str(e)}")
        return None, None

def generate_latex_table(results):
    print("\n" + "="*60)
    print(" TABLEAU POUR LE RAPPORT PFE (LATEX)")
    print("="*60)
    
    header = "\\begin{table}[h]\n\\centering\n\\begin{tabular}{|l|" + "c|"*5 + "c|c|c|}\n\\hline"
    header += "\nAlgorithme & R1 & R2 & R3 & R4 & R5 & Moy. & $\\sigma$ & Best \\\\ \\hline"
    print(header)
    
    for model, data in results.items():
        scores = [s for s in data["scores"] if s is not None]
        if not scores: continue
        
        moy = statistics.mean(scores)
        std = statistics.stdev(scores) if len(scores) > 1 else 0
        best = min(scores)
        
        # On ne prend que les 5 premiers runs pour l'affichage tableau (mais calculé sur 10)
        row = f"{model} "
        for i in range(5):
            val = f"{scores[i]:.0f}" if i < len(scores) else "-"
            row += f"& {val} "
        
        row += f"& {moy:.1f} & {std:.1f} & {best:.0f} \\\\ \\hline"
        print(row)
        
    print("\\end{tabular}\n\\caption{Comparaison statistique des performances (10 runs)}\n\\end{table}")

def main():
    final_results = {}
    
    print("="*60)
    print(" DÉMARRAGE DU BENCHMARK GLOBAL PFE (10 RUNS / MODÈLE)")
    print("="*60)
    
    for model in CONFIG["models"]:
        m_name = model["name"]
        final_results[m_name] = {"scores": [], "times": []}
        
        for i in range(CONFIG["runs_per_model"]):
            print(f"[{m_name}] Progress: {i+1}/{CONFIG['runs_per_model']}")
            score, duration = run_single_benchmark(m_name, model["path"], model["cwd"])
            final_results[m_name]["scores"].append(score)
            final_results[m_name]["times"].append(duration)
            
            # Sauvegarde intermédiaire
            with open(CONFIG["output_file"], "w") as f:
                json.dump(final_results, f, indent=4)

    generate_latex_table(final_results)

if __name__ == "__main__":
    main()