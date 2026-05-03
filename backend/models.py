from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Table, Time, JSON
from sqlalchemy.orm import relationship
from database import Base

# =============================================================================
# TABLES D'ASSOCIATION (Many-to-Many)
# =============================================================================

# M:M : Quels GroupeFiliere composent une Section (pour CM partagé)
section_groupes = Table(
    "section_groupes",
    Base.metadata,
    Column("section_id", Integer, ForeignKey("sections.id"), primary_key=True),
    Column("groupe_id", Integer, ForeignKey("groupe_filieres.id"), primary_key=True),
)

# M:N : Quels GroupeFiliere sont inscrits dans le GroupeModule global
groupe_module_groupes = Table(
    "groupe_module_groupes",
    Base.metadata,
    Column("groupe_module_id", Integer, ForeignKey("groupe_modules.id"), primary_key=True),
    Column("groupe_id", Integer, ForeignKey("groupe_filieres.id"), primary_key=True),
)

# M:M : Quels TDGroup participent à une séance TD/TP (Assignment)
assignment_tdgroups = Table(
    "assignment_tdgroups",
    Base.metadata,
    Column("assignment_id", Integer, ForeignKey("assignments.id"), primary_key=True),
    Column("tdgroup_id", Integer, ForeignKey("td_groups.id"), primary_key=True),
)

# =============================================================================
# PARTIE 1 : STRUCTURE PÉDAGOGIQUE
# =============================================================================

class Department(Base):
    """Département académique (Informatique, Chimie, Biologie...)"""
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # ex: "Informatique"

    filieres = relationship("Filiere", back_populates="department")
    modules = relationship("Module", back_populates="department")


class Filiere(Base):
    """
    Filière de spécialité.
    Ex: GI, GP, MSD, GC, GESE, GB, GEG.
    Rattachée à un Département.
    """
    __tablename__ = "filieres"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)         # ex: "GI", "GP", "MSD"
    type = Column(String)                     # "TC", "LST", "MST", "CI"
    dept_id = Column(Integer, ForeignKey("departments.id"))

    department = relationship("Department", back_populates="filieres")
    groupes = relationship("GroupeFiliere", back_populates="filiere")


class GroupeFiliere(Base):
    """
    Cohorte = Filière × Semestre. C'est l'unité réelle d'inscription.
    Ex: GI-S1 (120 étudiants), GP-S3 (80 étudiants).
    Les modules sont rattachés à cette entité avec nbr_inscrits.
    """
    __tablename__ = "groupe_filieres"
    id = Column(Integer, primary_key=True, index=True)
    filiere_id = Column(Integer, ForeignKey("filieres.id"))
    semestre = Column(String)           # "S1", "S2", "S3", "S4", "S5", "S6"
    academic_year = Column(String)      # "2025-2026"
    total_students = Column(Integer)    # Effectif total du groupe

    filiere = relationship("Filiere", back_populates="groupes")
    groupe_modules = relationship("GroupeModule", secondary=groupe_module_groupes, back_populates="groupes")
    sections = relationship("Section", secondary=section_groupes, back_populates="groupes")


# =============================================================================
# PARTIE 2 : MODULES ET COMPOSANTES
# =============================================================================

class Module(Base):
    """
    Module académique (matière).
    Ex: "Bases de Données", "Thermodynamique Mécanique du Fluide".
    Lié à un département et à plusieurs cohortes (GroupeFiliere).
    """
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)  # ex: "INF301"
    dept_id = Column(Integer, ForeignKey("departments.id"))

    department = relationship("Department", back_populates="modules")
    parts = relationship("ModulePart", back_populates="module")
    groupe_module = relationship("GroupeModule", back_populates="module", uselist=False)


class ModulePart(Base):
    """
    Composante pédagogique d'un module : CM, TD ou TP.
    Définit le type de séance et le type de salle requis.
    """
    __tablename__ = "module_parts"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    type = Column(String)               # "CM", "TD", "TP"
    weekly_hours = Column(Float)        # Heures hebdomadaires
    required_room_type = Column(String) # "AMPHI", "SALLE_TD", "SALLE_TP"

    module = relationship("Module", back_populates="parts")
    assignments = relationship("Assignment", back_populates="module_part")


class GroupeModule(Base):
    """
    1:1 avec Module. Le pool total d'étudiants inscrits à ce module.
    (Ex: Le GroupeModule "Bases de Données" a 215 inscrits au total = GI S1 + GP S1 + Redoublants S3).
    """
    __tablename__ = "groupe_modules"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), unique=True, index=True)
    effectif = Column(Integer)  # Le nombre total d'inscrits dictant la capacité requise

    module = relationship("Module", back_populates="groupe_module")
    groupes = relationship("GroupeFiliere", secondary=groupe_module_groupes, back_populates="groupe_modules")


