import random
import time
import copy
import math
from typing import List, Dict, Tuple
from models import Timetable, Assignment
from fitness import ITCFitness
from sbhh import LowLevelHeuristics

class RandomBaselineSolver:
    """
    Algorithme de comparaison (Baseline). 
    Il utilise les mêmes outils (LLH) et la même acceptation (SA) que le SBHH,
    mais sans aucun apprentissage (Choix 100% aléatoire).
    """
    def __init__(self, fitness_calc: ITCFitness):
        self.fitness_calc = fitness_calc
        self.llh_manager = LowLevelHeuristics(fitness_calc)
        self.num_heuristics = self.llh_manager.num_heuristics

    def solve(self, initial_timetable: Timetable, max_iterations=50000, max_time=45):
        print("\n🎲 Lancement du Random Baseline Solver (Sans IA) 🎲")
        
        current_sol = copy.deepcopy(initial_timetable)
        best_sol = copy.deepcopy(current_sol)
        current_fit = self.fitness_calc.calculate_total_penalty(current_sol)
        best_fit = current_fit
        
        temp = 1000.0
        start_time = time.time()
        
        for i in range(max_iterations):
            if time.time() - start_time > max_time: break
            
            # CHOIX 100% ALÉATOIRE (C'est ici la différence avec SBHH)
            current_h = random.randrange(self.num_heuristics)
            
            neighbor_sol = self.llh_manager.apply_llh(current_h, current_sol)
            h_conflicts = self.fitness_calc.count_hard_conflicts(neighbor_sol)
            
            if h_conflicts > 0:
                neighbor_fit = current_fit + 10000 
            else:
                neighbor_fit = self.fitness_calc.calculate_total_penalty(neighbor_sol)
                
            delta = neighbor_fit - current_fit
            
            # Acceptation Simple (Simulated Annealing) pour être équitable
            if h_conflicts == 0 and (delta <= 0 or random.random() < math.exp(-delta / max(temp, 0.001))):
                current_sol = neighbor_sol
                current_fit = neighbor_fit
                
                if current_fit < (best_fit - 0.1):
                    best_sol = copy.deepcopy(current_sol)
                    best_fit = current_fit
            
            temp *= 0.999
            
        return best_sol if best_sol else current_sol
