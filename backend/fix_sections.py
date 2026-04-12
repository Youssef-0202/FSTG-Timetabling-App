from sqlalchemy.orm import Session
from database import SessionLocal
import models

def fix_assignments():
    db = SessionLocal()
    try:
        assignments = db.query(models.Assignment).all()
        sections = db.query(models.Section).all()
        
        print(f"Analyse de {len(assignments)} séances...")
        
        count = 0
        for a in assignments:
            # Récupérer le nom du module via module_part
            module = a.module_part.module
            
            # Chercher une section qui contient le nom ou le semestre du module
            # Pour l'instant on fait un lien simple : on cherche une section compatible
            # (Dans un cas réel, on regarderait la table de liaison GroupeModule <-> GroupeFiliere)
            
            # On va essayer de trouver la section qui correspond au semestre du module (si dispo)
            # Sinon, on prend la première section qui matche plus ou moins
            for s in sections:
                # Si le module est un CM, on le lie à la section Tronc Commun
                if a.module_part.type == "CM":
                    # Stratégie temporaire : si le module et la section partagent un bout de nom
                    # Ou par défaut on remplit pour avoir de la donnée visuelle
                    a.section_id = s.id
                    count += 1
                    break
        
        db.commit()
        print(f"Succès : {count} séances ont été rattachées à des sections.")
    except Exception as e:
        print(f"Erreur : {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_assignments()
