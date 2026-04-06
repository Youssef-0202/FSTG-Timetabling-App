import random
import time
import copy
from typing import List, Dict, Set, Tuple
from models import Timetable, Course, Room, Curriculum, Timeslot, Assignment
from fitness import ITCFitness

class CPSolverIFS:
    """
    Implémentation experte de l'Iterative Forward Search (IFS) : L'algorithme de base de CPSolver.
    - Étape 1 : Choisit un cours non-assigné (Variable).
    - Étape 2 : Cherche une Salle + Créneau (Valeur) avec le moins de conflits (Score dynamique basé sur Soft/Hard).
    - Étape 3 : Assigne le cours. Désassigne tous les cours qui causent un conflit (Unassignment).
    """

    def __init__(self, courses: Dict[str, Course], rooms: Dict[str, Room], curricula: Dict[str, Curriculum], slots: List[Timeslot], unavailabilities: List[Tuple[str, int, int]]):
        self.courses = courses
        self.rooms = list(rooms.values())
        self.slots = slots
        self.fitness_calc = ITCFitness(courses, rooms, curricula, slots, unavailabilities)
        
        # Le concept d'IFS : Chaque heure de cours (lecture_index) est une "Variable" à assigner
        self.variables = []
        for c in self.courses.values():
            for i in range(c.num_lectures):
                self.variables.append((c.course_id, i))
                
    def get_conflicting_assignments(self, test_assignment: Assignment, current_assignments: List[Assignment]) -> List[Assignment]:
        """Retourne la liste des cours qu'il faut désassigner ('kicked out') si on place test_assignment"""
        conflicts = []
        c = self.courses[test_assignment.course_id]
        test_slot = test_assignment.slot_id
        
        for a in current_assignments:
            if a.slot_id == test_slot:
                # H2 : Même salle à la même heure
                if a.room_id == test_assignment.room_id:
                    conflicts.append(a)
                else:
                    # H3 : Professeur en conflit
                    other_c = self.courses[a.course_id]
                    if other_c.teacher_id == c.teacher_id:
                        conflicts.append(a)
                    # H3 : Curriculum en conflit (étudiants doivent être à deux endroits)
                    elif set(c.curriculum_ids).intersection(set(other_c.curriculum_ids)):
                        conflicts.append(a)
        return conflicts

    def solve(self, max_iterations=5000, time_limit=30) -> Timetable:
        timetable = Timetable()
        unassigned = list(self.variables) # Copie complète des variables
        
        best_timetable = None
        best_fitness = float('inf')
        
        start_time = time.time()
        iterations = 0
        
        # L'index rapide des slots pour checker H4
        slot_map = {s.slot_id: s for s in self.slots}
        
        while iterations < max_iterations and (time.time() - start_time) < time_limit:
            iterations += 1
            
            if not unassigned:
                # ÉTAT PARFAIT: Tous les cours sont placés sans Violations Hard ! 
                # C'est la force de l'IFS (0 hard conflicts garantis)
                current_fitness = self.fitness_calc.calculate_total_penalty(timetable)
                
                if current_fitness < best_fitness:
                    best_fitness = current_fitness
                    best_timetable = copy.deepcopy(timetable)
                    print(f"✅ Iter {iterations:5d} | IFS a trouvé une solution valide complète | Pénalité Soft : {best_fitness}")
                
                # Perturbation : Pour ne pas rester bloqué (Minimum Local), on expulse 1 à 3 cours au hasard
                for _ in range(random.randint(1, 3)):
                    if timetable.assignments:
                        idx_to_remove = random.randrange(len(timetable.assignments))
                        kicked = timetable.assignments.pop(idx_to_remove)
                        unassigned.append((kicked.course_id, kicked.lecture_index))
                continue
                
            # 1. Sélection d'une Variable (La plus stricte, ou aléatoire)
            var_idx = random.randrange(len(unassigned))
            c_id, l_idx = unassigned.pop(var_idx)
            
            # 2. Sélection d'une Valeur (Salle/Heure)
            best_val = None
            min_conflicts = float('inf')
            conflicting_to_remove = []
            
            # Pour la performance, on teste 15 combinaisons "Room/Timeslot" au hasard (au lieu de 500+)
            for _ in range(15):
                test_room = random.choice(self.rooms).room_id
                test_slot = random.choice(self.slots).slot_id
                
                # Check immédiat de H4 (Unavailability)
                s = slot_map[test_slot]
                if (c_id, s.day, s.period) in self.fitness_calc.unavail_set:
                    continue # On ignore cette case, le prof n'est pas là
                    
                temp_a = Assignment(c_id, l_idx, test_slot, test_room)
                
                # Compter qui bloque ?
                conflicts = self.get_conflicting_assignments(temp_a, timetable.assignments)
                penalty_score = len(conflicts)
                
                if penalty_score < min_conflicts:
                    min_conflicts = penalty_score
                    best_val = temp_a
                    conflicting_to_remove = conflicts
                    if min_conflicts == 0:
                        break # Trouver une case vide parfaite !
                        
            # Si un emplacement valide a été trouvé, on assigne
            if best_val:
                # 3. UNASSIGNMENT (Désassigner les bloqueurs)
                for ca in conflicting_to_remove:
                    timetable.assignments.remove(ca)
                    unassigned.append((ca.course_id, ca.lecture_index))
                    
                # 4. ASSIGNMENT
                timetable.assignments.append(best_val)
            else:
                # Aucun emplacement car H4 bloquait partout, on remet dans la liste
                unassigned.append((c_id, l_idx))

        return best_timetable if best_timetable else timetable
