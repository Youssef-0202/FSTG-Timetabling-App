import os
os.environ['DATABASE_URL'] = 'postgresql://user_pfe:password_pfe@localhost:5432/fstm_timetable'
from database import SessionLocal
from sqlalchemy import text

def fix_orphaned_modules():
    db = SessionLocal()
    try:
        # Find module parts that have assignments in a section, but the module has no groupe_module
        q = text("""
            SELECT DISTINCT m.id, a.section_id 
            FROM modules m
            JOIN module_parts mp ON m.id = mp.module_id
            JOIN assignments a ON mp.id = a.module_part_id
            LEFT JOIN groupe_modules gm ON gm.module_id = m.id
            WHERE gm.id IS NULL AND a.section_id IS NOT NULL
        """)
        orphans = db.execute(q).fetchall()
        print(f"Found {len(orphans)} orphaned modules via CM assignments")
        
        for m_id, section_id in orphans:
            # Get effectif
            sec_cap = db.execute(text("SELECT total_capacity FROM sections WHERE id = :s"), {"s": section_id}).scalar() or 0
            
            # create GroupeModule
            res = db.execute(text("INSERT INTO groupe_modules (module_id, effectif) VALUES (:m, :eff) RETURNING id"), {"m": m_id, "eff": sec_cap})
            gm_id = res.scalar()
            
            # link to groupe_filieres of this section
            gfs = db.execute(text("SELECT groupe_id FROM section_groupes WHERE section_id = :s"), {"s": section_id}).fetchall()
            for gf in gfs:
                db.execute(text("INSERT INTO groupe_module_groupes (groupe_module_id, groupe_id) VALUES (:gm, :gf) ON CONFLICT DO NOTHING"), {"gm": gm_id, "gf": gf[0]})
        
        # Now via TD/TP assignments
        q_td = text("""
            SELECT DISTINCT m.id, tg.section_id 
            FROM modules m
            JOIN module_parts mp ON m.id = mp.module_id
            JOIN assignments a ON mp.id = a.module_part_id
            JOIN assignment_tdgroups atd ON a.id = atd.assignment_id
            JOIN td_groups tg ON atd.tdgroup_id = tg.id
            LEFT JOIN groupe_modules gm ON gm.module_id = m.id
            WHERE gm.id IS NULL
        """)
        orphans_td = db.execute(q_td).fetchall()
        print(f"Found {len(orphans_td)} orphaned modules via TD assignments")
        for m_id, section_id in orphans_td:
            # Get effectif
            sec_cap = db.execute(text("SELECT total_capacity FROM sections WHERE id = :s"), {"s": section_id}).scalar() or 0
            
            # create GroupeModule
            res = db.execute(text("INSERT INTO groupe_modules (module_id, effectif) VALUES (:m, :eff) RETURNING id"), {"m": m_id, "eff": sec_cap})
            gm_id = res.scalar()
            
            # link to groupe_filieres of this section
            gfs = db.execute(text("SELECT groupe_id FROM section_groupes WHERE section_id = :s"), {"s": section_id}).fetchall()
            for gf in gfs:
                db.execute(text("INSERT INTO groupe_module_groupes (groupe_module_id, groupe_id) VALUES (:gm, :gf) ON CONFLICT DO NOTHING"), {"gm": gm_id, "gf": gf[0]})
        
        db.commit()
        print("Database schema fixed: orphaned modules now linked to their filiere.")
    except Exception as e:
        db.rollback()
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphaned_modules()
