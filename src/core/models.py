from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class CourseType(Enum):
    CM = "Cours Magistral"
    TD = "Travaux Dirigés"
    TP = "Travaux Pratiques"

class Modality(Enum):
    F2F = "Présentiel"
    ONLINE = "En ligne"
    HYBRID = "Hybride"

@dataclass(frozen=True, eq=True)
class Room:
    id: str
    capacity: int
    room_type: CourseType
    building: str
    features: List[str] = field(default_factory=list)  # Correspond aux équipements (H5)

@dataclass
class Teacher:
    id: str
    name: str
    # IDs des slots où le prof est dispo (H9)
    availabilities: List[int] = field(default_factory=list) 
    # slot_id -> preference (0.0 à 1.0) (Ps4)
    preferences: Dict[int, float] = field(default_factory=dict) 

@dataclass
class StudentGroup:
    id: str
    size: int
    curriculum_id: str  # Pour gérer les conflits de parcours (H10)
    parent_id: Optional[str] = None # ID de la section parente (pour H3)

@dataclass
class Module:
    id: str
    name: str
    weekly_hours: int   # Correspond à n_m dans H7
    course_type: CourseType
    teacher_id: str
    group_id: str
    is_block: bool = True # (H6) : Indique si le module doit être en bloc de 4h
    required_features: List[str] = field(default_factory=list) # (H5)

@dataclass(frozen=True, eq=True)
class Timeslot:
    id: int
    day: str
    start_time: str
    end_time: str
    is_sensitive: bool = False # Pour Ps3 (créneaux tardifs ou samedi)
