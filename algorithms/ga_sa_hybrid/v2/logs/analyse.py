import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# --- MAPPING POUR LA SOUTENANCE (Friendly Names) ---
NAMES = {
    "h_total": "Total Conflits Durs",
    "s_total": "Pénalité Qualité (Soft)",
    "H1": "Conflit Professeur",
    "H2": "Conflit Salle",
    "H3": "Conflit Groupe",
    "H4": "Capacité Insuffisante",
    "H9": "Indisponibilité Prof",
    "H10": "Type Salle Incorrect",
    "H12": "CM le Samedi",
    "S_GAPS": "Trous (Gaps)",
    "S_LUNCH": "Pause Déjeuner",
    "S_BALANCE": "Équilibre Journalier",
    "S_STABILITY": "Stabilité Salles",
    "S_SHORT_DAY": "Journées Isolées",
    "S_FREE_APM": "Après-midis Libres",
    "S_FATIGUE": "Fatigue Fin de Journée",
    "S_SATURDAY": "Cours du Samedi",
    "S_MIXING": "Mélange de Modules",
    "S_CM_DISPERSION": "Dispersion des CM"
}

CSV_FILE = "evolution_history.csv"
OUTPUT_DIR = "plots"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def generate_plots():
    if not os.path.exists(CSV_FILE):
        print(f"❌ Erreur : '{CSV_FILE}' introuvable. Lancez le solver d'abord.")
        return

    print(f"🧬 Analyse des données d'évolution en cours...")
    df = pd.read_csv(CSV_FILE)
    sns.set_theme(style="whitegrid")

    # 1. COURBE DE CONVERGENCE DUAL-AXE (HARD vs SOFT)
    plt.figure(figsize=(12, 7))
    ax1 = plt.gca()
    
    # Courbe Hard (Logique de survie)
    color_hard = '#e63946'
    ax1.set_xlabel('Générations', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Nombre de Violations Hard (Log)', color=color_hard, fontsize=12, fontweight='bold')
    ax1.plot(df['gen'], df['h_total'], color=color_hard, linewidth=3, label='H (Hard Constraints)')
    ax1.set_yscale('log')
    ax1.tick_params(axis='y', labelcolor=color_hard)

    # Courbe Soft (Logique de qualité)
    ax2 = ax1.twinx()
    color_soft = '#457b9d'
    ax2.set_ylabel('Score de Pénalité Soft (Qualité)', color=color_soft, fontsize=12, fontweight='bold')
    ax2.plot(df['gen'], df['s_total'], color=color_soft, linewidth=2, linestyle='--', label='S (Soft Constraints)')
    ax2.tick_params(axis='y', labelcolor=color_soft)

    plt.title('Convergence de l\'Algorithme Hybride GA-SA (V2.1)', fontsize=15, pad=20, fontweight='bold')
    fig = plt.gcf()
    fig.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/01_convergence_globale.png", dpi=300)
    plt.close()

    # 2. PROFIL DES CONTRAINTES SOFT (Dernière Génération)
    if 's_total' in df.columns:
        soft_keys = [k for k in df.columns if k.startswith('S') and k != 's_total']
        if soft_keys:
            last_gen = df.iloc[-1]
            data_soft = {NAMES.get(k, k): last_gen[k] for k in soft_keys if last_gen[k] > 0}
            
            if data_soft:
                plt.figure(figsize=(10, 6))
                df_soft = pd.DataFrame(list(data_soft.items()), columns=['Contrainte', 'Pénalité'])
                df_soft = df_soft.sort_values(by='Pénalité', ascending=False)
                
                sns.barplot(data=df_soft, x='Pénalité', y='Contrainte', palette='viridis')
                plt.title('Profil de Qualité Pédagogique Final', fontsize=14, fontweight='bold')
                plt.tight_layout()
                plt.savefig(f"{OUTPUT_DIR}/02_analyse_qualite.png", dpi=300)
                plt.close()

    # 3. DÉCOMPOSITION DE LA RÉSOLUTION DES CONFLITS (HARD)
    hard_keys = [k for k in df.columns if k.startswith('H') and k != 'h_total']
    valid_hard_keys = [k for k in hard_keys if df[k].iloc[0] > 0] # Uniquement celles qui avaient des conflits au début
    
    if valid_hard_keys:
        plt.figure(figsize=(12, 6))
        for k in valid_hard_keys:
            plt.plot(df['gen'], df[k], label=NAMES.get(k, k), alpha=0.8, linewidth=2)
        
        plt.title('Vitesse de résolution par type de conflit Hard', fontsize=14, fontweight='bold')
        plt.xlabel('Générations')
        plt.ylabel('Nombre de Violations')
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()
        plt.savefig(f"{OUTPUT_DIR}/03_resolution_conflits.png", dpi=300)
        plt.close()

    # 4. PERFORMANCE TEMPORELLE
    plt.figure(figsize=(10, 4))
    plt.fill_between(df['gen'], df['time'], color='seagreen', alpha=0.3)
    plt.plot(df['gen'], df['time'], color='seagreen', linewidth=1, marker='.', markersize=3)
    plt.title('Temps de calcul CPU par génération (Stabilité)', fontsize=12, fontweight='bold')
    plt.xlabel('Générations')
    plt.ylabel('Secondes')
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/04_performance_cpu.png", dpi=300)
    plt.close()

    print(f"✅ Terminé ! 4 images prêtes dans '{OUTPUT_DIR}/'")

if __name__ == "__main__":
    generate_plots()
