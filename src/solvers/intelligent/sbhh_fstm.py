import random
import time
import copy
import math
from typing import List, Dict, Tuple
from solvers.base_solver import BaseSolver
from core.solution import Timetable, Assignment
from core.models import Modality, Module, Room, Timeslot
from core.fitness import FitnessCalculator

class FSTMLowLevelHeuristics:
    """Heuristiques adaptees aux contraintes de la FSTM (blocs de cours)."""
    def __init__(self, solver: 'SBHHFSTMSolver'):
        self.solver = solver

    def apply(self, heuristic_idx: int, timetable: Timetable) -> Timetable:
        neighbor = copy.deepcopy(timetable)
        module_ids = list(self.solver.modules.keys())
        if not module_ids: return neighbor
        
        mid = random.choice(module_ids)
        module = self.solver.modules[mid]
        slot_ids = list(self.solver.slots.keys())
        
        if heuristic_idx == 0:
            # LLH_0: Changer de salle pour un module entier
            compatible_rooms = [rid for rid, r in self.solver.rooms.items() if r.room_type == module.course_type]
            if compatible_rooms:
                new_room = random.choice(compatible_rooms)
                for a in [x for x in neighbor.assignments if x.module_id == mid]:
                    a.room_id = new_room
            
        elif heuristic_idx == 1:
            # LLH_1: Changer de creneau (Shift) en gardant la consecutivite
            new_start = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
            assignments = [x for x in neighbor.assignments if x.module_id == mid]
            for offset, a in enumerate(assignments):
                a.slot_id = new_start + offset
                
        elif heuristic_idx == 2:
            # LLH_2: Swap de creneaux entre deux modules de meme duree
            mid2 = random.choice(module_ids)
            if mid != mid2:
                a1s = [x for x in neighbor.assignments if x.module_id == mid]
                a2s = [x for x in neighbor.assignments if x.module_id == mid2]
                if len(a1s) == len(a2s) and len(a1s) > 0:
                    s1_start, s2_start = a1s[0].slot_id, a2s[0].slot_id
                    for offset, a in enumerate(a1s): a.slot_id = s2_start + offset
                    for offset, a in enumerate(a2s): a.slot_id = s1_start + offset
                    
        elif heuristic_idx == 3:
            # LLH_3: Optimisation de proximite (reduction de gaps)
            group_id = module.group_id
            other_slots = [
                a.slot_id for a in neighbor.assignments 
                if self.solver.modules[a.module_id].group_id == group_id and a.module_id != mid
            ]
            if other_slots:
                target_slot = random.choice(other_slots)
                new_start = target_slot + 1 if target_slot < max(slot_ids) else target_slot - 1
                if new_start in slot_ids[:-max(module.weekly_hours, 1)]:
                    for offset, a in enumerate([x for x in neighbor.assignments if x.module_id == mid]):
                        a.slot_id = new_start + offset

        return neighbor

