from sqlalchemy.orm import Session
from database import SessionLocal
import models

def generate_s2_tds():
    db = SessionLocal()
    try:
        # 1. Récupérer les CM du S2
        s2_cm_assignments = db.query(models.Assignment).join(models.Section).join(models.ModulePart).filter(
            models.Section.name.like('%S2'),
            models.ModulePart.type == "CM"
        ).all()

        print(f"🔄 Génération des 6 groupes de TD pour {len(s2_cm_assignments)} modules S2...")
        
        count = 0
        for cm_a in s2_cm_assignments:
            # Trouver la partie TD du même module
            td_part = db.query(models.ModulePart).filter(
                models.ModulePart.module_id == cm_a.module_part.module_id,
                models.ModulePart.type == "TD"
            ).first()

            if not td_part:
                continue

            # Trouver les 6 groupes de cette section (Gr 1 à Gr 6)
            s2_groups = db.query(models.TDGroup).filter(
                models.TDGroup.section_id == cm_a.section_id
            ).all()

            for gr in s2_groups:
                # Vérifier si cet affectation (MP + Groupe) existe déjà
                # (Note: Un groupe peut être lié à plusieurs assignments, mais ici on veut 1 affectation unique par groupe de TD)
                new_td = models.Assignment(
                    module_part_id=td_part.id,
                    teacher_id=cm_a.teacher_id,
                    section_id=cm_a.section_id,
                    is_locked=False
                )
                new_td.td_groups.append(gr)
                db.add(new_td)
                count += 1

        db.commit()
        print(f"✅ Succès : {count} affectations de TD créées pour les sections S2.")

    finally:
        db.close()

if __name__ == "__main__":
    generate_s2_tds()
