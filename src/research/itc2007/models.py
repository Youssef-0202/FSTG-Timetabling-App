from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple

@dataclass
class Course:
    course_id: str
    teacher_id: str
    num_lectures: int
    min_working_days: int
    num_students: int
    curriculum_ids: List[str] = field(default_factory=list)

@dataclass
class Room:
    room_id: str
    capacity: int

@dataclass
class Curriculum:
    curriculum_id: str
    course_ids: List[str]

@dataclass
class Timeslot:
    day: int
    period: int
    slot_id: int # Identifiant unique (ex: jour * periodes_par_jour + periode)

@dataclass
class Assignment:
    course_id: str
    lecture_index: int # Pour lier plusieurs séances d'un même cours
    slot_id: int
    room_id: str

@dataclass
class Timetable:
    """Représentation d'une solution au problème ITC-2007"""
    assignments: List[Assignment] = field(default_factory=list)
    
    # Utilitaires pour accélérer l'hyper-heuristique
    def get_assignment(self, course_id: str, lecture_index: int) -> Assignment:
        for a in self.assignments:
            if a.course_id == course_id and a.lecture_index == lecture_index:
                return a
        return None
