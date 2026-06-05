import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user_pfe:password_pfe@localhost:5432/fstm_timetable')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

TARGET_ID = 92  # On vérifie le dernier run

def verify():
    # 1. On récupère le résultat
    res_row = db.execute(text(f"SELECT data FROM timetable_results WHERE id = {TARGET_ID}")).fetchone()
    if not res_row:
        print(f"Erreur : Resultat ID {TARGET_ID} introuvable.")
        return

    timetable_data = res_row[0]
    if isinstance(timetable_data, str):
        timetable_data = json.loads(timetable_data)

    # 2. Récupérer toutes les règles de sanctuarisation depuis la DB
    rules_rows = db.execute(text("SELECT group_id, day, is_morning FROM tp_sanctuarizations")).fetchall()
    # On crée un set pour une recherche rapide: (group_id, day_upper, is_morning)
    rules_set = { (r[0], r[1].upper(), r[2]) for r in rules_rows }

    # 3. Mappings nécessaires
    ts_rows = db.execute(text("SELECT id, day, start_time FROM timeslots")).fetchall()
    ts_map = {r[0]: (r[1].upper(), int(str(r[2]).split(':')[0]) < 13) for r in ts_rows}

    tg_rows = db.execute(text("SELECT id, name FROM td_groups")).fetchall()
    tg_names = {r[0]: r[1] for r in tg_rows}

    mp_rows = db.execute(text("SELECT mp.id, m.name FROM module_parts mp JOIN modules m ON m.id = mp.module_id")).fetchall()
    mp_names = {r[0]: r[1] for r in mp_rows}

    conflicts = []

    # 4. Analyse du planning
    for asgn in timetable_data:
        slot_id = asgn.get('slot_id')
        mp_id = asgn.get('module_part_id')
        if not slot_id or not mp_id: continue
        
        day, is_morning = ts_map.get(slot_id, (None, None))
        if day is None: continue

        # Récupérer les IDs des groupes impliqués
        # Peut être une liste d'objets group ou une liste d'IDs directs
        group_items = asgn.get('td_groups', [])
        tg_ids = []
        for item in group_items:
            if isinstance(item, dict): tg_ids.append(item.get('id'))
            else: tg_ids.append(item)
        
        # Un CM peut impacter tous les groupes de sa section (si non listés explicitement)
        # Mais dans le JSON exporté, la liste est normalement complète.
        
        for gid in tg_ids:
            if (gid, day, is_morning) in rules_set:
                conflicts.append({
                    'group': tg_names.get(gid, f"ID:{gid}"),
                    'module': mp_names.get(mp_id, "Inconnu"),
                    'day': day,
                    'time': "Matin" if is_morning else "Après-midi"
                })

    print("=" * 60)
    print(f"VERIFICATION SANCTUARISATION - RESULTAT ID {TARGET_ID}")
    print(f"Nombre de conflits trouvés : {len(conflicts)}")
    print("=" * 60)

    if not conflicts:
        print("SUCCESS TOTAL : Toutes les sanctuarisations ont été respectées !")
    else:
        for c in conflicts[:15]:
            print(f"CONFLIT: {c['group']} | {c['module']} | {c['day']} {c['time']}")
        if len(conflicts) > 15:
            print(f"... et {len(conflicts)-15} autres.")

if __name__ == "__main__":
    verify()
    db.close()
