import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

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

CSV_FILE = "evolution_history.csv"
OUTPUT_DIR = "plots"

def generate_master_dashboard():
    if not os.path.exists(CSV_FILE):
        print(f"❌ Erreur : {CSV_FILE} introuvable.")
        return

    df = pd.read_csv(CSV_FILE)
    sns.set_theme(style="whitegrid")
    
    # Creation de la figure globale (Dashboard 3x2)
    fig, axes = plt.subplots(2, 3, figsize=(22, 12))
    plt.subplots_adjust(hspace=0.3, wspace=0.25)
    fig.suptitle("ANALYSE GÉNÉTIQUE & MÉMÉTIQUE - DASHBOARD MASTER AI", fontsize=22, fontweight='bold', y=0.98)

    # 1. CONVERGENCE GLOBALE (Log scale pour les conflits)
    ax1 = axes[0, 0]
    ax1.set_title("1. Convergence Globale (Log Scale)", fontsize=14, fontweight='bold')
    ax1.plot(df['gen'], df['h_total'], label='Violations Hard', color='red', linewidth=2.5)
    ax1.set_yscale('symlog')
    ax1.set_ylabel("Hard (Log)", color='red', fontsize=12)
    ax1_twin = ax1.twinx()
    ax1_twin.plot(df['gen'], df['s_total'], label='Pénalités Soft', color='blue', linestyle='--', alpha=0.7)
    ax1_twin.set_ylabel("Soft (Linear)", color='blue', fontsize=12)
    ax1.set_xlabel("Générations")

    # 2. DIVERSITÉ GÉNÉTIQUE (Hamming Distance)
    ax2 = axes[0, 1]
    ax2.set_title("2. Diversité de la Population (%)", fontsize=14, fontweight='bold')
    if 'diversity' in df.columns:
        sns.lineplot(data=df, x='gen', y='diversity', ax=ax2, color='purple', linewidth=2)
        ax2.fill_between(df['gen'], 0, df['diversity'], color='purple', alpha=0.1)
        ax2.set_ylabel("Différence Inter-Individus (%)")
    else:
        ax2.text(0.5, 0.5, "Données non dispos", ha='center')

    # 3. IMPACT DU RECUIT SIMULÉ (Mémétique)
    ax3 = axes[0, 2]
    ax3.set_title("3. Gain du Recuit Simulé (SA Impact)", fontsize=14, fontweight='bold')
    if 'sa_impact' in df.columns:
        sns.barplot(data=df, x='gen', y='sa_impact', ax=ax3, color='orange', alpha=0.6)
        # On ne montre qu'une tick sur 5 pour la lisibilité
        for i, t in enumerate(ax3.get_xticklabels()):
            if i % 5 != 0: t.set_visible(False)
        ax3.set_ylabel("Amélioration Fitness par SA")
    else:
        ax3.text(0.5, 0.5, "Données non dispos", ha='center')

    # 4. RÉSOLUTION DÉTAILLÉE DES CONFLITS HARD
    ax4 = axes[1, 0]
    ax4.set_title("4. Résolution par Type de Conflit (Hard)", fontsize=14, fontweight='bold')
    hard_cols = [c for c in df.columns if c.startswith('H') and c != 'h_total']
    for col in hard_cols:
        ax4.plot(df['gen'], df[col], label=NAMES.get(col, col), alpha=0.8)
    ax4.legend(fontsize=9, loc='upper right')
    ax4.set_ylabel("Violations")

    # 5. PROFIL QUALITÉ (Dernière Génération)
    ax5 = axes[1, 1]
    ax5.set_title("5. Profil Qualité (Dernière Gen)", fontsize=14, fontweight='bold')
    last_gen = df.iloc[-1]
    soft_keys = [k for k in df.columns if k.startswith('S') and k != 's_total']
    labels = [NAMES.get(k, k) for k in soft_keys if last_gen[k] > 0]
    values = [last_gen[k] for k in soft_keys if last_gen[k] > 0]
    if values:
        sns.barplot(x=values, y=labels, ax=ax5, palette='viridis')
        ax5.set_xlabel("Pénalité cumulée")
    else:
        ax5.text(0.5, 0.5, "Qualité Parfaite !", ha='center')

    # 6. STABILITÉ / TEMPS CPU
    ax6 = axes[1, 2]
    ax6.set_title("6. Stabilité du Temps de Calcul (CPU)", fontsize=14, fontweight='bold')
    sns.lineplot(data=df, x='gen', y='time', ax=ax6, color='green', marker='o', markersize=4)
    ax6.set_ylabel("Secondes par Génération")
    
    # Sauvegarde
    if not os.path.exists(OUTPUT_DIR): os.makedirs(OUTPUT_DIR)
    plt.savefig(os.path.join(OUTPUT_DIR, "master_pfe_dashboard.png"), dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✅ Dashboard Master généré : {OUTPUT_DIR}/master_pfe_dashboard.png")

if __name__ == "__main__":
    generate_master_dashboard()
