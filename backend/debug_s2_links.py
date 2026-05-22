from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # 1. Get GEG S2 ID
    geg_s2_row = conn.execute(text("SELECT id FROM groupe_filieres WHERE semestre = 'S2' AND filiere_id = (SELECT id FROM filieres WHERE name = 'GEG')")).fetchone()
    if not geg_s2_row:
        print("GEG S2 not found")
    else:
        geg_s2_id = geg_s2_row[0]
        print(f"GEG S2 ID: {geg_s2_id}")
        
        # 2. Check group_module_groupes for this ID
        links = conn.execute(text("SELECT count(*) FROM groupe_module_groupes WHERE groupe_id = :gid"), {"gid": geg_s2_id}).scalar()
        print(f"Number of modules linked to GEG S2: {links}")

        # 3. List all module names for S2 (regardless of filiere)
        print("\n--- All S2 Modules in DB ---")
        res = conn.execute(text("""
            SELECT m.name 
            FROM modules m
            JOIN groupe_modules gm ON m.id = gm.module_id
            JOIN groupe_module_groupes gmg ON gm.id = gmg.groupe_module_id
            JOIN groupe_filieres gf ON gmg.groupe_id = gf.id
            WHERE gf.semestre = 'S2'
            LIMIT 20
        """)).fetchall()
        for row in res:
            print(row[0])
