import pandas as pd
import csv
import os
from database import SessionLocal
import models as schema
import re

def clean_txt(t):
    if not t: return ""
    return re.sub(r'[^A-Z0-9]', ' ', str(t).upper().strip())

def run_import():
    db = SessionLocal()
    print("🚀 IMPORTATION RÉELLE FSTG...")

    # 0. NETTOYAGE PRÉALABLE (Intégrité référentielle)
    print("🧹 Nettoyage des anciennes données...")
    db.query(schema.Assignment).delete()
    db.query(schema.Teacher).delete()
    db.query(schema.Room).delete()
    db.commit()

    # 1. SALLES
    try:
        csv_path = '/app/data/Salles.csv'
        if os.path.exists(csv_path):
            with open(csv_path, mode='r', encoding='latin-1') as f:
                reader = csv.DictReader(f, delimiter=';')
                for row in reader:
                    stype = "SALLE_TD"
                    if "AMPHI" in row['type_salle'].upper(): stype = "AMPHI"
                    elif "TP" in row['type_salle'].upper(): stype = "SALLE_TP"
                    db.add(schema.Room(name=row['nom_salle'], capacity=int(row['capacité']), type=stype))
            print("   ✅ Salles : OK")
        db.commit()
    except Exception as e:
        print(f"   ❌ Erreur Salles : {e}")

    # 2. PROFS ET MODULES
    try:
        excel_path = '/app/data/Modules-Enseignants_Emploi.xlsx'
        if os.path.exists(excel_path):
            df = pd.read_excel(excel_path)
            # Création des profs uniques
            for _, r in df[['Nom', 'Prénom']].dropna().drop_duplicates().iterrows():
                nm = f"{r['Nom']} {r['Prénom']}".strip()
                # Email unique basé sur Nom.P
                mail = f"{str(r['Nom']).lower()}.{str(r['Prénom']).lower()}@fstm.ma"
                db.add(schema.Teacher(name=nm, email=mail, availabilities={}))
            db.commit()
            print("   ✅ Profs : OK")

            # Liaison
            m_list = db.query(schema.Module).all()
            for _, r in df.iterrows():
                ex_n = clean_txt(r['INTITULE DES MODULES'])
                p_nm = f"{r['Nom']} {r['Prénom']}".strip()
                t_o = db.query(schema.Teacher).filter(schema.Teacher.name == p_nm).first()
                if not t_o: continue
                for m_o in m_list:
                    if clean_txt(m_o.name) in ex_n or ex_n in clean_txt(m_o.name):
                        for p_o in m_o.parts:
                            # Mise à jour ou création de l'affectation
                            old = db.query(schema.Assignment).filter(schema.Assignment.module_part_id == p_o.id).first()
                            if old: old.teacher_id = t_o.id
                            else: db.add(schema.Assignment(module_part_id=p_o.id, teacher_id=t_o.id, is_locked=False))
                        print(f"      🔗 {m_o.name} -> {t_o.name}")
                        break
            db.commit()
            print("   ✅ Liaisons Modules-Profs : OK")
    except Exception as e:
        print(f"   ❌ Erreur Excel : {e}")

    # 3. EFFECTIFS
    for gm in db.query(schema.GroupeModule).all(): gm.effectif = 140
    for td in db.query(schema.TDGroup).all(): td.size = 45
    db.commit()
    db.close()
    print("✨ TERMINÉ !")

if __name__ == "__main__":
    run_import()
