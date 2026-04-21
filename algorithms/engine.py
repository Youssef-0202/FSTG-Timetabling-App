import random 
import copy
import math
from models import Schedule, Assignment
from constraints import calculate_fitness_full

class HybridEngine:
    def __init__(self, data_manager, pop_size=30, constraints_mask=None):
        self.dm = data_manager
        self.pop_size = pop_size
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }
        
        # GA Parameters
        self.mutation_rate = 0.15
        self.elitism = 2
        
        # SA Parameters 
        self.sa_iterations = 400
        self.sa_temp = 50.0
        self.sa_cooling = 0.95

    def get_score(self, schedule):
        """Calculates scalar score for comparison"""
        h, s, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        M = 10000
        return (M * h) + s
    
    def create_initial_population(self):
        self.population = []
        for _ in range(self.pop_size):
            assignments = []
            for mp in self.dm.module_parts:
                if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                    # Trouver les objets réels à partir des IDs
                    room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                    slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
                    assignments.append(Assignment(mp, room, slot))
                else:
                    assignments.append(Assignment(mp, random.choice(self.dm.rooms), random.choice(self.dm.timeslots)))
            sch = Schedule(self.dm, assignments)
            self.population.append(sch)

    def evolve(self):
        """Main Evolution Step"""
        self.population.sort(key=lambda x: self.get_score(x))
        new_gen = self.population[:self.elitism]
        while len(new_gen) < self.pop_size:
            # Tournament Selection
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: self.get_score(x))
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: self.get_score(x))
            
            # 1. Crossover
            child = self.crossover(p1, p2)
            
            # 2. Mutation (Exploration pure)
            if random.random() < self.mutation_rate:
                self.mutate(child)
                
            # 3. Local Search (Exploitation finale)
            # On applique le recuit simulé une seule fois pour lisser l'enfant avant de l'ajouter
            child = self.simulated_annealing_search(child)
                
            new_gen.append(child)
            self.population.sort(key=lambda x: self.get_score(x))
        
        self.population = new_gen
    
    def crossover(self, p1, p2):
        """Mixes genes from two parents"""
        new_as = []
        for i in range(len(p1.assignments)):
            parent = p1 if random.random() < 0.5 else p2
            orig = parent.assignments[i]
            # Create a clean child assignment
            new_as.append(Assignment(orig.module_part, orig.room, orig.timeslot))
        return Schedule(self.dm, new_as)
    
    def mutate(self, schedule):
        """Randomly changes a room or timeslot (only for non-locked sessions)"""
        if not schedule.assignments: return
        unlocked_indices = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked_indices: return
        
        idx = random.choice(unlocked_indices)
        schedule.assignments[idx].room = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)
    
    def simulated_annealing_search(self, schedule):
        """Local Search to refine an individual schedule"""
        current_sch = schedule
        current_fit = self.get_score(current_sch)
        best_sch = current_sch
        best_fit = current_fit
        
        temp = self.sa_temp
        
        for _ in range(self.sa_iterations):
            # Create a neighbor
            neighbor = schedule.copy()
            r = random.random()
            
            unlocked_indices = [i for i, a in enumerate(neighbor.assignments) if not a.module_part.is_locked]
            if not unlocked_indices: break

            if r < 0.33:
                # --- MOVE 1: SHIFT BOTH ---
                idx = random.choice(unlocked_indices)
                neighbor.assignments[idx].room = random.choice(self.dm.rooms)
                neighbor.assignments[idx].timeslot = random.choice(self.dm.timeslots)
            
            elif r < 0.66:
                # --- MOVE 2: SWAP (Exchange two sessions) ---
                if len(unlocked_indices) >= 2:
                    idx1, idx2 = random.sample(unlocked_indices, 2)
                    neighbor.assignments[idx1].timeslot, neighbor.assignments[idx2].timeslot = \
                        neighbor.assignments[idx2].timeslot, neighbor.assignments[idx1].timeslot
            
            else:
                # --- MOVE 3: SHIFT ROOM ONLY ---
                idx = random.choice(unlocked_indices)
                neighbor.assignments[idx].room = random.choice(self.dm.rooms)
            neighbor_fit = self.get_score(neighbor)
            delta = neighbor_fit - current_fit
            
            # Metropolis Acceptance Criteria
            if delta < 0 or (temp > 0 and random.random() < math.exp(-delta / temp)):
                current_sch = neighbor
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_sch = neighbor
                    best_fit = neighbor_fit
            
            temp *= self.sa_cooling
            
        return best_sch