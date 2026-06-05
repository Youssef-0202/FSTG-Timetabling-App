"""
fix_groupe_modules.py
=====================
Synchronise automatiquement les GroupeModules (Pools d'Inscrits) 
à partir des données déjà présentes dans la table Assignments.

Logique :
  Assignment (module_part_id → module_id) + (section_id → GroupeFiliere[])
    ⟹ Lier le GroupeModule du module aux GroupeFiliere correspondantes
    ⟹ Calculer l'effectif : nb_cohortes × 48 (S4) ou nb_cohortes × 45 (S2)
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user_pfe:password_pfe@localhost:5432/fstm_timetable")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

EFFECTIF_S4 = 48   # Capacité réelle des salles S4
EFFECTIF_S2 = 45   # Effectif estimé par groupe S2 (6 groupes × 45 = 270)

print("=" * 60)
print("  Synchronisation GroupeModules → depuis Assignments")
print("=" * 60)

# ── Step 1 : Récupérer tous les GroupeModules
groupe_modules = db.execute(text("SELECT id, module_id FROM groupe_modules")).fetchall()
print(f"\n📦 {len(groupe_modules)} GroupeModules trouvés.\n")

updated = 0
skipped = 0

for gm in groupe_modules:
    gm_id = gm[0]
    module_id = gm[1]

    # ── Step 2 : Trouver les Assignments liés à ce module (via ModulePart)
    assignments = db.execute(text("""
        SELECT DISTINCT a.section_id
        FROM assignments a
        JOIN module_parts mp ON a.module_part_id = mp.id
        WHERE mp.module_id = :mid AND a.section_id IS NOT NULL
    """), {"mid": module_id}).fetchall()

    if not assignments:
        print(f"  ⚠️  GroupeModule #{gm_id} (module {module_id}) : Aucun Assignment trouvé → ignoré")
        skipped += 1
        continue

    # ── Step 3 : Pour chaque section, récupérer les GroupeFilière liées
    all_filiere_ids = set()
    semestre_hint = "S4"  # On déterminera par la section

    for row in assignments:
        section_id = row[0]

        # Récupérer les GroupeFilière + le semestre de la section
        filieres = db.execute(text("""
            SELECT gf.id, s.semestre
            FROM section_groupes sg
            JOIN groupe_filieres gf ON sg.groupe_id = gf.id
            JOIN sections s ON sg.section_id = s.id
            WHERE sg.section_id = :sid
        """), {"sid": section_id}).fetchall()

        for f in filieres:
            all_filiere_ids.add(f[0])
            semestre_hint = f[1]  # Prend le dernier semestre trouvé

    if not all_filiere_ids:
        print(f"  ⚠️  GroupeModule #{gm_id} : Section trouvée mais aucune Filière liée → ignoré")
        skipped += 1
        continue

    # ── Step 4 : Calculer l'effectif
    nb_cohortes = len(all_filiere_ids)
    if "S4" in semestre_hint or "S3" in semestre_hint:
        effectif = nb_cohortes * EFFECTIF_S4
    else:
        effectif = nb_cohortes * EFFECTIF_S2

    # ── Step 5 : Vider les anciennes liaisons et en créer de nouvelles
    db.execute(text("DELETE FROM groupe_module_groupes WHERE groupe_module_id = :gid"), {"gid": gm_id})

    for fid in all_filiere_ids:
        db.execute(text("""
            INSERT INTO groupe_module_groupes (groupe_module_id, groupe_id)
            VALUES (:gid, :fid)
            ON CONFLICT DO NOTHING
        """), {"gid": gm_id, "fid": fid})

    # ── Step 6 : Mettre à jour l'effectif
    db.execute(text("""
        UPDATE groupe_modules SET effectif = :eff WHERE id = :gid
    """), {"eff": effectif, "gid": gm_id})

    print(f"  ✅  GroupeModule #{gm_id} | Module {module_id} | {nb_cohortes} cohorte(s) | Semestre: {semestre_hint} | Effectif: {effectif}")
    updated += 1

db.commit()
db.close()

print("\n" + "=" * 60)
print(f"  ✅ {updated} GroupeModules mis à jour")
print(f"  ⚠️  {skipped} ignorés (sans Assignment ou sans Section liée)")
print("=" * 60)
