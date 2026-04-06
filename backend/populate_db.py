"""
populate_db.py
==============
Réinitialise la base de données (drop + create tables).
NE CRÉE AUCUNE DONNÉE — toutes les données réelles sont dans populate_from_pdf.py
"""
from database import SessionLocal, engine
import models

def reset_db():
    print("🔄 Suppression de toutes les tables...")
    models.Base.metadata.drop_all(bind=engine)
    print("✅ Tables supprimées.")
    
    print("🔄 Création du nouveau schéma...")
    models.Base.metadata.create_all(bind=engine)
    print("✅ Schéma créé. Base de données vide et prête.")

if __name__ == "__main__":
    reset_db()
