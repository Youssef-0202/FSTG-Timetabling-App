import random
import time
import copy
import math
from typing import List, Dict, Tuple
from models import Timetable, Assignment
from fitness import ITCFitness

class LowLevelHeuristics:
    """Les 4 mouvements de base du Timetabling Universitaire"""
    def __init__(self, fitness_calc: ITCFitness):
        self.fc = fitness_calc
        self.rooms = list(fitness_calc.rooms.keys())
        self.slots = list(fitness_calc.slots.keys())
        self.num_heuristics = 4

    def apply_llh(self, heuristic_idx: int, timetable: Timetable) -> Timetable:
        neighbor = copy.deepcopy(timetable)
        if not neighbor.assignments: return neighbor
        
        idx1 = random.randrange(len(neighbor.assignments))
        a1 = neighbor.assignments[idx1]

        if heuristic_idx == 0:
            # LLH_0: Changer de Salle (Conservation du créneau)
            a1.room_id = random.choice(self.rooms)
            
        elif heuristic_idx == 1:
            # LLH_1: Changer de Salle et de Créneau
            a1.room_id = random.choice(self.rooms)
            a1.slot_id = random.choice(self.slots)
            
        elif heuristic_idx == 2:
            # LLH_2: Swap Complet (Temps et Salle) entre 2 cours aléatoires
            idx2 = random.randrange(len(neighbor.assignments))
            a2 = neighbor.assignments[idx2]
            
            a1.slot_id, a2.slot_id = a2.slot_id, a1.slot_id
            a1.room_id, a2.room_id = a2.room_id, a1.room_id
            
        elif heuristic_idx == 3:
            # LLH_3: Échanger uniquement les Créneaux (Timeslots) mais garder les Salles respectives
            idx2 = random.randrange(len(neighbor.assignments))
            a2 = neighbor.assignments[idx2]
            a1.slot_id, a2.slot_id = a2.slot_id, a1.slot_id

        return neighbor

