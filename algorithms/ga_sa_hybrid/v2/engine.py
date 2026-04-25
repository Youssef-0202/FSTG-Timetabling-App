# ==============================================================================
# engine.py — Moteur Algorithmique Hybride GA + SA
# 
# Role        : Contient TOUTE la logique mathematique de l algorithme.
#               Il sait COMMENT faire evoluer une population.
#               Il ne decide NI quand s arreter NI comment charger les donnees.
# Dependances : models.py (Schedule, Assignment) | constraints.py (calculate_fitness_full)
# Appele par  : main_solver.py
# ==============================================================================

import random
import copy
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from commun.models import Schedule, Assignment
from commun.constraints import calculate_fitness_full


class HybridEngine:
    """
    Moteur principal de l algorithme Hybride GA+SA (Memetique).
    Chaque individu de la population est un emploi du temps complet (Schedule).
    """

    # SECTION A : INITIALISATION & PARAMETRES
    # ========================================

    def __init__(self, data_manager, 
                 pop_size=30, 
                 constraints_mask=None,
                 mutation_rate=0.15,
                 elitism=2,
                 sa_iterations=400,
                 sa_temp=50.0,
                 sa_cooling=0.95):
        """
        Initialise le moteur avec les donnees et les parametres de l algorithme.

        Params:
            data_manager      -- Objet DataManager contenant salles, profs, creneaux
            pop_size          -- Nombre d individus (chromosomes) dans la population
            constraints_mask  -- Dictionnaire pour activer/desactiver chaque contrainte
            mutation_rate     -- Probabilite de mutation (0.0 a 1.0)
            elitism           -- Nombre d individus a conserver intacts
            sa_iterations     -- Budget d iterations pour la recherche locale (L_max)
            sa_temp           -- Temperature de depart pour SA (T0)
            sa_cooling        -- Coefficient de refroidissement (Alpha)
        """
        # ── Donnees ──
        self.dm = data_manager

        # ── GA Parameters ──
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = elitism

        # ── SA Parameters (Recuit Simule Local) ──
        self.sa_iterations = sa_iterations
        self.sa_temp       = sa_temp
        self.sa_cooling    = sa_cooling

        # ── Masque des contraintes actives ──
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }

    
    # SECTION B : SCORING
    # ==========================================================================

    def get_score(self, schedule):
        """Calculates scalar score for comparison (Total Penalty) with caching (P4/P2)"""
        if hasattr(schedule, 'fitness') and schedule.fitness is not None:
            return schedule.fitness

        score, h, s, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness = score
        schedule.h_violations = h
        schedule.soft_penalty = s
        return score

    
    # SECTION C : INITIALISATION DE LA POPULATION
    # ==========================================================================

    def create_initial_population(self):
        """
        Crée la population initiale (P9).
        Mixte : 80% Greedy (heuristique constructive) + 20% Aléatoire (diversité).
        """
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        
        for k in range(self.pop_size):
            if k < n_greedy:
                # 80% de solutions intelligentes (H1/H2/H3 minimisés)
                schedule = self._build_greedy_individual()
            else:
                # 20% de solutions purement aléatoires
                schedule = self._build_random_individual()
            self.population.append(schedule)

    def _build_random_individual(self):
        """Ancien comportement : construction 100% aléatoire."""
        assignments = []
        for mp in self.dm.module_parts:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                room = random.choice(self.dm.rooms)
                slot = random.choice(self.dm.timeslots)
            assignments.append(Assignment(mp, room, slot))
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        """Heuristique constructive Greedy (P9) : placement séance par séance sans conflit dur."""
        assignments = []
        # Index de construction pour tracker l'occupation en temps réel
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        
        # Mélanger l'ordre des séances pour avoir des individus différents
        module_parts_shuffled = list(self.dm.module_parts)
        random.shuffle(module_parts_shuffled)
        
        for mp in module_parts_shuffled:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                
                # Échantillonnage pour la performance et la diversité
                candidate_slots = random.sample(self.dm.timeslots, min(15, len(self.dm.timeslots)))
                candidate_rooms = [r for r in self.dm.rooms if r.capacity >= mp.group_size]
                if not candidate_rooms: candidate_rooms = self.dm.rooms
                
                for slot in candidate_slots:
                    for room in candidate_rooms:
                        cost = 0
                        if (mp.teacher_id, slot.id) in teacher_slot_used: cost += 1000
                        if (room.id, slot.id) in room_slot_used: cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, slot.id) in group_slot_used: cost += 1000
                        
                        if cost < best_cost:
                            best_cost = cost
                            best_room, best_slot = room, slot
                            if cost == 0: break
                    if best_cost == 0: break
                
                room, slot = best_room, best_slot
            
            # Enregistrer l'occupation
            teacher_slot_used[(mp.teacher_id, slot.id)] = True
            room_slot_used[(room.id, slot.id)] = True
            for gid in mp.td_group_ids: group_slot_used[(gid, slot.id)] = True
            
            assignments.append(Assignment(mp, room, slot))
            
        return Schedule(self.dm, assignments)

   
    # SECTION D : EVOLUTION (UNE GENERATION GA COMPLETE)
    # ==========================================================================

    def evolve(self):
        """
        Execute UNE generation complete de l algorithme Genetique.

        Etapes :
            1. Trier la population par score 
            2. Copier les E meilleurs sans modification (Elitisme)
            3. Boucler jusqu a Pop_size individus :
               a. TournamentSelect x2  → choisir Parent_1 et Parent_2
               b. UniformCrossover     → creer un Enfant
               c. Mutate               → modifier aleatoirement un gene de l Enfant
               d. SA Local Search      → polir intensivement l Enfant (400 iterations SA)
               e. Ajouter l Enfant a la nouvelle generation
            4. Remplacer l ancienne population par la nouvelle
            5. Trier la nouvelle population -> population[0] = meilleur de la gen)
        """
        # 1. Trier par fitness (P4/P2 : get_score mettra en cache)
        self.population.sort(key=lambda x: self.get_score(x))

        # 2. Elitisme : conserver les E meilleurs directement
        new_gen = self.population[:self.elitism]

        # 3. Produire les (Pop_size - E) autres individus
        while len(new_gen) < self.pop_size:

            # a. Selection par Tournoi : lire directement le cache fitness (P4)
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)

            # b. Croisement Uniforme : creer un Enfant
            child = self.crossover(p1, p2)
            child.fitness = None  # Invalider : le crossover casse le cache (P2)

            # c. Mutation (Exploration) : 15% de chance
            if random.random() < self.mutation_rate:
                self.mutate(child)
                child.fitness = None  # Invalider : la mutation casse le cache (P2)

            # d. Recherche Locale SA : Calcule et attache child.fitness une seule fois
            child = self.simulated_annealing_search(child)

            new_gen.append(child)

        # 4 & 5. Remplacer et retrier la population (lecture du cache garantie)
        self.population = new_gen
        self.population.sort(key=lambda x: x.fitness)


    # SECTION E : OPERATEURS GENETIQUES
    # ==========================================================================

    def crossover(self, p1, p2):
        """
        Module-preserving Uniform Crossover (P7).
        On choisit le parent AU NIVEAU DU MODULE, pas de la séance.
        Toutes les séances d'un même module viennent du même parent.
        """
        # Grouper les indices de séances par module_id
        module_groups = {}
        for i, a in enumerate(p1.assignments):
            mid = a.module_part.module_id
            module_groups.setdefault(mid, []).append(i)

        new_assignments = [None] * len(p1.assignments)

        for module_id, indices in module_groups.items():
            # Choisir UN seul parent pour TOUT le module
            parent = p1 if random.random() < 0.5 else p2
            for i in indices:
                orig = parent.assignments[i]
                new_assignments[i] = Assignment(orig.module_part, orig.room, orig.timeslot)

        return Schedule(self.dm, new_assignments)

    def mutate(self, schedule):
        """
        Mutation pondérée (P8) : Modifier un gène, en priorité ceux en conflit.
        """
        if not schedule.assignments:
            return
        unlocked = [(i, a) for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked:
            return
            
        # P8 : Calculer des poids basés sur les conflits Hard (H1, H2, H3)
        penalties = self._compute_rough_penalties(schedule)
        weights = [penalties.get(i, 0.1) for i, _ in unlocked]
        
        # Tirage pondéré
        idx = random.choices([i for i, _ in unlocked], weights=weights, k=1)[0]
        
        schedule.assignments[idx].room     = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)

    def _compute_rough_penalties(self, schedule):
        """Calcule sommairement les conflits Hard pour pondérer la mutation (P8)."""
        penalties = {}
        prof_slots = {}
        room_slots = {}
        group_slots = {}
        
        for i, a in enumerate(schedule.assignments):
            penalties[i] = 0.1 # Poids de base pour permettre la mutation de gènes sains
            
            # H1 : Enseignant
            if a.module_part.teacher_id:
                key = (a.module_part.teacher_id, a.timeslot.id)
                if key in prof_slots:
                    penalties[i] += 1000
                    penalties[prof_slots[key]] += 1000
                prof_slots[key] = i
            
            # H2 : Salle
            key_r = (a.room.id, a.timeslot.id)
            if key_r in room_slots:
                penalties[i] += 1000
                penalties[room_slots[key_r]] += 1000
            room_slots[key_r] = i
            
            # H3 : Groupes
            for g_id in a.module_part.td_group_ids:
                key_g = (g_id, a.timeslot.id)
                if key_g in group_slots:
                    penalties[i] += 1000
                    penalties[group_slots[key_g]] += 1000
                group_slots[key_g] = i
                
        return penalties

    
    # SECTION F : RECHERCHE LOCALE (RECUIT SIMULE LOCAL - SA)
    # ==========================================================================

    def simulated_annealing_search(self, schedule):
        """
        Recherche Locale par Recuit Simulé (SA) optimisée (P3 + P10).
        - P3 : Exécution "In-place" avec Undo (gain de temps considérable).
        - P10 : Bi-phasé (Hard vs Soft) avec mouvements spécialisés.
        """
        current_sch = schedule
        current_fit = self.get_score(current_sch)
        
        # P5 : Température adaptive (5% du score courant)
        temp = max(self.sa_temp, current_fit * 0.05)
        
        # Snapshot de départ
        best_fit = current_fit
        best_state = [(a.room, a.timeslot) for a in schedule.assignments]
        
        # P10 : Déterminer la phase (Hard si violations hard > 0, sinon Soft)
        active_phase = 'hard' if schedule.h_violations > 0 else 'soft'

        for it in range(self.sa_iterations):
            # Transition dynamique vers le soft si le hard est résolu à mi-parcours
            if it == self.sa_iterations // 2 and active_phase == 'hard':
                if schedule.h_violations == 0: active_phase = 'soft'

            unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
            if not unlocked: break

            # P3 : Sauvegarde locale pour Undo O(1)
            idx = random.choice(unlocked) if active_phase == 'hard' else None # pour certains moves soft
            saved_indices = []
            saved_states = []

            # Application du mouvement
            if active_phase == 'hard':
                # Mouvements génériques pour casser les conflits hard
                idx, old_room, old_slot = self._apply_hard_move(schedule, unlocked)
                saved_indices = [idx]
                saved_states = [(old_room, old_slot)]
            else:
                # Mouvements spécialisés pour réduire les pénalités soft
                saved_indices, saved_states = self._apply_soft_move(schedule, unlocked)

            # Invalider le cache et recalculer
            schedule.fitness = None
            neighbor_fit = self.get_score(schedule)
            delta = neighbor_fit - current_fit

            # Critère de Metropolis
            if delta < 0 or (temp > 0 and random.random() < math.exp(-delta / temp)):
                # Acceptation
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_fit = current_fit
                    best_state = [(a.room, a.timeslot) for a in schedule.assignments]
            else:
                # REJET (P3 : Undo O(1))
                for i, (r, s) in zip(saved_indices, saved_states):
                    schedule.assignments[i].room = r
                    schedule.assignments[i].timeslot = s
                schedule.fitness = current_fit # Restaurer le score précédent

            temp *= self.sa_cooling

        # Restaurer le meilleur état trouvé
        for i, (r, s) in enumerate(best_state):
            schedule.assignments[i].room = r
            schedule.assignments[i].timeslot = s
    
        # Recalcul complet après restauration (important pour h_violations)
        schedule.fitness = None
        self.get_score(schedule)
        
        return schedule

    def _apply_hard_move(self, schedule, unlocked):
        """Mouvements génériques pour éliminer les violations Hard (H1-H4)."""
        idx = random.choice(unlocked)
        a = schedule.assignments[idx]
        old_room, old_slot = a.room, a.timeslot
        
        r = random.random()
        if r < 0.5:
            # Shift Both
            a.room = random.choice(self.dm.rooms)
            a.timeslot = random.choice(self.dm.timeslots)
        else:
            # Shift Room Only
            a.room = random.choice(self.dm.rooms)
            
        return idx, old_room, old_slot

    def _apply_soft_move(self, schedule, unlocked):
        """Mouvements spécialisés (P10) pour réduire les pénalités Soft."""
        r = random.random()
        changed_indices = []
        old_states = []

        if r < 0.35:
            # S1: StabilizeRoom (Réduit S6_Stability)
            # Aligner les salles pour un même module
            mid = random.choice([a.module_part.module_id for i, a in enumerate(schedule.assignments) if i in unlocked])
            target_room = random.choice(self.dm.rooms)
            for i in unlocked:
                if schedule.assignments[i].module_part.module_id == mid:
                    changed_indices.append(i)
                    old_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
                    schedule.assignments[i].room = target_room
        
        elif r < 0.65:
            # S2: CompactDay (Réduit S3_Gaps)
            # Rapprocher les séances d'un professeur sur le même jour
            idx = random.choice(unlocked)
            a = schedule.assignments[idx]
            prof_id = a.module_part.teacher_id
            prof_assigns = [schedule.assignments[i] for i in range(len(schedule.assignments)) if schedule.assignments[i].module_part.teacher_id == prof_id]
            if prof_assigns:
                ref_day = random.choice(prof_assigns).timeslot.day
                target_slot = random.choice([s for s in self.dm.timeslots if s.day == ref_day])
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot
        else:
            # Move générique pour maintenir la diversité
            idx, r, s = self._apply_hard_move(schedule, unlocked)
            changed_indices = [idx]
            old_states = [(r, s)]
            
        return changed_indices, old_states
