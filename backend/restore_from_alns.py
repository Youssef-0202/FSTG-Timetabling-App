import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import models
from database import SessionLocal

def restore():
    db = SessionLocal()
    try:
        # Load the ALNS JSON file that has all the 245 assignments.
        # This will perfectly restore the 14 assignments for GB and all other classes!
        file_path = os.path.join(os.path.dirname(__file__), 'generated_timetable_alns_v1.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print("> Suppression des anciennes affectations...")
        from sqlalchemy import text
        db.execute(text("DELETE FROM assignment_tdgroups"))
        db.query(models.Assignment).delete()
        db.flush()

        print(f"> Restauration de {len(data)} affectations depuis la sauvegarde...")
        count_gb = 0
        for item in data:
            new_a = models.Assignment(
                id=item['id'],
                module_part_id=item['module_part_id'],
                teacher_id=item.get('teacher_id'),
                room_id=item.get('room_id'),
                slot_id=item.get('slot_id'),
                section_id=item.get('section_id'),
                is_locked=item.get('is_locked', False)
            )
            
            # Ajouter les TDs associés
            td_group_ids = []
            for g in item.get('td_groups', []):
                g_id = g['id'] if isinstance(g, dict) else g
                g_obj = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
                if g_obj:
                    new_a.td_groups.append(g_obj)
                td_group_ids.append(g_id)
            
            if item.get('section_id') == 9 or 29 in td_group_ids:
                count_gb += 1
                
            db.add(new_a)

        db.commit()
        print(f"✅ TERMINE. La base de données a été restaurée avec succès.")
        print(f"📊 {len(data)} affectations totales créées.")
        print(f"🎓 Exactement {count_gb} affectations pour GB S4.")
        
    except Exception as e:
        db.rollback()
        print(f"Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    restore()
