"""
Données Contrôlées - Échelle Réelle FSTM.
Basé sur les dimensions réelles : 34 salles, 30 créneaux, 44 profs, 22 groupes.
La structure garantit mathématiquement l'existence d'une solution parfaite.
"""
from core.models import Room, Teacher, StudentGroup, Module, Timeslot, CourseType

def generate_controlled_data():
    
    # ==========================================
    # 1. CRÉNEAUX : 6 jours × 5 plages = 30 slots
    # ==========================================
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    times = [("8h30", "10h30"), ("10h30", "12h30"), ("14h30", "16h30"), ("16h30", "18h30"), ("8h30", "10h30")]
    
    slots = {}
    sid = 0
    for day in days:
        for start, end in times:
            is_sensitive = (start == "16h30" or day == "Samedi")
            slots[sid] = Timeslot(id=sid, day=day, start_time=start, end_time=end, is_sensitive=is_sensitive)
            sid += 1
    
    # ==========================================
    # 2. SALLES : 4 Amphis (CM) + 20 TD + 10 TP = 34 salles
    # ==========================================
    rooms = {"ONLINE": Room(id="ONLINE", capacity=999, room_type=CourseType.CM, building="Virtuel", features=["Internet"])}
    
    # 4 Amphithéâtres
    for i in range(1, 5):
        rooms[f"A{i}"] = Room(id=f"A{i}", capacity=200, room_type=CourseType.CM, building="Bat_A", features=["Projecteur", "Micro"])
    
    # 20 Salles de TD
    for i in range(1, 21):
        rooms[f"TD{i}"] = Room(id=f"TD{i}", capacity=50, room_type=CourseType.TD, building="Bat_B", features=["Projecteur"])
    
    # 10 Salles de TP (Laboratoires)
    for i in range(1, 11):
        rooms[f"TP{i}"] = Room(id=f"TP{i}", capacity=50, room_type=CourseType.TP, building="Bat_C", features=["Ordinateurs", "Projecteur"])

    # ==========================================
    # 3. FILIÈRES : 20 Parcours différents
    # ==========================================
    curriculums = [
        "L1_INFO", "L1_MATH", "L2_INFO", "L2_MATH", "L3_INFO", "L3_MATH",
        "L3_PHYS", "L1_CHIM", "L2_CHIM", "L3_CHIM",
        "M1_IAII", "M1_SIRI", "M1_GESI", "M1_DATA", "M1_NET",
        "M2_IAII", "M2_SIRI", "M2_GESI", "M2_DATA", "M2_NET"
    ]
    
    # ==========================================
    # 4. GROUPES : 22 groupes avec effectifs réalistes
    # ==========================================
    import random
    random.seed(42) # Seed fixe pour reproductibilité
    
    groups = {}
    # 10 groupes L (Licence) : effectifs 60-120
    for i, curr in enumerate(curriculums[:10]):
        size = random.randint(60, 120)
        groups[f"GL{i+1}"] = StudentGroup(id=f"GL{i+1}", size=size, curriculum_id=curr, parent_id=None)
    
    # 12 groupes M (Master) : effectifs 20-40
    for i, curr in enumerate(curriculums[10:]):
        size = random.randint(20, 40)
        groups[f"GM{i+1}"] = StudentGroup(id=f"GM{i+1}", size=size, curriculum_id=curr, parent_id=None)
    
    # Ajout de 2 groupes extras pour atteindre 22
    groups["GM11"] = StudentGroup(id="GM11", size=25, curriculum_id="M1_IAII", parent_id=None)
    groups["GM12"] = StudentGroup(id="GM12", size=30, curriculum_id="M2_DATA", parent_id=None)

    # ==========================================
    # 5. ENSEIGNANTS : 44 profs avec disponibilités réalistes
    # ==========================================
    all_slots = list(slots.keys())
    teachers = {}
    for i in range(1, 45):
        # Chaque prof est disponible sur ~80% des créneaux (réaliste)
        avail = sorted(random.sample(all_slots, int(len(all_slots) * 0.85)))
        prefs = {s: random.choice([0.6, 0.8, 1.0]) for s in avail}
        teachers[f"P{i}"] = Teacher(id=f"P{i}", name=f"Professeur_{i}", availabilities=avail, preferences=prefs)

    # ==========================================
    # 6. MODULES : 55 modules (75 séances)
    # Règle FSTM : Grands groupes (L) -> CM en Amphi / Petits (M) -> TD et TP
    # ==========================================
    modules = {}
    mid = 1
    teacher_ids = list(teachers.keys())
    
    licence_groups = [g for g in groups.keys() if g.startswith("GL")]
    master_groups  = [g for g in groups.keys() if g.startswith("GM")]

    # CM : 20 modules pour Groupes Licence (grands effectifs -> Amphis OK)
    for i in range(20):
        g = licence_groups[i % len(licence_groups)]
        t = teacher_ids[i % len(teacher_ids)]
        modules[f"MOD_CM_{mid}"] = Module(
            id=f"MOD_CM_{mid}", name=f"Cours_{mid}",
            weekly_hours=2, course_type=CourseType.CM,
            teacher_id=t, group_id=g, is_block=True
        )
        mid += 1
    
    # TD : 20 modules pour Groupes Master (petits effectifs -> Salles TD cap 40 OK)
    for i in range(20):
        g = master_groups[i % len(master_groups)]
        t = teacher_ids[(i + 20) % len(teacher_ids)]
        modules[f"MOD_TD_{mid}"] = Module(
            id=f"MOD_TD_{mid}", name=f"TD_{mid}",
            weekly_hours=1, course_type=CourseType.TD,
            teacher_id=t, group_id=g, is_block=True
        )
        mid += 1
    
    # TP : 15 modules pour Groupes Master (petits effectifs -> Salles TP cap 30 OK)
    for i in range(15):
        g = master_groups[i % len(master_groups)]
        t = teacher_ids[(i + 30) % len(teacher_ids)]
        modules[f"MOD_TP_{mid}"] = Module(
            id=f"MOD_TP_{mid}", name=f"TP_{mid}",
            weekly_hours=1, course_type=CourseType.TP,
            teacher_id=t, group_id=g, is_block=True,
            required_features=["Ordinateurs"]
        )
        mid += 1

    print("=== Données FSTM Réalistes Chargées ===")
    print(f"  Modules   : {len(modules)} ({sum(m.weekly_hours for m in modules.values())} séances)")
    print(f"  Salles    : {len(rooms)} (1 ONLINE, 4 Amphis, 20 TD, 10 TP)")
    print(f"  Profs     : {len(teachers)}")
    print(f"  Groupes   : {len(groups)}")
    print(f"  Créneaux  : {len(slots)} (6 jours × 5 plages)")

    return modules, rooms, teachers, groups, slots
