from sqlalchemy.orm import Session
from database import SessionLocal
import models

def generate_s4_tds():
    db = SessionLocal()
    try:
        # 1. Récupérer les CM du S4
        s4_cm_assignments = db.query(models.Assignment).join(models.Section).join(models.ModulePart).filter(
            models.Section.name.like('%S4'),
            models.ModulePart.type == "CM"
        ).all()

        print(f"🔄 Génération des TD pour {len(s4_cm_assignments)} modules S4...")
        
        count = 0
        for cm_a in s4_cm_assignments:
            # Trouver la partie TD du même module
            td_part = db.query(models.ModulePart).filter(
                models.ModulePart.module_id == cm_a.module_part.module_id,
                models.ModulePart.type == "TD"
            ).first()

            if not td_part:
                continue

            # Vérifier si un TD existe déjà pour éviter les doublons
            existing = db.query(models.Assignment).filter(
                models.Assignment.module_part_id == td_part.id,
                models.Assignment.section_id == cm_a.section_id
            ).first()

            if not existing:
                # Trouver le "Gr 1" de cette section
                gr1 = db.query(models.TDGroup).filter(
                    models.TDGroup.section_id == cm_a.section_id,
                    models.TDGroup.name.like('%Gr 1%')
                ).first()

                if gr1:
                    new_td = models.Assignment(
                        module_part_id=td_part.id,
                        teacher_id=cm_a.teacher_id,
                        section_id=cm_a.section_id,
                        is_locked=False
                    )
                    new_td.td_groups.append(gr1)
                    db.add(new_td)
                    count += 1

        db.commit()
        print(f"✅ Succès : {count} affectations de TD créées pour le S4.")

    finally:
        db.close()

if __name__ == "__main__":
    generate_s4_tds()
