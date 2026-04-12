import random 
import copy
from models import Schedule, Assignment
from constraints import calculate_fitness_full

class HybridEngine:
    def __init__(self, data_manager, pop_size=30):
        self.dm = data_manager
        self.pop_size = pop_size
        
        # GA Parameters
        self.mutation_rate = 0.15
        self.elitism = 2
        
        # SA Parameters 
        self.sa_iterations = 20
        self.sa_temp = 50.0
        self.sa_cooling = 0.95

    def get_score(self, schedule):
        """Calculates scalar score for comparison"""
        h, s = calculate_fitness_full(schedule)
        M = 10000
        return (M * h) + s
    
    def create_initial_population(self):
        self.population = []
        for _ in range(self.pop_size):
            assignments = []
            for mp in self.dm.module_parts:
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
            
            # 2. Local Search 
            child = self.simulated_annealing_search(child)
            
            # 3. Mutation
            if random.random() < self.mutation_rate:
                self.mutate(child)
                # 2nd Local Search to repair/optimize after mutation
                child = self.simulated_annealing_search(child)
                
            new_gen.append(child)
        
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
        """Randomly changes a room or timeslot"""
        if not schedule.assignments: return
        idx = random.randint(0, len(schedule.assignments) - 1)
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
            
            # --- MOVE: SHIFT (Room/Time change) ---
            if r < 0.6:
                idx = random.randint(0, len(neighbor.assignments)-1)
                neighbor.assignments[idx].room = random.choice(self.dm.rooms)
                neighbor.assignments[idx].timeslot = random.choice(self.dm.timeslots)
            
            # --- MOVE: SWAP (Exchange two sessions) ---
            else:
                idx1, idx2 = random.sample(range(len(neighbor.assignments)), 2)
                neighbor.assignments[idx1].timeslot, neighbor.assignments[idx2].timeslot = \
                    neighbor.assignments[idx2].timeslot, neighbor.assignments[idx1].timeslot
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