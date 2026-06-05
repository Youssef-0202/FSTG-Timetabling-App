import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
import glob

# --- CONFIGURATION ---
NAMES = {
    "s_total": "Pénalités Soft (Total)",
    "S3_Gaps": "Trous (S3)",
    "S4_Lunch": "Pause Déjeuner (S4)",
    "S6_Stab": "Instabilité Salles (S6)",
    "S8_FreeApm": "Liberté AM (S8)",
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, "evolution_history.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "plots")

def cleanup_old_plots():
    if not os.path.exists(OUTPUT_DIR): return
    for f in glob.glob(os.path.join(OUTPUT_DIR, "*.png")):
        try: os.remove(f)
        except: pass

def save_individual_plot(name, fig_func, df):
    plt.figure(figsize=(10, 6))
    fig_func(plt.gca(), df)
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.png"), dpi=150, bbox_inches='tight')
    plt.close()

# --- FONCTIONS DE DESSIN ---
def draw_convergence(ax, df):
    ax.set_title("Analyse de la Convergence (Faisabilité vs Qualité)", fontsize=12, fontweight='bold')
    ax.plot(df['gen'], df['h_total'], label='Violations Hard', color='red', linewidth=2)
    ax.set_ylabel("Hard", color='red')
    ax2 = ax.twinx()
    ax2.plot(df['gen'], df['s_total'], label='Score Soft', color='blue', linestyle='--')
    ax2.set_ylabel("Soft", color='blue')
    ax.legend(loc='lower left', fontsize=9)

def draw_diversity(ax, df):
    ax.set_title("Exploration de l'Espace (Diversité Génétique)", fontsize=12, fontweight='bold')
    if 'diversity' in df.columns:
        ax.plot(df['gen'], df['diversity'], color='purple', linewidth=2)
    ax.set_ylabel("Hamming Distance (%)")

def draw_sa_impact(ax, df):
    ax.set_title("Impact de la Recherche Locale (Gain Mémétique)", fontsize=12, fontweight='bold')
    if 'sa_impact' in df.columns:
        ax.plot(df['gen'], df['sa_impact'], color='orange', alpha=0.7)
        ax.fill_between(df['gen'], 0, df['sa_impact'], color='orange', alpha=0.2)
    ax.set_ylabel("Gain de Fitness")

def draw_soft_profile(ax, df):
    ax.set_title("Répartition Finale des Pénalités (Profil de Qualité)", fontsize=12, fontweight='bold')
    last_gen = df.iloc[-1]
    soft_cols = [c for c in df.columns if c.startswith('S') and c != 's_total' and last_gen[c] > 0]
    labels = [NAMES.get(k, k) for k in soft_cols]
    values = [last_gen[k] for k in soft_cols]
    if values:
        ax.barh(labels, values, color=sns.color_palette("viridis", len(values)))

def draw_soft_evolution(ax, df):
    ax.set_title("Dynamique d'Optimisation des Règles Pédagogiques", fontsize=12, fontweight='bold')
    soft_cols = [c for c in df.columns if c.startswith('S') and c != 's_total' and df[c].max() > 0]
    for col in soft_cols:
        ax.plot(df['gen'], df[col], label=NAMES.get(col, col), alpha=0.7)
    ax.legend(fontsize=8, loc='upper right')

def draw_time_stability(ax, df):
    ax.set_title("Performance et Stabilité Temporelle du CPU", fontsize=12, fontweight='bold')
    avg_time = df['time'].mean()
    ax.plot(df['gen'], df['time'], color='green', linewidth=1.5, alpha=0.5, label='Temps/Gen')
    ax.axhline(y=avg_time, color='darkgreen', linestyle='--', linewidth=2, label=f'Moyenne ({avg_time:.1f}s)')
    ax.set_ylabel("Secondes")
    ax.set_xlabel("Générations")
    ax.set_ylim(20, 60)
    ax.legend(fontsize=9)

# --- MAIN ---
def run_analysis():
    if not os.path.exists(CSV_FILE): return
    if not os.path.exists(OUTPUT_DIR): os.makedirs(OUTPUT_DIR)
    cleanup_old_plots()
    df = pd.read_csv(CSV_FILE)
    sns.set_theme(style="whitegrid")

    # Dashboard 2x3
    fig, axes = plt.subplots(2, 3, figsize=(22, 12))
    plt.subplots_adjust(hspace=0.3, wspace=0.25)
    draw_convergence(axes[0,0], df)
    draw_diversity(axes[0,1], df)
    draw_sa_impact(axes[0,2], df)
    draw_soft_profile(axes[1,0], df)
    draw_soft_evolution(axes[1,1], df)
    draw_time_stability(axes[1,2], df)
    plt.savefig(os.path.join(OUTPUT_DIR, "master_pfe_dashboard.png"), dpi=150, bbox_inches='tight')
    plt.close()

    # 6 Graphes séparés
    plots = {
        "1_convergence_globale": draw_convergence,
        "2_diversite_genetique": draw_diversity,
        "3_impact_memetique_sa": draw_sa_impact,
        "4_profil_qualite_final": draw_soft_profile,
        "5_evolution_qualite_pedagogique": draw_soft_evolution,
        "6_performance_et_stabilite_cpu": draw_time_stability
    }
    
    for name, func in plots.items():
        save_individual_plot(name, func, df)
        print(f"✅ Graphe sauvegardé : {name}.png")

if __name__ == "__main__":
    run_analysis()
