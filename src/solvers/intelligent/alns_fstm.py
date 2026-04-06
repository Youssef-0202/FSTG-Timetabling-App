import random
import time
import copy
import math
from typing import List, Dict, Tuple
from solvers.base_solver import BaseSolver
from core.solution import Timetable, Assignment
from core.models import Module, Room, Timeslot
from core.fitness import FitnessCalculator

class ALNSSolver(BaseSolver):
    """
    Implementation de l'Adaptive Large Neighborhood Search (ALNS).
    Etat de l'art recents (2023-2024) combinant destruction ciblée et re-insertion gloutonne.
    """
    def __init__(self, modules: Dict[str, Module], rooms: Dict[str, Room], 
                 slots: Dict[int, Timeslot], fitness_calculator: FitnessCalculator):
        super().__init__(modules, rooms, slots, fitness_calculator)
        
        # Operateurs d'ALNS
        self.destroy_methods = [self._destroy_random, self._destroy_worst_group, self._destroy_random_day]
        self.repair_methods = [self._repair_greedy, self._repair_random]
        
        # Poids adaptatifs initiaux
        self.d_weights = [1.0] * len(self.destroy_methods)
        self.r_weights = [1.0] * len(self.repair_methods)
        self.learning_rate = 0.1

    def solve(self, max_iterations=2000, callback=None) -> Timetable:
        print(f"[ALNS] Lancement de l'algorithme recent ({max_iterations} iterations)...")
        start_time = time.time()
        
        # 1. Solution Initiale Aleatoire
        current_sol = self._create_initial_solution()
        current_fit = self.fitness_calculator.calculate_total_fitness(current_sol)
        best_sol = copy.deepcopy(current_sol)
        best_fit = current_fit
        
        temp = current_fit * 0.2
        cooling_rate = 0.995
        
        for i in range(max_iterations):
            # 2. SELECTION ADAPTATIVE (ROULETTE WHEEL)
            d_idx = random.choices(range(len(self.destroy_methods)), weights=self.d_weights)[0]
            r_idx = random.choices(range(len(self.repair_methods)), weights=self.r_weights)[0]
            
            destroy_op = self.destroy_methods[d_idx]
            repair_op = self.repair_methods[r_idx]
            
            # 3. DESTRUCTION (On arrache ~20% des cours)
            destroyed_sol, unassigned_modules = destroy_op(copy.deepcopy(current_sol), degree=0.2)
            
            # 4. REPARATION (On remet les cours intelligemment)
            neighbor = repair_op(destroyed_sol, unassigned_modules)
            neighbor_fit = self.fitness_calculator.calculate_total_fitness(neighbor)
            
            # 5. ACCEPTATION (Type Recuit Simule ou HC)
            delta = neighbor_fit - current_fit
            accepted = False
            reward = 0
            
            if delta < 0:
                accepted = True
                reward = 10 if neighbor_fit < best_fit else 5
            elif random.random() < math.exp(-delta / max(temp, 0.001)):
                accepted = True
                reward = 2
            
            if accepted:
                current_sol, current_fit = neighbor, neighbor_fit
                if current_fit < best_fit:
                    best_sol, best_fit = copy.deepcopy(current_sol), current_fit
                    if i % 100 == 0:
                        print(f"  ALNS Iter {i:4d} | Fitness: {best_fit:.2f} (D{d_idx}/R{r_idx})")

            # 6. MISE A JOUR DES POIDS ADAPTATIFS
            self.d_weights[d_idx] = self.d_weights[d_idx] * (1 - self.learning_rate) + reward * self.learning_rate
            self.r_weights[r_idx] = self.r_weights[r_idx] * (1 - self.learning_rate) + reward * self.learning_rate
            
            temp *= cooling_rate
            if callback and i % 50 == 0:
                callback(i, max_iterations, best_fit)

        print(f"[ALNS] Termine en {time.time()-start_time:.2f}s | Fitness finale: {best_fit:.2f}")
        return best_sol

    # ==========================================
    # OPÉRATEURS DE DESTRUCTION (DESTROY)
    # ==========================================
    def _destroy_random(self, timetable: Timetable, degree: float):
        """Retire aleatoirement N cours."""
        nb_to_remove = int(len(self.modules) * degree)
        modules_to_remove = random.sample(list(self.modules.keys()), nb_to_remove)
        timetable.assignments = [a for a in timetable.assignments if a.module_id not in modules_to_remove]
        return timetable, modules_to_remove

    def _destroy_worst_group(self, timetable: Timetable, degree: float):
        """Retire tous les cours d'un groupe etudiant au hasard (Souvent le plus contraint)."""
        target_group = random.choice([m.group_id for m in self.modules.values()])
        modules_to_remove = [mid for mid, m in self.modules.items() if m.group_id == target_group]
        timetable.assignments = [a for a in timetable.assignments if a.module_id not in modules_to_remove]
        return timetable, modules_to_remove

    def _destroy_random_day(self, timetable: Timetable, degree: float):
        """Vide completement une journee particuliere pour faire du tri."""
        target_day = random.choice(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"])
        target_slots = [sid for sid, s in self.slots.items() if s.day == target_day]
        
        modules_to_remove = list(set([a.module_id for a in timetable.assignments if a.slot_id in target_slots]))
        timetable.assignments = [a for a in timetable.assignments if a.module_id not in modules_to_remove]
        return timetable, modules_to_remove

    # ==========================================
    # OPÉRATEURS DE RÉPARATION (REPAIR)
    # ==========================================
    def _repair_greedy(self, timetable: Timetable, unassigned: List[str]):
        """Re-insere les cours de maniere gloutonne au MEILLEUR endroit (H1-H14)."""
        slot_ids = list(self.slots.keys())
        room_ids = list(self.rooms.keys())
        
        # On trie les modules par duree (plus dur a caser en premier)
        unassigned.sort(key=lambda m: self.modules[m].weekly_hours, reverse=True)
        
        for mid in unassigned:
            module = self.modules[mid]
            best_fit_delta = float('inf')
            best_assignment = None
            
            compatible_rooms = [rid for rid, r in self.rooms.items() if r.room_type == module.course_type]
            if not compatible_rooms: compatible_rooms = room_ids
            
            # Echantilloner quelques slots au hasard pour eviter de tout calculer (gain de temps)
            test_slots = random.sample(slot_ids[:-max(module.weekly_hours, 1)], min(10, len(slot_ids)-module.weekly_hours))
            
            for sid in test_slots:
                # Evaluer seulement 2 salles au hasard pour accelerer la réparation
                for rid in random.sample(compatible_rooms, min(2, len(compatible_rooms))):
                    temp_table = copy.deepcopy(timetable)
                    for offset in range(module.weekly_hours):
                        temp_table.add_assignment(Assignment(module_id=mid, slot_id=sid+offset, room_id=rid))
                    
                    # On evalue TOUTES LES CONTRAINTES (Hard + Soft) pour battre l'Hybride
                    fit_score = self.fitness_calculator.calculate_total_fitness(temp_table)
                    if fit_score < best_fit_delta:
                        best_fit_delta = fit_score
                        best_assignment = (sid, rid)
                        
                        # Si c'est proche de la perfection, on arrete de chercher (gain de temps)
                        if fit_score < 50: break 
                if best_fit_delta < 50: break
            
            # Appliquer le meilleur choix
            if best_assignment:
                sid, rid = best_assignment
                for offset in range(module.weekly_hours):
                    timetable.add_assignment(Assignment(module_id=mid, slot_id=sid+offset, room_id=rid))
            else:
                # Si aucun ne marche (impossible), placement aleatoire
                sid = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
                rid = random.choice(compatible_rooms)
                for offset in range(module.weekly_hours):
                    timetable.add_assignment(Assignment(module_id=mid, slot_id=sid+offset, room_id=rid))
                    
        return timetable

    def _repair_random(self, timetable: Timetable, unassigned: List[str]):
        """Re-insere completement au hasard (Exploration totale)."""
        slot_ids = list(self.slots.keys())
        for mid in unassigned:
            module = self.modules[mid]
            compatible_rooms = [rid for rid, r in self.rooms.items() if r.room_type == module.course_type]
            if not compatible_rooms: compatible_rooms = list(self.rooms.keys())
            
            sid = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
            rid = random.choice(compatible_rooms)
            for offset in range(module.weekly_hours):
                timetable.add_assignment(Assignment(module_id=mid, slot_id=sid+offset, room_id=rid))
        return timetable

    def _create_initial_solution(self) -> Timetable:
        timetable = Timetable()
        return self._repair_random(timetable, list(self.modules.keys()))
