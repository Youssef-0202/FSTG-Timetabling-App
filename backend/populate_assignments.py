import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
from database import SessionLocal

def init_groupe_modules(db):
    """
    Initialise les pools (GroupeModule) pour S2 et S4.
    Effetif = 0 comme demandé.
    """
    print("Initialisation des pools (GroupeModule)...")
    sections = db.query(models.Section).all()
    sec_map = {s.name: s for s in sections}
    modules = db.query(models.Module).all()
    
    for mod in modules:
        existing = db.query(models.GroupeModule).filter_by(module_id=mod.id).first()
        if not existing:
            gm = models.GroupeModule(module_id=mod.id, effectif=0)
            db.add(gm)
    db.commit()

def run_import_timetables():
    db = SessionLocal()
    db.query(models.Assignment).delete()
    db.commit()
    init_groupe_modules(db)
    print(f"✅ Base à 0 prête pour la démo. Assignments = {db.query(models.Assignment).count()}")
    db.close()

if __name__ == "__main__":
    run_import_timetables()
