import sqlite3
import os

DB_PATH = "/app/timetable.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Base de données introuvable à {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Tenter d'ajouter la colonne chef_id
        cursor.execute("ALTER TABLE filieres ADD COLUMN chef_id INTEGER REFERENCES teachers(id);")
        conn.commit()
        print("Migration réussie : Colonne 'chef_id' ajoutée à la table 'filieres'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Information : La colonne 'chef_id' existe déjà.")
        else:
            print(f"Erreur lors de la migration : {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
