import random
from collections import defaultdict
import time

class LocalCPSolver:
    """
    Mini-solveur de contraintes localisé pour la réparation exacte (Matheuristique).
    Se focalise sur la stabilité des salles et la réduction des Gaps par backtracking.
    """
    def __init__(self, data_manager, constraints_evaluator):
        self.dm = data_manager
        self.evaluator = constraints_evaluator

    def refine_room_stability(self, individual):
        """
        Optimisation exacte de la stabilité (S6).
        Pour chaque module, on tente d'affecter UNE SEULE salle pour toutes ses séances.
        """
        assignments = individual.assignments
        # 1. Grouper les séances par module
        module_groups = defaultdict(list)
        for i, a in enumerate(assignments):
            module_groups[a.module_part.module_id].append(i)

        improved = 0
        
        # 2. Pour chaque module, chercher la meilleure salle commune
        for module_id, idx_list in module_groups.items():
            if len(idx_list) <= 1: continue # Pas besoin de stabilité pour 1 séance
            
            # Lister les salles candidates
            candidate_rooms = self.dm.rooms
            
            # Priorité aux salles déjà utilisées par le module pour minimiser les changements
            existing_room_ids = list(set(assignments[i].room.id for i in idx_list))
            
            for room in candidate_rooms:
                # Vérifier si la salle est libre pour TOUS les créneaux de ce module
                can_fit_all = True
                
                for idx in idx_list:
                    current_a = assignments[idx]
                    # Vérifier capacité et type de salle requis
                    if room.capacity < current_a.module_part.group_size:
                        can_fit_all = False
                        break
                    if current_a.module_part.required_room_type and room.type != current_a.module_part.required_room_type:
                        can_fit_all = False
                        break
                    # Vérifier collision H2 (Salle occupée)
                    # On ne doit ignorer QUE la séance elle-même [idx], pas tout le module [idx_list]
                    if self._is_room_busy(assignments, room.id, current_a.timeslot.id, ignore_indices=[idx]):
                        can_fit_all = False
                        break
                
                if can_fit_all:
                    # On applique le changement : la salle "room" devient la salle unique du module
                    for i in idx_list: 
                        assignments[i].room = room
                    improved += 1
                    break # On a trouvé une solution parfaite pour ce module
                
        return improved > 0

    def _is_room_busy(self, assignments, room_id, timeslot_id, ignore_indices):
        for i, a in enumerate(assignments):
            if i in ignore_indices: continue
            if a.room.id == room_id and a.timeslot.id == timeslot_id:
                return True
        return False

    def compact_sections(self, individual):
        """
        Réduction exacte des Gaps (S3).
        Pour chaque section et chaque jour, on tente de remonter les séances vers les créneaux vides.
        """
        assignments = individual.assignments
        # 1. Grouper par (Section, Jour)
        section_day_groups = defaultdict(list)
        for i, a in enumerate(assignments):
            key = (a.module_part.section_id, a.timeslot.day)
            section_day_groups[key].append(i)

        improved = 0
        
        for key, idx_list in section_day_groups.items():
            # Trier les séances du jour par heure de début
            idx_list.sort(key=lambda x: assignments[x].timeslot.start_time)
            
            # Pour chaque séance, essayer de l'avancer sur un créneau plus tôt
            for i in range(len(idx_list)):
                curr_idx = idx_list[i]
                current_a = assignments[curr_idx]
                
                # Chercher tous les créneaux du même jour AVANT le créneau actuel
                potential_slots = [s for s in self.dm.timeslots 
                                  if s.day == current_a.timeslot.day 
                                  and s.id < current_a.timeslot.id] # Hypothèse: IDs croissants
                
                # Trier par ordre chronologique (du plus tôt au plus tard)
                potential_slots.sort(key=lambda x: x.start_time)
                
                for slot in potential_slots:
                    # Vérifier si Teacher et Room sont libres à ce nouveau slot
                    if not self._is_teacher_busy(assignments, current_a.module_part.teacher_id, slot.id, [curr_idx]) and \
                       not self._is_room_busy(assignments, current_a.room.id, slot.id, [curr_idx]):
                        
                        # Vérifier si on ne crée pas de collision de section (déjà géré par section_day_groups normalement)
                        if not self._is_section_busy(assignments, current_a.module_part.section_id, slot.id, [curr_idx]):
                            # On avance la séance !
                            current_a.timeslot = slot
                            improved += 1
                            break
        
        return improved > 0

    def _is_teacher_busy(self, assignments, teacher_id, timeslot_id, ignore_indices):
        for i, a in enumerate(assignments):
            if i in ignore_indices: continue
            if a.module_part.teacher_id == teacher_id and a.timeslot.id == timeslot_id:
                return True
        return False

    def _is_section_busy(self, assignments, section_id, timeslot_id, ignore_indices):
        for i, a in enumerate(assignments):
            if i in ignore_indices: continue
            if a.module_part.section_id == section_id and a.timeslot.id == timeslot_id:
                return True
        return False
