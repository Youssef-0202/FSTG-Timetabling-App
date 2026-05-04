import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
import glob

# --- MAPPING POUR LA SOUTENANCE (Friendly Names) ---
NAMES = {
    "h_total": "Total Conflits Durs",
    "H1_Prof": "Conflit Professeur (H1)",
    "H2_Salle": "Conflit Salle (H2)",
    "H3_Grp": "Conflit Groupe (H3)",
    "H4_Cap": "Capacité Insuffisante (H4)",
    "H9_Indisp": "Indisponibilité Prof (H9)",
    "H10_Type": "Type Salle Incorrect (H10)",
    "H12_Sat": "CM le Samedi (H12)",
    "s_total": "Pénalité Qualité (Soft)",
    "S3_Gaps": "Trous (S3)",
    "S4_Lunch": "Pause Déjeuner (S4)",
    "S5_Balance": "Équilibre (S5)",
    "S6_Stab": "Instabilité Salles (S6)",
    "S7_Short": "Jours Isolés (S7)",
    "S8_FreeApm": "Liberté AM (S8)",
    "S9_Fatigue": "Fatigue (S9)",
    "S10_Sat": "Samedi (S10)"
}

# Détection automatique des chemins
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, "evolution_history.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "plots")

def cleanup_old_plots():
    """Supprime les anciens fichiers 1.png, 2.png, 3.png etc."""
    for f in glob.glob(os.path.join(OUTPUT_DIR, "[1-9].png")):
        try: os.remove(f)
        except: pass

def save_individual_plot(name, fig_func, df):
    """Génère et sauvegarde un plot seul."""
    plt.figure(figsize=(10, 6))
    fig_func(plt.gca(), df)
    plt.savefig(os.path.join(OUTPUT_DIR, f"{name}.png"), dpi=150, bbox_inches='tight')
    plt.close()

# --- FONCTIONS DE DESSIN ---
def draw_convergence(ax, df):
    ax.set_title("Analyse de la Convergence (Faisabilité vs Qualité)", fontsize=12, fontweight='bold')
    
    # Courbe Hard (Rouge - Axe Gauche)
    lns1 = ax.plot(df['gen'], df['h_total'], label='Violations Hard', 
                   color='red', linewidth=2, marker='x', markevery=5)
    ax.set_ylabel("Violations Hard", color='red')
    ax.tick_params(axis='y', labelcolor='red')
    
    # Force les entiers pour éviter les 0.5
    import matplotlib.ticker as ticker
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    
    # Création du deuxième axe pour le Soft
    ax2 = ax.twinx()
    lns2 = ax2.plot(df['gen'], df['s_total'], label='Score Soft', 
                    color='blue', linestyle='--', linewidth=1.5, marker='o', markevery=5, alpha=0.7)
    ax2.set_ylabel("Pénalités Soft", color='blue')
    ax2.tick_params(axis='y', labelcolor='blue')
    
    ax.set_xlabel("Générations")
    
    # Fusion des légendes en bas
    lns = lns1 + lns2
    labs = [l.get_label() for l in lns]
    ax.legend(lns, labs, loc='upper center', bbox_to_anchor=(0.5, -0.15), ncol=2, fontsize=10)

def draw_diversity(ax, df):
    ax.set_title("Exploration de l'Espace (Diversité Génétique)", fontsize=12, fontweight='bold')
    if 'diversity' in df.columns:
        sns.lineplot(data=df, x='gen', y='diversity', ax=ax, color='purple', linewidth=2)
        ax.fill_between(df['gen'], 0, df['diversity'], color='purple', alpha=0.1)
    ax.set_ylabel("Hamming Distance (%)")

def draw_sa_impact(ax, df):
    ax.set_title("Impact de la Recherche Locale (Gain Mémétique)", fontsize=12, fontweight='bold')
    if 'sa_impact' in df.columns:
        sns.barplot(data=df, x='gen', y='sa_impact', ax=ax, color='orange', alpha=0.6)
        for i, t in enumerate(ax.get_xticklabels()):
            if i % 10 != 0: t.set_visible(False)
    ax.set_ylabel("Gain Fitness")

def draw_soft_profile(ax, df):
    ax.set_title("Répartition Finale des Pénalités (Profil de Qualité)", fontsize=12, fontweight='bold')
    last_gen = df.iloc[-1]
    soft_cols = [c for c in df.columns if c.startswith('S') and c != 's_total' and last_gen[c] > 0]
    labels = [NAMES.get(k, k) for k in soft_cols]
    values = [last_gen[k] for k in soft_cols]
    if values:
        sns.barplot(x=values, y=labels, ax=ax, palette='viridis')

def draw_soft_evolution(ax, df):
    ax.set_title("Dynamique d'Optimisation des Règles Pédagogiques", fontsize=12, fontweight='bold')
    soft_cols = [c for c in df.columns if c.startswith('S') and c != 's_total' and df[c].max() > 0]
    for col in soft_cols:
        ax.plot(df['gen'], df[col], label=NAMES.get(col, col), alpha=0.8)
    ax.legend(fontsize=8, loc='upper right')

def draw_cpu_time(ax, df):
    ax.set_title("Performance Temporelle et Efficacité CPU", fontsize=12, fontweight='bold')
    sns.lineplot(data=df, x='gen', y='time', ax=ax, color='green')
    ax.set_ylabel("Secondes / Gen")

def draw_hard_details(ax, df):
    ax.set_title("Détail de la Résolution des Conflits Critiques", fontsize=12, fontweight='bold')
    hard_cols = [c for c in df.columns if c.startswith('H') and c != 'h_total']
    for col in hard_cols:
        ax.plot(df['gen'], df[col], label=NAMES.get(col, col))
    ax.legend(fontsize=8)
    ax.set_ylabel("Violations")

# --- MAIN ---
def run_analysis():
    if not os.path.exists(CSV_FILE):
        print(f"❌ Erreur : {CSV_FILE} introuvable.")
        return

    if not os.path.exists(OUTPUT_DIR): os.makedirs(OUTPUT_DIR)
    cleanup_old_plots()
    df = pd.read_csv(CSV_FILE)
    sns.set_theme(style="whitegrid")

    # 1. Générer le Dashboard Combiné
    fig, axes = plt.subplots(2, 3, figsize=(22, 12))
    plt.subplots_adjust(hspace=0.3, wspace=0.25)
    fig.suptitle("ANALYSE GA-SA HYBRIDE - FSTG TIMETABLING", fontsize=20, fontweight='bold')
    
    draw_convergence(axes[0,0], df)
    draw_diversity(axes[0,1], df)
    draw_sa_impact(axes[0,2], df)
    draw_soft_profile(axes[1,0], df)
    draw_soft_evolution(axes[1,1], df)
    draw_cpu_time(axes[1,2], df)
    
    plt.savefig(os.path.join(OUTPUT_DIR, "master_pfe_dashboard.png"), dpi=150, bbox_inches='tight')
    plt.close()

    # 2. Générer les 7 fichiers séparés
    plots = {
        "1_convergence": draw_convergence,
        "2_diversity": draw_diversity,
        "3_sa_impact": draw_sa_impact,
        "4_quality_profile": draw_soft_profile,
        "5_quality_evolution": draw_soft_evolution,
        "6_cpu_performance": draw_cpu_time,
        "7_hard_conflicts": draw_hard_details
    }
    
    for name, func in plots.items():
        save_individual_plot(name, func, df)
        print(f"✅ Graphe sauvegardé : {name}.png")

    print("\n🚀 ANALYSE TERMINÉE : Dashboard + 7 Graphes individuels générés.")

if __name__ == "__main__":
    run_analysis()
