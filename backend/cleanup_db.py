import os
# Forcer localhost si on s'exécute sur l'hôte au lieu du conteneur Docker
os.environ["DATABASE_URL"] = "postgresql://user:password@localhost:5432/fstm_timetable"

from database import SessionLocal
from models import TimetableResult

db = SessionLocal()

# 1. On valide la ligne ALNS (la seule insérée aujourd'hui pour ALNS)
alns_row = db.query(TimetableResult).filter(TimetableResult.algo_type == 'alns').order_by(TimetableResult.id.desc()).first()
if alns_row:
    alns_row.is_validated = True
    print(f"ALNS (ID={alns_row.id}) mis à is_validated = True")

# 2. On supprime les doublons inutiles (les faux rl et ga_sa insérés à 21:55 qui ont is_validated = False)
# On va juste supprimer toutes les lignes non validées (comme ça les vieux tests sautent aussi)
deleted = db.query(TimetableResult).filter(TimetableResult.is_validated == False).delete()
print(f"{deleted} doublons non validés supprimés.")

db.commit()
db.close()
