from database import SessionLocal
import models

def inspect():
    db = SessionLocal()
    
    # Voir les filieres
    fils = db.query(models.Filiere).all()
    print("FILIERES:")
    for f in fils:
        print(f" - {f.id}: {f.name}")
        
    print("\nGROUPE FILIERES:")
    grps = db.query(models.GroupeFiliere).all()
    for g in grps:
        f_name = g.filiere.name if g.filiere else "None"
        print(f" - {g.id}: {f_name} {g.semestre}")
        
    print("\nSECTIONS:")
    secs = db.query(models.Section).all()
    for s in secs:
        print(f" - {s.id}: {s.name} (actuellement liés à {[g.id for g in s.groupes]} groupes)")

if __name__ == "__main__":
    inspect()
