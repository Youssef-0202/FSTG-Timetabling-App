from abc import ABC, abstractmethod
from typing import Dict
from core.models import Module, Room, Timeslot
from core.solution import Timetable
from core.fitness import FitnessCalculator

class BaseSolver(ABC):
    """Classe de base abstraite pour tous les algorithmes de Timetabling."""

    def __init__(self, modules: Dict[str, Module], rooms: Dict[str, Room], 
                 slots: Dict[int, Timeslot], fitness_calculator: FitnessCalculator):
        self.modules = modules
        self.rooms = rooms
        self.slots = slots
        self.fitness_calculator = fitness_calculator

    @abstractmethod
    def solve(self, **kwargs) -> Timetable:
        """Méthode principale à implémenter par chaque algorithme."""
        pass
