import psycopg2
import os

# Paramètres de connexion PostgreSQL
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "user_pfe")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password_pfe")
DB_DBNAME = os.getenv("DB_NAME", "fstm_timetable")

def create_views():
    print(f"Connexion à la base de données PostgreSQL: {DB_DBNAME} sur {DB_HOST}:{DB_PORT}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER,
            password=DB_PASSWORD, dbname=DB_DBNAME
        )
        cursor = conn.cursor()

        # ── VUE 1 : Planning détaillé depuis le Master Reference (timetable_results) ──
        # Le champ 'data' est un JSONB contenant une liste d'affectations.
        # Chaque affectation a (module_part_id, teacher_id, room_id, slot_id, section_id).
        # On utilise jsonb_array_elements() pour déplier le tableau JSON, 
        # puis on JOIN avec les tables relationnelles pour résoudre les IDs en noms lisibles.
        create_planning_view = """
        CREATE OR REPLACE VIEW v_planning_details AS
        SELECT
            (asgn->>'id')::INTEGER                     AS assignment_id,
            m.name                                      AS module_name,
            m.code                                      AS module_code,
            mp.type                                     AS course_type,
            t.name                                      AS teacher_name,
            r.name                                      AS room_name,
            r.capacity                                  AS room_capacity,
            ts.day                                      AS day_of_week,
            ts.start_time                               AS start_time,
            ts.end_time                                 AS end_time,
            s.name                                      AS section_name,
            FALSE                                       AS is_locked_by_admin
        FROM timetable_results tr,
             jsonb_array_elements(tr.data::jsonb) AS asgn
        JOIN module_parts mp  ON mp.id  = (asgn->>'module_part_id')::INTEGER
        JOIN modules      m   ON m.id   = mp.module_id
        JOIN teachers     t   ON t.id   = (asgn->>'teacher_id')::INTEGER
        JOIN rooms        r   ON r.id   = (asgn->>'room_id')::INTEGER
        JOIN timeslots    ts  ON ts.id  = (asgn->>'slot_id')::INTEGER
        LEFT JOIN sections s  ON s.id   = (asgn->>'section_id')::INTEGER
        WHERE tr.is_master_reference = TRUE;
        """

        # ── VUE 2 : Charge de travail des enseignants (depuis le Master Reference) ──
        create_workload_view = """
        CREATE OR REPLACE VIEW v_teacher_workload AS
        SELECT
            t.name                                          AS teacher_name,
            COUNT(*)                                        AS total_sessions,
            SUM(mp.weekly_hours)                            AS total_weekly_hours
        FROM timetable_results tr,
             jsonb_array_elements(tr.data::jsonb) AS asgn
        JOIN teachers    t  ON t.id  = (asgn->>'teacher_id')::INTEGER
        JOIN module_parts mp ON mp.id = (asgn->>'module_part_id')::INTEGER
        WHERE tr.is_master_reference = TRUE
        GROUP BY t.id, t.name;
        """

        print("Création/Remplacement de la vue sémantique : v_planning_details (depuis is_master_reference)...")
        cursor.execute(create_planning_view)

        print("Création/Remplacement de la vue sémantique : v_teacher_workload (depuis is_master_reference)...")
        cursor.execute(create_workload_view)

        conn.commit()
        print("✅ Couche sémantique PostgreSQL (Master Reference) créée avec succès !")

        # Test d'extraction
        cursor.execute("SELECT * FROM v_planning_details LIMIT 3;")
        rows = cursor.fetchall()
        print(f"\nTest v_planning_details (3 premières lignes) — {len(rows)} lignes récupérées :")
        for row in rows:
            print(row)

        cursor.execute("SELECT teacher_name, total_sessions, total_weekly_hours FROM v_teacher_workload LIMIT 5;")
        rows2 = cursor.fetchall()
        print(f"\nTest v_teacher_workload (5 premiers enseignants) :")
        for row in rows2:
            print(row)

    except psycopg2.Error as e:
        print(f"❌ Une erreur PostgreSQL est survenue : {e}")
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    create_views()
