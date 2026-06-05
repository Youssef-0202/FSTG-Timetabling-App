import os
import sys
import subprocess

# Ce script est un "pont" (proxy) pour rediriger l'ancien appel vers le nouveau moteur fusionné
if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Chemin vers le nouveau moteur robuste
    new_script = os.path.join(base_dir, "5-RL-ALNS-Curriculum", "main_fused.py")
    
    print(f"[PROXY] Redirection vers le moteur fusionné : {new_script}")
    
    # On lance le nouveau script avec le même interpréteur Python
    try:
        # On change le dossier de travail pour que le script trouve ses imports
        os.chdir(os.path.dirname(new_script))
        subprocess.run([sys.executable, "main_fused.py"])
    except Exception as e:
        print(f"[REDIRECTION ERROR] {e}")
        input("Appuyez sur Entrée pour fermer...")
