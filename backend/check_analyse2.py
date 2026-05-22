from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Filieres linked to 'Analyse 2' ---")
    res = conn.execute(text("""
        SELECT DISTINCT f.name 
        FROM filieres f 
        JOIN groupe_filieres gf ON f.id = gf.filiere_id 
        JOIN groupe_module_groupes gmg ON gf.id = gmg.groupe_id 
        JOIN groupe_modules gm ON gmg.groupe_module_id = gm.id 
        JOIN modules m ON gm.module_id = m.id 
        WHERE m.name = 'Analyse 2'
    """)).fetchall()
    for row in res:
        print(row[0])
