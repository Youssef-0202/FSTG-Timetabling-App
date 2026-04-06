import random
from typing import Dict, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Room, Teacher, StudentGroup, Module, Timeslot, CourseType

def generate_mock_data() -> Tuple[Dict[str, Module], Dict[str, Room], Dict[str, Teacher], Dict[str, StudentGroup], Dict[int, Timeslot]]:
    """
    Génère de fausses données (Mock Data) pour tester l'algorithme sans base de données réelle.
    """
    
    # 1. Génération des Créneaux Horaires (Timeslots)
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    slots_per_day = 4  # 4 blocs de 2h (ex: 8h-10h, 10h-12h, 14h-16h, 16h-18h)
    
    slots = {}
    slot_id = 0
    for day in days:
        for i in range(slots_per_day):
            # Le samedi et le soir tard sont considérés comme "sensibles" (Ps3)
            is_sensitive = True if (day == "Samedi" or i == 3) else False
            slots[slot_id] = Timeslot(id=slot_id, day=day, start_time=f"{8+i*2}h00", end_time=f"{10+i*2}h00", is_sensitive=is_sensitive)
            slot_id += 1
            
    # 2. Génération des Salles (Rooms)
    rooms = {}
    # Ajout de la salle virtuelle pour tester H8 (Cours en ligne)
    rooms["ONLINE"] = Room(id="ONLINE", capacity=999, room_type=CourseType.CM, building="Virtuel", features=["Internet"])
    
    for i in range(1, 11): # 10 salles : 3 Amphis, 4 Salles TD, 3 Salles TP
        r_type = CourseType.CM if i <= 3 else (CourseType.TP if i >= 8 else CourseType.TD)
        cap = 100 if r_type == CourseType.CM else (40 if r_type == CourseType.TP else 40)
        features = ["Projecteur"] if r_type != CourseType.TP else ["Ordinateurs", "Projecteur"]
        rooms[f"R{i}"] = Room(id=f"R{i}", capacity=cap, room_type=r_type, building="Bat_A", features=features)

    # 3. Génération des Groupes avec des Filières DIFFÉRENTES (sinon H10 bloque mathématiquement)
    groups = {}
    curriculums = ["L3_INFO", "M1_IAII", "M2_DATA"]
    for i in range(1, 4):
        groups[f"G{i}"] = StudentGroup(id=f"G{i}", size=random.randint(20, 35), curriculum_id=curriculums[i-1], parent_id=None)

    # 4. Génération des Enseignants (Teachers)
    teachers = {}
    for i in range(1, 6): # 5 profs
        avail = list(range(len(slots))) 
        if random.random() > 0.5: # 50% des profs sont absents sur certains créneaux (H9)
            avail = random.sample(avail, int(len(slots) * 0.8))
        
        # Génération des préférences (S4) - Score de 0.5 (moyen) à 1.0 (parfait)
        prefs = {slot: random.choice([0.5, 0.8, 1.0]) for slot in avail}
        
        teachers[f"T{i}"] = Teacher(id=f"T{i}", name=f"Prof_{i}", availabilities=avail, preferences=prefs)

    # 5. Génération des Modules (Cours)
    modules = {}
    for i in range(1, 16): # 15 cours
        t_id = f"T{random.randint(1, 5)}"
        g_id = f"G{random.randint(1, 3)}"
        c_type = random.choice(list(CourseType))
        hours = random.choice([2, 4]) # 2h ou 4h par semaine (H7)
        req_feat = ["Ordinateurs"] if c_type == CourseType.TP else []
        
        modules[f"M{i}"] = Module(id=f"M{i}", name=f"Module_{i}", weekly_hours=hours, 
                                  course_type=c_type, required_features=req_feat, 
                                  teacher_id=t_id, group_id=g_id, is_block=True)

    return modules, rooms, teachers, groups, slots
