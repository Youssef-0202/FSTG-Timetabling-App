from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Modules for GEG S2 ---")
    res = conn.execute(text("""
        SELECT m.name, mp.type 
        FROM modules m
        JOIN groupe_modules gm ON m.id = gm.module_id
        JOIN groupe_module_groupes gmg ON gm.id = gmg.groupe_module_id
        JOIN groupe_filieres gf ON gmg.groupe_id = gf.id
        JOIN filieres f ON gf.filiere_id = f.id
        JOIN module_parts mp ON m.id = mp.module_id
        WHERE f.name = 'GEG' AND gf.semestre = 'S2'
    """)).fetchall()
    for row in res:
        print(f"{row[0]} ({row[1]})")

    print("\n--- Modules for GB S2 ---")
    res = conn.execute(text("""
        SELECT m.name, mp.type 
        FROM modules m
        JOIN groupe_modules gm ON m.id = gm.module_id
        JOIN groupe_module_groupes gmg ON gm.id = gmg.groupe_module_id
        JOIN groupe_filieres gf ON gmg.groupe_id = gf.id
        JOIN filieres f ON gf.filiere_id = f.id
        JOIN module_parts mp ON m.id = mp.module_id
        WHERE f.name = 'GB' AND gf.semestre = 'S2'
    """)).fetchall()
    for row in res:
        print(f"{row[0]} ({row[1]})")
