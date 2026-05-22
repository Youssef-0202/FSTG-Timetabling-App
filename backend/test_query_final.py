from database import engine
from sqlalchemy import text

f_name = "GEG"
with engine.connect() as conn:
    query = text("""
        SELECT DISTINCT s.name
        FROM public.sections s
        JOIN public.section_groupes sg ON s.id = sg.section_id
        JOIN public.groupe_filieres gf ON sg.groupe_id = gf.id
        CROSS JOIN LATERAL (
            SELECT sg2.section_id FROM public.section_groupes sg2 
            JOIN public.groupe_filieres gf2 ON sg2.groupe_id = gf2.id 
            WHERE gf2.filiere_id = (SELECT id FROM filieres WHERE name = :filiere_name)
        ) ts
        JOIN public.groupe_module_groupes gmg ON gf.id = gmg.groupe_id
        WHERE s.id = ts.section_id
    """)
    res = conn.execute(query, {"filiere_name": f_name}).fetchall()
    for row in res:
        print(row[0])