# =============================================================================
# PARTIE 3 : SECTIONS ET GROUPES TD (Timetabling)
# =============================================================================

class Section(Base):
    """
    Regroupement de plusieurs GroupeFiliere partageant le même CM.
    Ex: "GP-GI S1" = fusion de GI-S1 + GP-S1 pour le CM en Amphi.
    C'est l'unité de base de l'emploi du temps pour les cours magistraux.
    """
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)       # ex: "GP-GI S1", "GC-GESE-MSD S2"
    semestre = Column(String)              # "S1", "S2"...
    total_capacity = Column(Integer)        # Somme des effectifs des GroupeFiliere

    groupes = relationship("GroupeFiliere", secondary=section_groupes, back_populates="sections")
    td_groups = relationship("TDGroup", back_populates="section")
    assignments = relationship("Assignment", back_populates="section")


class TDGroup(Base):
    """
    Groupe de TD/TP : subdivision d'une Section pour les séances pratiques.
    Ex: "Gr 1 S25", "Gr 2 S25", "Gr 3 S26".
    (S25, S26 = numéros de sections dans l'emploi du temps réel FSTG)
    """
    __tablename__ = "td_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)       # ex: "Gr 1 S25"
    section_id = Column(Integer, ForeignKey("sections.id"))
    size = Column(Integer)                  # Effectif du groupe (30-50 étudiants)

    section = relationship("Section", back_populates="td_groups")
    assignments = relationship("Assignment", secondary=assignment_tdgroups, back_populates="td_groups")


# =============================================================================
# PARTIE 4 : RESSOURCES PHYSIQUES
# =============================================================================

class Teacher(Base):
    """Enseignant avec ses disponibilités hebdomadaires (JSON)."""
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True)
    availabilities = Column(JSON)   # {"Lundi": ["08:30-10:25", "14:30-16:25"], ...}

    assignments = relationship("Assignment", back_populates="teacher")


class Room(Base):
    """Salle physique avec son type et sa capacité."""
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # ex: "Amphi 4", "Salle TD-B3"
    capacity = Column(Integer)
    type = Column(String)   # "AMPHI", "SALLE_TD", "SALLE_TP"

    assignments = relationship("Assignment", back_populates="room")


class Timeslot(Base):
    """Créneau horaire hebdomadaire."""
    __tablename__ = "timeslots"
    id = Column(Integer, primary_key=True, index=True)
    day = Column(String)        # "Lundi", "Mardi", ...
    start_time = Column(Time)   # 08:30
    end_time = Column(Time)     # 10:25

    assignments = relationship("Assignment", back_populates="timeslot")


# =============================================================================
# PARTIE 5 : TABLE CENTRALE — ASSIGNMENT (L'emploi du temps)
# =============================================================================

class Assignment(Base):
    """
    Séance planifiée dans l'emploi du temps.
    
    - Pour un CM : section_id est renseigné (toute la section en Amphi).
    - Pour un TD/TP : section_id est NULL, les TDGroups sont dans assignment_tdgroups.
    - is_locked = True → Type 1 (fixé manuellement, intouchable par l'algo).
    - is_locked = False → Type 2 (laissé à l'algorithme d'optimisation).
    """
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    module_part_id = Column(Integer, ForeignKey("module_parts.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    slot_id = Column(Integer, ForeignKey("timeslots.id"))
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)  # Pour les CM
    is_locked = Column(Boolean, default=False)

    module_part = relationship("ModulePart", back_populates="assignments")
    teacher = relationship("Teacher", back_populates="assignments")
    room = relationship("Room", back_populates="assignments")
    timeslot = relationship("Timeslot", back_populates="assignments")
    section = relationship("Section", back_populates="assignments")
    td_groups = relationship("TDGroup", secondary=assignment_tdgroups, back_populates="assignments")


# =============================================================================
# PARTIE 6 : ARCHIVAGE ET RÉSULTATS
# =============================================================================

class TimetableResult(Base):
    """
    Stocke le résultat d'un run du solveur (une solution complète).
    Permet de garder une trace de chaque tentative et de valider la meilleure.
    """
    __tablename__ = "timetable_results"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(String)     # Date et heure de génération (ISO)
    score_hard = Column(Integer)    # Nombre de violations Hard (Cible 0)
    score_soft = Column(Float)      # Score de qualité Soft
    data = Column(JSON)             # La liste complète des affectations (JSON)
    is_validated = Column(Boolean, default=False) # True si l'admin a validé cet EDT
