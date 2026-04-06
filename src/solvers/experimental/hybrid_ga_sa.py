from typing import Dict, Optional, Callable
import random
import copy
import math
import time
from solvers.base_solver import BaseSolver
from core.solution import Timetable, Assignment
from core.models import Modality, Module, Room, Timeslot
from core.fitness import FitnessCalculator


class HybridSolver(BaseSolver):
    """
    Genetic Algorithm with Simulated Annealing as local search.
    """

    def __init__(self, modules: Dict[str, Module], rooms: Dict[str, Room],
                 slots: Dict[int, Timeslot], fitness_calculator: FitnessCalculator):
        super().__init__(modules, rooms, slots, fitness_calculator)

        self.pop_size       = 50
        self.generations    = 200
        self.crossover_rate = 0.8
        self.mutation_rate  = 0.25
        self.elitism        = 3

        self.sa_initial_temp = 40.0
        self.sa_cooling_rate = 0.92
        self.sa_iterations   = 40

    def _create_random_solution(self) -> Timetable:
        timetable = Timetable()
        slot_ids = list(self.slots.keys())
        for mid, module in self.modules.items():
            compatible_rooms = [rid for rid, r in self.rooms.items()
                                if r.room_type == module.course_type]
            room_pool = compatible_rooms if compatible_rooms else list(self.rooms.keys())
            room = random.choice(room_pool)
            
            # Gestion du bloc vs sessions séparées
            if module.is_block:
                # Un seul bloc consécutif (ex: 4h)
                start_slot = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
                for offset in range(module.weekly_hours):
                    timetable.add_assignment(Assignment(
                        module_id=mid, slot_id=start_slot + offset,
                        room_id=room, modality=Modality.F2F
                    ))
            else:
                # Sessions de 2h séparées (ex: 2h Lundi, 2h Jeudi)
                num_sessions = module.weekly_hours // 2
                for _ in range(num_sessions):
                    start_slot = random.choice(slot_ids[:-1])
                    for offset in range(2):
                        timetable.add_assignment(Assignment(
                            module_id=mid, slot_id=start_slot + offset,
                            room_id=room, modality=Modality.F2F
                        ))
        return timetable

    def _crossover(self, parent1: Timetable, parent2: Timetable) -> Timetable:
        child = Timetable()
        for mid in self.modules.keys():
            parent = parent1 if random.random() < 0.5 else parent2
            for a in [x for x in parent.assignments if x.module_id == mid]:
                child.add_assignment(a.copy())
        return child

    def _mutate(self, timetable: Timetable) -> None:
        slot_ids = list(self.slots.keys())
        for mid, module in self.modules.items():
            if random.random() < self.mutation_rate:
                compatible_rooms = [rid for rid, r in self.rooms.items()
                                    if r.room_type == module.course_type]
                room_pool = compatible_rooms if compatible_rooms else list(self.rooms.keys())
                new_start = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
                new_room  = random.choice(room_pool)
                for offset, a in enumerate(
                    [x for x in timetable.assignments if x.module_id == mid]
                ):
                    a.slot_id = new_start + offset
                    a.room_id = new_room

    def _sa_local_search(self, solution: Timetable) -> Timetable:
        """
        Simulated Annealing used as local search.
        Called after crossover and mutation for each individual.
        Uses a low initial temperature to explore the local neighborhood only.
        """
        slot_ids    = list(self.slots.keys())
        current_sol = solution.copy()
        current_fit = self.fitness_calculator.calculate_total_fitness(current_sol)
        best_sol    = current_sol.copy()
        best_fit    = current_fit
        temp        = self.sa_initial_temp

        for _ in range(self.sa_iterations):
            neighbor = current_sol.copy()
            r = random.random()

            if r < 0.5:
                # SHIFT: déplacer un module ou une session
                mid    = random.choice(list(self.modules.keys()))
                module = self.modules[mid]
                compatible_rooms = [rid for rid, rm in self.rooms.items()
                                    if rm.room_type == module.course_type]
                room_pool = compatible_rooms if compatible_rooms else list(self.rooms.keys())
                new_room  = random.choice(room_pool)
                
                if module.is_block:
                    new_start = random.choice(slot_ids[:-max(module.weekly_hours, 1)])
                    for offset, a in enumerate([x for x in neighbor.assignments if x.module_id == mid]):
                        a.slot_id = new_start + offset
                        a.room_id = new_room
                else:
                    # Déplacer une session de 2h au hasard parmi les sessions du module
                    all_as = [x for x in neighbor.assignments if x.module_id == mid]
                    if all_as:
                        session_idx = random.randint(0, (len(all_as)//2) - 1)
                        new_start = random.choice(slot_ids[:-1])
                        all_as[session_idx*2].slot_id = new_start
                        all_as[session_idx*2+1].slot_id = new_start + 1
                        for a in all_as: a.room_id = new_room

            elif r < 0.8:
                # SWAP: exchange timeslots between two modules
                m1, m2 = random.sample(list(self.modules.keys()), 2)
                a1s = [x for x in neighbor.assignments if x.module_id == m1]
                a2s = [x for x in neighbor.assignments if x.module_id == m2]
                if a1s and a2s and len(a1s) == len(a2s):
                    s1, s2 = a1s[0].slot_id, a2s[0].slot_id
                    for offset, a in enumerate(a1s): a.slot_id = s2 + offset
                    for offset, a in enumerate(a2s): a.slot_id = s1 + offset

            else:
                # COMPACT: reduce gaps by placing a module adjacent to another
                mid      = random.choice(list(self.modules.keys()))
                module   = self.modules[mid]
                group_id = module.group_id
                other_slots = [
                    a.slot_id for a in neighbor.assignments
                    if self.modules[a.module_id].group_id == group_id
                    and a.module_id != mid
                ]
                if other_slots:
                    target    = random.choice(other_slots)
                    new_start = target + 1 if target < max(slot_ids) else target - 1
                    if new_start in slot_ids[:-max(module.weekly_hours, 1)]:
                        for offset, a in enumerate(
                            [x for x in neighbor.assignments if x.module_id == mid]
                        ):
                            a.slot_id = new_start + offset

            neighbor_fit = self.fitness_calculator.calculate_total_fitness(neighbor)
            delta = neighbor_fit - current_fit

            if delta < 0 or random.random() < math.exp(-delta / max(temp, 0.001)):
                current_sol = neighbor
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_sol = current_sol.copy()
                    best_fit = current_fit

            temp *= self.sa_cooling_rate

        return best_sol

    def solve(self, callback: Optional[Callable] = None, **kwargs) -> Timetable:
        """
        Main loop of the Memetic Algorithm.

        For each generation:
          1. Selection (tournament)
          2. Crossover
          3. Mutation
          4. SA local search applied immediately after crossover and mutation
        """

        population = [self._create_random_solution() for _ in range(self.pop_size)]
        start_time = time.time()

        for gen in range(self.generations):
            population.sort(key=lambda t: self.fitness_calculator.calculate_total_fitness(t))
            best     = population[0]
            best_fit = self.fitness_calculator.calculate_total_fitness(best)

            if callback:
                hard = self.fitness_calculator.calculate_f1_viability(best)
                soft = (self.fitness_calculator.calculate_f2_quality(best) +
                        self.fitness_calculator.calculate_f3_comfort(best))
                callback(gen, self.generations, best_fit, hard, soft)

            if gen % 20 == 0:
                print(f"Gen {gen:4d} | Fitness: {best_fit:.4f}")

            if best_fit < 0.1:
                print(f"Optimal solution reached at generation {gen}.")
                break

            # Elitism: top individuals survive unchanged
            new_population = population[:self.elitism]

            while len(new_population) < self.pop_size:
                # Tournament selection
                p1 = min(random.sample(population, 5),
                         key=lambda t: self.fitness_calculator.calculate_total_fitness(t))
                p2 = min(random.sample(population, 5),
                         key=lambda t: self.fitness_calculator.calculate_total_fitness(t))

                # Étape 1 : Crossover (Fusion des gènes)
                child = self._crossover(p1, p2)
                # Recherche locale immédiate pour stabiliser l'enfant
                child = self._sa_local_search(child)

                # Étape 2 : Mutation (Diversité)
                self._mutate(child)
                # Recherche locale immédiate pour réparer les conflits de mutation
                child = self._sa_local_search(child)

                new_population.append(child)

            population = new_population

        best_solution = population[0]
        final_fit     = self.fitness_calculator.calculate_total_fitness(best_solution)
        elapsed       = time.time() - start_time

        print(f"Done in {elapsed:.2f}s | Final fitness: {final_fit:.4f}")
        return best_solution
