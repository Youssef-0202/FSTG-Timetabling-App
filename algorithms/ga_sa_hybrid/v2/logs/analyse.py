import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# --- ARCHITECTURE DES LOGS ---
# Ce script est situé dans le dossier 'logs/'
# Il analyse 'evolution_history.csv' situé dans le même dossier.

CSV_FILE = "evolution_history.csv"
OUTPUT_DIR = "plots"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def generate_plots():
    if not os.path.exists(CSV_FILE):
        print(f"Erreur : '{CSV_FILE}' introuvable dans le dossier logs.")
        return

    print(f"Analyse de {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE)
    sns.set_theme(style="darkgrid")

    # 1. COURBE DE CONVERGENCE (H vs S)
    fig, ax1 = plt.subplots(figsize=(12, 6))
    
    ax1.set_xlabel('Générations')
    ax1.set_ylabel('Score Hard (Log)', color='tab:red')
    ax1.plot(df['gen'], df['h_total'], color='tab:red', linewidth=2, label='Hard Violations')
    ax1.set_yscale('log')

    ax2 = ax1.twinx()
    ax2.set_ylabel('Score Soft (Qualité)', color='tab:blue')
    ax2.plot(df['gen'], df['s_total'], color='tab:blue', linewidth=2, label='Soft Score')

    plt.title('Convergence du Solveur Hybride (PFE Master IAII)')
    fig.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/01_convergence.png", dpi=300)

    # 2. DISTRIBUTION DES PÉNALITÉS SOFT
    soft_keys = [k for k in df.columns if k.startswith('S') and k != 's_total']
    if soft_keys:
        plt.figure(figsize=(10, 6))
        last_values = df.iloc[-1][soft_keys]
        last_values.plot(kind='barh', color='skyblue')
        plt.title('Profil de Qualité Final (Soft Constraints)')
        plt.xlabel('Pénalité')
        plt.tight_layout()
        plt.savefig(f"{OUTPUT_DIR}/02_soft_profile.png", dpi=300)

    # 3. RÉSOLUTION DES CONFLITS HARD
    hard_keys = [k for k in df.columns if k.startswith('H') and k != 'h_total']
    plt.figure(figsize=(12, 6))
    for k in hard_keys:
        if df[k].sum() > 0:
            plt.plot(df['gen'], df[k], label=k)
    plt.title('Résolution progressive des contraintes Hard')
    plt.legend()
    plt.savefig(f"{OUTPUT_DIR}/03_hard_resolution.png", dpi=300)

    print(f"Succès ! {len(os.listdir(OUTPUT_DIR))} graphes générés dans '{OUTPUT_DIR}/'")

if __name__ == "__main__":
    generate_plots()
