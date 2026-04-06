from dataclasses import dataclass, field
from typing import List, Optional
from .models import Modality

@dataclass(eq=True)
class Assignment:
    """
    Représente une affectation complète (x = 1).
    Comme le Module possède déjà le TeacherID et le GroupID, 
    ces 4 champs suffisent à décrire l'affectation 6D.
    """
    module_id: str
    slot_id: int
    room_id: str
    modality: Modality = Modality.F2F
    is_locked: bool = False  # Implémentation directe de H12 (Locking)

    def copy(self):
        """Version ultra-rapide de deepcopy"""
        return Assignment(
            module_id=self.module_id,
            slot_id=self.slot_id,
            room_id=self.room_id,
            modality=self.modality,
            is_locked=self.is_locked
        )

@dataclass
class Timetable:
    """
    Représente une solution complète (un emploi du temps hebdomadaire).
    C'est l'objet qui sera évalué par la Fitness Function.
    """
    assignments: List[Assignment] = field(default_factory=list)

    def add_assignment(self, assignment: Assignment):
        self.assignments.append(assignment)

    def get_assignment_by_module(self, module_id: str) -> List[Assignment]:
        return [a for a in self.assignments if a.module_id == module_id]

    def copy(self):
        """Clone ultra-rapide sans passer par le module 'copy'"""
        new_t = Timetable()
        new_t.assignments = [a.copy() for a in self.assignments]
        return new_t
