import models
import pandas as pd
from database import SessionLocal

def debug():
    db = SessionLocal()
    df = pd.read_excel('data/Modules-Enseignants_Emploi.xlsx')
    
    # On teste sur un module du Tronc Commun S2 qui ne passe pas
    target = "MECANIQUE DU POINT / OPTIQUE"
    row = df[df['INTITULE DES MODULES'].str.contains("MECANIQUE", case=False, na=False)]
    
    if not row.empty:
        r = row.iloc[0]
        prof = str(r['Nom']).strip()
        teacher = db.query(models.Teacher).filter(models.Teacher.name.icontains(prof)).first()
        
        filieres = [col for col in ['GP','GI','MSD','GES','GC','GB','GEG'] if pd.notna(r[col])]
        sections_found = db.query(models.Section).filter(models.Section.semestre == 'S2').all()
        matched_sections = [s.name for s in sections_found if any(f in s.name for f in filieres)]
        
        print(f"--- DIAGNOSTIC POUR : {target} ---")
        print(f"Prof Excel: {prof}")
        print(f"Prof DB: {teacher.name if teacher else 'INTROUVABLE'}")
        print(f"Filières Excel: {filieres}")
        print(f"Sections DB matchées: {matched_sections}")
    else:
        print("Module non trouvé dans l'Excel.")
    db.close()

if __name__ == "__main__":
    debug()
