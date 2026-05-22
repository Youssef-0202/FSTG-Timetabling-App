from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Filieres and Semesters ---")
    res = conn.execute(text("""
        SELECT f.name, gf.semestre, count(*) 
        FROM groupe_filieres gf 
        JOIN filieres f ON gf.filiere_id = f.id 
        GROUP BY f.name, gf.semestre
        ORDER BY f.name, gf.semestre
    """)).fetchall()
    for row in res:
        print(f"{row[0]} - {row[1]}: {row[2]}")

    print("\n--- Sections with S2 for GEG or GB ---")
    res = conn.execute(text("""
        SELECT s.name 
        FROM sections s
        JOIN section_groupes sg ON s.id = sg.section_id
        JOIN groupe_filieres gf ON sg.groupe_id = gf.id
        JOIN filieres f ON gf.filiere_id = f.id
        WHERE f.name IN ('GEG', 'GB') AND gf.semestre = 'S2'
    """)).fetchall()
    for row in res:
        print(row[0])
