from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- Assignments for S2 Sections ---")
    res = conn.execute(text("""
        SELECT s.name, count(*) 
        FROM assignments a 
        JOIN sections s ON a.section_id = s.id 
        WHERE s.semestre = 'S2'
        GROUP BY s.name
    """)).fetchall()
    for row in res:
        print(f"{row[0]}: {row[1]}")
