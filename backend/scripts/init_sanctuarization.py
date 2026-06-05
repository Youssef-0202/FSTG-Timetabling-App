from database import SessionLocal
from models import TDGroup, TPSanctuarization, Section
import re

def init():
    db = SessionLocal()
    try:
        # On cible la section GB-GEG S2 (supposée ID=1 ou nom correspondant)
        section = db.query(Section).filter(Section.id == 1).first()
        if not section:
            print("Section ID 1 non trouvée.")
            return

        groups = db.query(TDGroup).filter(TDGroup.section_id == section.id).all()
        
        # Nettoyage si existant
        group_ids = [g.id for g in groups]
        db.query(TPSanctuarization).filter(TPSanctuarization.group_id.in_(group_ids)).delete(synchronize_session=False)
        
        new_rules = []
        for g in groups:
            m = re.search(r'Gr\s*(\d+)', g.name)
            if not m: continue
            g_num = int(m.group(1))
            
            if g_num in [1, 2]:
                new_rules.append(TPSanctuarization(group_id=g.id, day='MARDI', is_morning=False))
                new_rules.append(TPSanctuarization(group_id=g.id, day='JEUDI', is_morning=False))
            elif g_num in [3, 4]:
                new_rules.append(TPSanctuarization(group_id=g.id, day='MERCREDI', is_morning=True))
                new_rules.append(TPSanctuarization(group_id=g.id, day='VENDREDI', is_morning=True))
            elif g_num in [5, 6]:
                new_rules.append(TPSanctuarization(group_id=g.id, day='LUNDI', is_morning=True))
                new_rules.append(TPSanctuarization(group_id=g.id, day='MERCREDI', is_morning=True))
        
        db.add_all(new_rules)
        db.commit()
        print(f"Injection réussie : {len(new_rules)} règles créées pour {section.name}")
    except Exception as e:
        print(f"Erreur : {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init()
