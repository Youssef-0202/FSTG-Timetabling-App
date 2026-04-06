from typing import Dict, List, Set, Tuple
from collections import defaultdict
from models import Timetable, Course, Room, Curriculum, Timeslot

class ITCFitness:
    """
    Évaluateur Objectif et Indépendant des scores ITC-2007 (Track 3)
    Utilisé pour calculer les pénalités (Soft) et les conflits (Hard).
    """
    def __init__(self, courses: Dict[str, Course], rooms: Dict[str, Room], curricula: Dict[str, Curriculum], slots: List[Timeslot], unavailabilities: List[Tuple[str, int, int]]):
        self.courses = courses
        self.rooms = rooms
        self.curricula = curricula
        self.slots = {s.slot_id: s for s in slots}
        self.unavailabilities = unavailabilities
        
        # Dictionnaire pour la recherche rapide des dates/heures interdites
        self.unavail_set = set(unavailabilities) 

    def calculate_total_penalty(self, timetable: Timetable) -> int:
        """
        Calcule la pénalité Soft officielle (Objective Function) ITC-2007
        Attention : Ceci n'a de sens que si count_hard_conflicts() == 0 !!!
        """
        return (
            self.calc_room_capacity(timetable) +
            self.calc_min_working_days(timetable) +
            self.calc_curriculum_compactness(timetable) +
            self.calc_room_stability(timetable)
        )
        
    def count_hard_conflicts(self, timetable: Timetable) -> int:
        """
        Compte les Conflits (Violations Hard ITC-2007)
        - H2 : RoomOccupancy (Une salle = 1 cours max à un temps t)
        - H3 : Conflicts (Un prof ou un cursus ne peut pas être à deux endroits à un temps t)
        - H4 : Availabilities (Professeur indisponible)
        """
        conflicts = 0
        
        room_usage = defaultdict(list)
        teacher_usage = defaultdict(list)
        curriculum_usage = defaultdict(list)
        
        for a in timetable.assignments:
            slot = self.slots[a.slot_id]
            course = self.courses[a.course_id]
            
            room_usage[(a.slot_id, a.room_id)].append(a)
            teacher_usage[(a.slot_id, course.teacher_id)].append(a)
            
            for cur_id in course.curriculum_ids:
                curriculum_usage[(a.slot_id, cur_id)].append(a)
                
            # Check H4 (Disponibilité / Indisponibilité)
            if (course.course_id, slot.day, slot.period) in self.unavail_set:
                conflicts += 1

        # H2 / H3 : Si plusieurs cours tombent dans le même groupe (Salle, Prof, Curriculum), c'est un conflit
        conflicts += sum(len(lst) - 1 for lst in room_usage.values() if len(lst) > 1)
        conflicts += sum(len(lst) - 1 for lst in teacher_usage.values() if len(lst) > 1)
        conflicts += sum(len(lst) - 1 for lst in curriculum_usage.values() if len(lst) > 1)

        return conflicts

    # -----------------------------------------------------------------------------------
    # SOFT CONSTRAINTS (ITC-2007 Penalty Metrics)
    # -----------------------------------------------------------------------------------

    def calc_room_capacity(self, timetable: Timetable) -> int:
        """S1 : Pénalité = Nb d'étudiants au-dessus de la capacité de la salle."""
        penalty = 0
        for a in timetable.assignments:
            course = self.courses[a.course_id]
            room = self.rooms[a.room_id]
            if course.num_students > room.capacity:
                penalty += (course.num_students - room.capacity) # 1 pt par étudiant en trop
        return penalty

    def calc_min_working_days(self, timetable: Timetable) -> int:
        """S2 : Pénalité = 5 pts par 'jour manquant' par rapport au contrat MinWorkingDays."""
        penalty = 0
        course_days = defaultdict(set)
        
        for a in timetable.assignments:
            course_days[a.course_id].add(self.slots[a.slot_id].day)
            
        for cid, course in self.courses.items():
            days_count = len(course_days[cid])
            if days_count < course.min_working_days:
                penalty += 5 * (course.min_working_days - days_count)
        return penalty

    def calc_curriculum_compactness(self, timetable: Timetable) -> int:
        """S3 : Pénalité = 2 pts par séance 'isolée' (un trou pour les étudiants d'un cursus)."""
        penalty = 0
        
        for curr_id, curr in self.curricula.items():
            periods_by_day = defaultdict(set)
            
            for a in timetable.assignments:
                if a.course_id in curr.course_ids:
                    s = self.slots[a.slot_id]
                    periods_by_day[s.day].add(s.period)
                    
            for day, periods in periods_by_day.items():
                for p in periods:
                    # Un cours est "Isolé" s'il n'y a ni cours à (Heure-1) ni à (Heure+1)
                    if (p-1 not in periods) and (p+1 not in periods):
                        penalty += 2
        return penalty

    def calc_room_stability(self, timetable: Timetable) -> int:
        """S4 : Pénalité = 1 pt par salle supplémentaire (idéal = tout le module dans la même salle)."""
        penalty = 0
        course_rooms = defaultdict(set)
        
        for a in timetable.assignments:
            course_rooms[a.course_id].add(a.room_id)
            
        for cid, rooms in course_rooms.items():
            if len(rooms) > 1:
                penalty += (len(rooms) - 1)
        return penalty