class SequenceBasedHyperHeuristic:
    """
    Implémentation exacte de SBHH (Steenson 2022).
    L'IA apprend quelle heuristique appeler en observant une Matrice de Transition.
    Q-Learning basique (Online Learning).
    """
    def __init__(self, fitness_calc: ITCFitness):
        self.fitness_calc = fitness_calc
        self.llh_manager = LowLevelHeuristics(fitness_calc)
        self.N = self.llh_manager.num_heuristics
        
        # Matrice de Transition (Scores): M[i][j] = Probabilité de jouer l'heuristique J sachant qu'on a joué I
        self.trans_scores = [[1.0 for _ in range(self.N)] for _ in range(self.N)]
        
        # Récompenses du Reinforcement Learning
        self.reward_improvement = 2.0  # Jackpot si ça baisse la pénalité
        self.reward_worsening = 0.01   # Punition (proche de 0) si ça bloque
        self.reward_same = 0.5         # Moyen si la pénalité stagne (Exploration neutre)
        self.learning_rate = 0.2       # Vitesse à laquelle l'IA "oublie" le passé pour les nouvelles récompenses

    def select_next_heuristic(self, last_h: int) -> int:
        """Méthode Roulette Wheel Selection selon les probabilités de la Matrice de Transition"""
        if last_h == -1: return random.randrange(self.N) # Coup d'envoi aléatoire
        
        row_scores = self.trans_scores[last_h]
        total = sum(row_scores)
        r = random.uniform(0, total)
        
        acc = 0.0
        for j, score in enumerate(row_scores):
            acc += score
            if r <= acc:
                return j
        return self.N - 1

    def update_matrix(self, last_h: int, current_h: int, delta_fitness: int):
        """Met à jour le cerveau de l'IA (Q-Table update) de façon transparente et pure"""
        if last_h == -1: return
        
        if delta_fitness < 0:
            reward = self.reward_improvement
        elif delta_fitness > 0:
            reward = self.reward_worsening
        else:
            reward = self.reward_same
            
        old_score = self.trans_scores[last_h][current_h]
        new_score = old_score * (1 - self.learning_rate) + reward * self.learning_rate
        
        # On interdit un score de 0 absolu pour toujours tolérer <= 1% de mutation folle
        self.trans_scores[last_h][current_h] = max(0.01, new_score)

    def solve(self, initial_timetable: Timetable, max_iterations=50000, max_time=60):
        print("\n🧠 Lancement de la Sequence-Based Hyper-Heuristic (SBHH) 🧠")
        print("💡 Stratégie d'acceptation Hybride : HC -> GD -> SA -> HC ...")
        
        current_sol = copy.deepcopy(initial_timetable)
        best_sol = copy.deepcopy(current_sol)
        
        # Init Fitness
        current_fit = self.fitness_calc.calculate_total_penalty(current_sol)
        best_fit = current_fit
        
        # Paramètres de contrôle des phases
        modes = ["HC", "GD", "SA"]
        mode_idx = 0
        current_mode = modes[mode_idx]
        
        # Paramètres d'acceptation spécifiques
        temp = 1000.0        # Pour SA (Simulated Annealing)
        water_level = current_fit * 1.1  # Pour GD (Great Deluge)
        rain_rate = 0.5      # Vitesse de baisse (GD)
        
        # Contrôle de stagnation pour le changement de phase
        stagnation_limit = 1500  
        stagnation_counter = 0
        
        last_h = -1
        start_time = time.time()
        
        for i in range(max_iterations):
            if time.time() - start_time > max_time: break
            
            # 1. Sélectionne l'action via le Cerveau
            current_h = self.select_next_heuristic(last_h)
            
            # 2. Perturbe l'emploi du temps
            neighbor_sol = self.llh_manager.apply_llh(current_h, current_sol)
            
            # 3. Validation de Faisabilité (H-Conflicts)
            h_conflicts = self.fitness_calc.count_hard_conflicts(neighbor_sol)
            
            if h_conflicts > 0:
                neighbor_fit = current_fit + 10000 
            else:
                neighbor_fit = self.fitness_calc.calculate_total_penalty(neighbor_sol)
                
            delta = neighbor_fit - current_fit
            
            # 4. CRITÈRE D'ACCEPTATION (ÉTAPE 5)
            accepted = False
            if h_conflicts == 0:
                if current_mode == "HC":
                    if delta <= 0: accepted = True
                elif current_mode == "GD":
                    if neighbor_fit <= water_level: accepted = True
                elif current_mode == "SA":
                    if delta <= 0 or random.random() < math.exp(-delta / max(temp, 0.001)):
                        accepted = True

            # 5. Apprentissage du Mouvement (Matrice de Transition)
            self.update_matrix(last_h, current_h, delta)
            
            # 6. Mise à jour de la solution
            if accepted:
                current_sol = neighbor_sol
                current_fit = neighbor_fit
                if current_fit < (best_fit - 0.1):
                    best_sol = copy.deepcopy(current_sol)
                    best_fit = current_fit
                    stagnation_counter = 0 
                    if i % 500 == 0:
                        print(f"✨ Iter {i:5d} [{current_mode}] | Fitness : {best_fit:.1f}")
                else:
                    stagnation_counter += 1
                last_h = current_h
            else:
                stagnation_counter += 1

            # 7. GESTION DES CYCLES (HC -> GD -> SA)
            if stagnation_counter >= stagnation_limit:
                mode_idx = (mode_idx + 1) % len(modes)
                current_mode = modes[mode_idx]
                stagnation_counter = 0
                if current_mode == "GD": water_level = best_fit * 1.05
                if current_mode == "SA": temp = 500.0
                print(f"🔄 Stagnation... Passage au mode : {current_mode}")
                
            temp *= 0.999
            water_level -= rain_rate
            
        print(f"\n✅ SBHH terminé en {time.time() - start_time:.2f}s !")
        return best_sol if best_sol else current_sol

