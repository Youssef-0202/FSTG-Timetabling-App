from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import time

# ─── DEPARTMENT ─────────────────────────────────────────────
class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

# ─── FILIERE ────────────────────────────────────────────────
class FiliereBase(BaseModel):
    name: str
    type: str       # "TC", "LST", "MST", "CI"
    dept_id: int

class FiliereCreate(FiliereBase):
    pass

class Filiere(FiliereBase):
    id: int
    class Config:
        from_attributes = True

# ─── GROUPE FILIERE (Anciennement StudentGroup) ─────────────
class GroupeFiliereBase(BaseModel):
    filiere_id: int
    semestre: str
    academic_year: str
    total_students: int

class GroupeFiliereCreate(GroupeFiliereBase):
    pass

class GroupeFiliere(GroupeFiliereBase):
    id: int
    class Config:
        from_attributes = True

# ─── TEACHER ────────────────────────────────────────────────
class TeacherBase(BaseModel):
    name: str
    email: str
    availabilities: Optional[Any] = {}

class TeacherCreate(TeacherBase):
    pass

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    availabilities: Optional[Any] = None

class Teacher(TeacherBase):
    id: int
    class Config:
        from_attributes = True

# ─── ROOM ───────────────────────────────────────────────────
class RoomBase(BaseModel):
    name: str
    capacity: int
    type: str   # AMPHI, SALLE_TD, SALLE_TP

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    type: Optional[str] = None

class Room(RoomBase):
    id: int
    class Config:
        from_attributes = True

# ─── MODULE ─────────────────────────────────────────────────
class ModuleBase(BaseModel):
    name: str
    code: str
    dept_id: int

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    dept_id: Optional[int] = None

class Module(ModuleBase):
    id: int
    class Config:
        from_attributes = True

# ─── MODULE PART ─────────────────────────────────────────────
class ModulePartBase(BaseModel):
    module_id: int
    type: str               # "CM", "TD", "TP"
    weekly_hours: float
    required_room_type: str

class ModulePartCreate(ModulePartBase):
    pass

class ModulePartUpdate(BaseModel):
    module_id: Optional[int] = None
    type: Optional[str] = None
    weekly_hours: Optional[float] = None
    required_room_type: Optional[str] = None

class ModulePart(ModulePartBase):
    id: int
    class Config:
        from_attributes = True

# ─── GROUPE MODULE ──────────────────────────────────────────
class GroupeModuleBase(BaseModel):
    module_id: int
    effectif: int

class GroupeModuleCreate(GroupeModuleBase):
    groupe_ids: List[int] = []

class GroupeModuleUpdate(BaseModel):
    module_id: Optional[int] = None
    effectif: Optional[int] = None
    groupe_ids: Optional[List[int]] = None

class GroupeModule(GroupeModuleBase):
    id: int
    groupes: List[GroupeFiliere] = []
    class Config:
        from_attributes = True

# ─── SECTION ────────────────────────────────────────────────
class SectionBase(BaseModel):
    name: str
    semestre: str
    total_capacity: int

class SectionCreate(SectionBase):
    groupe_ids: List[int] = []

class Section(SectionBase):
    id: int
    groupes: List[GroupeFiliere] = []
    class Config:
        from_attributes = True

# ─── TD GROUP ───────────────────────────────────────────────
class TDGroupBase(BaseModel):
    name: str
    section_id: int
    size: int

class TDGroupCreate(TDGroupBase):
    pass

class TDGroup(TDGroupBase):
    id: int
    class Config:
        from_attributes = True

# ─── TIMESLOT ───────────────────────────────────────────────
class TimeslotBase(BaseModel):
    day: str
    start_time: time
    end_time: time

class TimeslotCreate(TimeslotBase):
    pass

class TimeslotUpdate(BaseModel):
    day: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class Timeslot(TimeslotBase):
    id: int
    class Config:
        from_attributes = True

# ─── ASSIGNMENT ─────────────────────────────────────────────
class AssignmentCreate(BaseModel):
    module_part_id: int
    teacher_id: int
    room_id: Optional[int] = None
    slot_id: Optional[int] = None
    section_id: Optional[int] = None     # Pour les CM
    tdgroup_ids: List[int] = []          # Pour les TD/TP
    is_locked: bool = False

class AssignmentUpdate(BaseModel):
    module_part_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    slot_id: Optional[int] = None
    section_id: Optional[int] = None
    tdgroup_ids: Optional[List[int]] = None
    is_locked: Optional[bool] = None

class Assignment(BaseModel):
    id: int
    module_part_id: int
    teacher_id: int
    room_id: Optional[int] = None
    slot_id: Optional[int] = None
    section_id: Optional[int] = None
    is_locked: bool
    # Pour l'affichage
    td_groups: List[TDGroup] = []
    
    class Config:
        from_attributes = True

# ─── STATS (Dashboard) ──────────────────────────────────────
    total_modules: int
    total_assignments: int
    hard_violations: int

# ─── TIMETABLE RESULT ───────────────────────────────────────
class TimetableResultBase(BaseModel):
    created_at: str
    score_hard: int
    score_soft: float
    data: List[Any]
    is_validated: bool = False

class TimetableResultCreate(TimetableResultBase):
    pass

class TimetableResult(TimetableResultBase):
    id: int
    class Config:
        from_attributes = True
