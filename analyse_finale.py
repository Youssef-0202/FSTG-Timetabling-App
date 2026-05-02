import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager
import json

dm = DataManager()
dm.fetch_all_data()

with open("backend/generated_timetable.json", "r", encoding="utf-8") as f:
    timetable = json.load(f)

# Count
total = len(timetable)
slot_map = {s.id: s for s in dm.timeslots}

print(f"Total seances planifiees: {total}")

# Read final result from last solver output
print("\n=== ANALYSE DES CONFLITS (AUTOPSY) ===")
with open("result_autopsy.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

h3_sec = [l for l in lines if "[H3 SECTION]" in l]
h13_fil = [l for l in lines if "[H13/14 FILIERE]" in l]
h1_prof = [l for l in lines if "[H1 PROF]" in l]
h2_room = [l for l in lines if "[H2 ROOM]" in l]
h3_grp = [l for l in lines if "[H3 GROUP]" in l]
h4_cap = [l for l in lines if "[H4_CAP]" in l]
h9_unavail = [l for l in lines if "[H9 UNAVAIL]" in l]
h10_type = [l for l in lines if "[H10 ROOMTYPE]" in l]
h12_sat = [l for l in lines if "[H12 SATURDAY]" in l]

print(f"H1 Conflit Prof      : {len(h1_prof)}")
print(f"H2 Conflit Salle     : {len(h2_room)}")
print(f"H3 Chevauchement Gr  : {len(h3_grp)}")
print(f"H3 Chevauchement Sec : {len(h3_sec)}")
print(f"H13/14 Filiere       : {len(h13_fil)}")
print(f"H4 Capacite          : {len(h4_cap)}")
print(f"H9 Indisponibilite   : {len(h9_unavail)}")
print(f"H10 Type de Salle    : {len(h10_type)}")
print(f"H12 CM Samedi        : {len(h12_sat)}")
total_hard = len(h1_prof)+len(h2_room)+len(h3_grp)+len(h3_sec)+len(h13_fil)+len(h4_cap)+len(h9_unavail)+len(h10_type)+len(h12_sat)
print(f"\nTotal violations autopsy: {total_hard}")