class SBHHFSTMSolver(BaseSolver):
    """
    Implementation de la Sequence-Based Hyper-Heuristic adaptee a la FSTM.
    Utilise le moteur de Fitness partage.
    """
    def __init__(self, modules: Dict[str, Module], rooms: Dict[str, Room], 
                 slots: Dict[int, Timeslot], fitness_calculator: FitnessCalculator):
        super().__init__(modules, rooms, slots, fitness_calculator)
        self.llh_manager = FSTMLowLevelHeuristics(self)
        self.N = 4 # Nombre de LLH
        self.trans_scores = [[1.0 for _ in range(self.N)] for _ in range(self.N)]
        self.learning_rate = 0.2

    def select_next_heuristic(self, last_h: int) -> int:
        if last_h == -1: return random.randrange(self.N)
        row_scores = self.trans_scores[last_h]
        total = sum(row_scores)
        r = random.uniform(0, total)
        acc = 0.0
        for j, score in enumerate(row_scores):
            acc += score
            if r <= acc: return j
        return self.N - 1

    def update_matrix(self, last_h: int, current_h: int, delta_fitness: float):
        if last_h == -1: return
        reward = 2.0 if delta_fitness < 0 else (0.01 if delta_fitness > 0 else 0.5)
        old_score = self.trans_scores[last_h][current_h]
        self.trans_scores[last_h][current_h] = max(0.01, old_score * (1 - self.learning_rate) + reward * self.learning_rate)

    def solve(self, max_iterations=10000, callback=None) -> Timetable:
        print(f"[SBHH] Lancement de la resolution ({max_iterations} iterations)...")
        start_time = time.time()
        
        # 1. Generation d'une solution initiale
        current_sol = self._create_initial_solution()
        current_fit = self.fitness_calculator.calculate_total_fitness(current_sol)
        best_sol = copy.deepcopy(current_sol)
        best_fit = current_fit
        
        modes = ["HC", "GD", "SA"]
        mode_idx, stagnation_counter, last_h = 0, 0, -1
        temp, water_level = 1000.0, current_fit * 1.1
        
        for i in range(max_iterations):
            current_mode = modes[mode_idx]
            current_h = self.select_next_heuristic(last_h)
            
            # Generer une nouvelle solution voisine
            neighbor = self.llh_manager.apply(current_h, current_sol)
            
            # Calcul des scores separement
            neighbor_hard = self.fitness_calculator.calculate_f1_viability(neighbor)
            neighbor_soft = self.fitness_calculator.calculate_f2_quality(neighbor) + self.fitness_calculator.calculate_f3_comfort(neighbor)
            neighbor_fit = (self.fitness_calculator.M * neighbor_hard) + neighbor_soft
            
            current_hard = self.fitness_calculator.calculate_f1_viability(current_sol)
            
            # PHASE 1 : Si on a des violations Hard, on refuse CATEGORIQUEMENT toute degradation des Hard
            delta = neighbor_fit - current_fit
            accepted = False
            
            if current_hard > 0:
                # Priorite absolue : Reduire les violations Hard
                if neighbor_hard < current_hard:
                    accepted = True # On prend toute amelioration Hard
                elif neighbor_hard == current_hard:
                    # Si Hard identique, on accepte si Soft est meilleur ou egal (HC classique)
                    if delta <= 0: accepted = True
            else:
                # PHASE 2 : H=0 atteint, on suit les regles de l'article (HC -> GD -> SA)
                if current_mode == "HC" and delta <= 0: accepted = True
                elif current_mode == "GD" and neighbor_fit <= water_level: accepted = True
                elif current_mode == "SA" and (delta <= 0 or random.random() < math.exp(-delta / max(temp, 0.001))): accepted = True

            self.update_matrix(last_h, current_h, delta)

            if accepted:
                current_sol, current_fit = neighbor, neighbor_fit
                if current_fit < (best_fit - 0.1):
                    best_sol, best_fit = copy.deepcopy(current_sol), current_fit
                    stagnation_counter = 0
                    if i % 1000 == 0:
                        print(f"  Iteration {i:5d} | Mode: {current_mode} | Fitness: {best_fit:.2f}")
                else: 
                    stagnation_counter += 1
                last_h = current_h
            else: 
                stagnation_counter += 1

            if stagnation_counter >= 1000:
                mode_idx = (mode_idx + 1) % len(modes)
                stagnation_counter = 0
                if modes[mode_idx] == "GD": water_level = best_fit * 1.05
                if modes[mode_idx] == "SA": temp = 500.0

            temp *= 0.999
            water_level -= 0.5
            
            if callback and i % 100 == 0:
                callback(i, max_iterations, best_fit)

        print(f"[SBHH] Resolution terminee | Fitness finale: {best_fit:.2f}")
        return best_sol

    def _create_initial_solution(self) -> Timetable:
        timetable = Timetable()
        slot_ids = list(self.slots.keys())
        for mid, module in self.modules.items():
            start_slot = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
            room = random.choice(list(self.rooms.keys()))
            for offset in range(module.weekly_hours):
                timetable.add_assignment(Assignment(module_id=mid, slot_id=start_slot + offset, room_id=room))
        return timetable
