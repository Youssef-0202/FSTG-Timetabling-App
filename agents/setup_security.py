import psycopg2
import os

# Paramètres admin (propriétaire de la DB) nécessaires pour accorder les droits
DB_HOST = "localhost"
DB_PORT = "5432"
DB_USER = "user_pfe"
DB_PASSWORD = "password_pfe"
DB_DBNAME = "fstm_timetable"

# Paramètres du nouvel utilisateur Agent (Lecture seule)
AGENT_USER = "agent_pfe"
AGENT_PASSWORD = "agent_password"

def setup_read_only_user():
    print(f"Connexion à PostgreSQL en tant qu'admin pour créer l'utilisateur '{AGENT_USER}'...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_DBNAME
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # 1. Vérifier si l'utilisateur existe déjà
        cursor.execute(f"SELECT 1 FROM pg_roles WHERE rolname='{AGENT_USER}';")
        user_exists = cursor.fetchone()

        if not user_exists:
            print(f"Création de l'utilisateur '{AGENT_USER}'...")
            cursor.execute(f"CREATE USER {AGENT_USER} WITH PASSWORD '{AGENT_PASSWORD}';")
        else:
            print(f"L'utilisateur '{AGENT_USER}' existe déjà. Mise à jour de son mot de passe...")
            cursor.execute(f"ALTER USER {AGENT_USER} WITH PASSWORD '{AGENT_PASSWORD}';")

        # 2. Accorder les privilèges de base en lecture seule
        print("Attribution des droits de connexion à la base...")
        cursor.execute(f"GRANT CONNECT ON DATABASE {DB_DBNAME} TO {AGENT_USER};")
        
        print("Attribution des droits d'usage sur le schéma public...")
        cursor.execute(f"GRANT USAGE ON SCHEMA public TO {AGENT_USER};")
        
        print("Attribution des droits SELECT sur toutes les tables et vues existantes...")
        cursor.execute(f"GRANT SELECT ON ALL TABLES IN SCHEMA public TO {AGENT_USER};")
        
        print("Attribution des droits SELECT par défaut pour les futures tables...")
        cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO {AGENT_USER};")

        print("🎉 L'utilisateur '{AGENT_USER}' est configuré avec succès en lecture seule !")

    except psycopg2.Error as e:
        print(f"Une erreur PostgreSQL est survenue lors de la sécurisation : {e}")
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    setup_read_only_user()
