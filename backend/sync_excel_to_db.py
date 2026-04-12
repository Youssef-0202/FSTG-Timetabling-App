from sqlalchemy.orm import Session
from database import SessionLocal
import models
import pandas as pd
import re
import unicodedata

def deep_clean(text):
    if not text: return ""
    nks = unicodedata.normalize('NFD', str(text).upper())
    return "".join([c for c in nks if not unicodedata.combining(c) and c.isalnum()])

DB_KEYPOST = {
    "Langue Etrangère 2": "LTC1",
    "LTC2 Français": "LTC2",
    "Méthodes d'analyse chimique et biologique": "METHODEANALYSE",
    "Pétrographie et Minéralogie": "PERTOGRAPHIE",
    "Systèmes d'Information et Bases de Données": "SYSTEME",
    "Modèles de Régression Linéaire": "REGRESSION",
    "Physiologie Animale et Végétale": "PHYSIOLOGIE",
    "Circuits électriques et électronique": "CIRCUITS",
    "Mecanique du point / Optique": "MECANIQUEDUPOINT",
    "Analyse de Données": "ANALYSEDEDONNEES",
    "Structure des Données": "STRUCTUREDESDONNEES",
    "Mécanique des Fluides et Transfert Thermique": "MECANIQUEDESFLUIDES"
}

# Mapping des codes colonnes Excel vers les noms de sections DB
FILIERE_MAP = {
    "GES": "GESE",
    "GEG": "GEG",
    "GP": "GP",
    "GI": "GI",
    "MSD": "MSD",
    "GC": "GC",
    "GB": "GB"
}

def sync():
    db = SessionLocal()
    try:
        db.query(models.Assignment).delete()
        db.commit()

        df = pd.read_excel('data/Modules-Enseignants_Emploi.xlsx')
        db_mods = db.query(models.Module).all()
        db_teachers = db.query(models.Teacher).all()
        db_sections = db.query(models.Section).all()

        print("🚀 Sync Finale Corrigée (GESE / GEG)...")
        
        assigned_m = set()
        count = 0

        for _, row in df.iterrows():
            ex_name = deep_clean(row['INTITULE DES MODULES'])
            ex_prof = deep_clean(row['Nom'])
            ex_sem = str(row['SEMESTRE']).strip().upper()

            teacher = next((t for t in db_teachers if ex_prof in deep_clean(t.name) or deep_clean(t.name) in ex_prof), None)
            if not teacher: continue

            target_m = None
            for m in db_mods:
                key = deep_clean(DB_KEYPOST.get(m.name, m.name))
                if key in ex_name or ex_name in key:
                    target_m = m; break
            
            if target_m:
                search_sems = [ex_sem]
                if ex_sem == "S1": search_sems.append("S2")
                if ex_sem == "S3": search_sems.append("S4")
                
                active_col_codes = [col for col in FILIERE_MAP.keys() if pd.notna(row[col])]
                sects = []
                for s in db_sections:
                    if s.semestre in search_sems and s.semestre in ["S2", "S4"]:
                        # On vérifie si le nom de la section contient l'un des codes mappés
                        for code in active_col_codes:
                            db_code = FILIERE_MAP[code]
                            if db_code in s.name:
                                sects.append(s)
                                break
                
                mp = db.query(models.ModulePart).filter(models.ModulePart.module_id == target_m.id, models.ModulePart.type == "CM").first()
                if mp and sects:
                    for s in set(sects):
                        db.add(models.Assignment(module_part_id=mp.id, teacher_id=teacher.id, section_id=s.id))
                        count += 1
                    assigned_m.add(target_m.id)

        db.commit()
        print(f"\n--- RÉSULTAT ---")
        print(f"Modules connectés : {len(assigned_m)}/41")
        print(f"Total séances : {count}")
    finally:
        db.close()

if __name__ == "__main__":
    sync()
