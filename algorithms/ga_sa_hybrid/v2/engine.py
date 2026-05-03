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
            "H9": True, "H10": True, "H12": True,
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
                # 80% de solutions intelligentes (hard constraints minimisés)
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
        """
        Heuristique Constructive Greedy  : Construit un individu séance par séance.
        
        L'objectif est d'aboutir à un emploi du temps presque valide dès le départ en vérifiant
        les conflits au moment du placement. Cela évite au GA/SA de perdre du temps sur des 
        configurations absurdes.
        """ 
        assignments = []
        
        # 1. Registres de suivi local (propres à cet individu pendant sa création)
        # Permettent une vérification de conflit en temps constant O(1)
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        sec_occupancy     = {} # Suivi partagé pour les CM et Groupes 6 (H13/H14)
        
        # 2. Analyse des dépendances entre sections
        # Deux sections sont "liées" si elles partagent au moins une filière.
        # Cela permet de garantir que les redoublants de la filière X ne ratent pas un cours.
        sec_to_filieres = {}
        for s in self.dm.sections:
            sec_to_filieres[s['id']] = set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
            
        related_sids = {}
        for s1 in self.dm.sections:
            sid1 = s1['id']
            related_sids[sid1] = []
            fils1 = sec_to_filieres.get(sid1, set())
            if not fils1: continue
            for s2 in self.dm.sections:
                sid2 = s2['id']
                if sid1 == sid2: continue
                # Si intersection non vide, les deux sections ont des étudiants communs
                if fils1.intersection(sec_to_filieres.get(sid2, set())):
                    related_sids[sid1].append(sid2)
        
        # Mélange des séances pour garantir la diversité génétique des individus
        module_parts_shuffled = list(self.dm.module_parts)
        random.shuffle(module_parts_shuffled)
        
        # 3. Processus de placement itératif (Glouton)
        for mp in module_parts_shuffled:
            is_cm = (mp.type == "CM")
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gid, "") for gid in mp.td_group_ids)
            sec_id = mp.section_id
            
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                # Priorité aux séances verrouillées par l'administration
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                
                # Échantillonnage stochastique : on teste 15 combinaisons au hasard
                # Le hasard garantit que tous les individus Greedy ne se ressemblent pas trop
                valid_slots = self._get_valid_slots(mp)
                candidate_slots = random.sample(valid_slots, min(15, len(valid_slots)))
                candidate_rooms = [r for r in self.dm.rooms if r.capacity >= mp.group_size]
                if not candidate_rooms: candidate_rooms = self.dm.rooms

                for slot in candidate_slots:
                    for room in candidate_rooms:
                        cost = 0
                        
                        # --- Vérification H1, H2, H3 (Ressources physiques) ---
                        t_id = mp.teacher_id
                        if t_id and t_id != 231 and (t_id, slot.id) in teacher_slot_used:
                            cost += 1000
                        if (room.id, slot.id) in room_slot_used:
                            cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, slot.id) in group_slot_used:
                                cost += 1000
                        
                        # --- Vérification H9 (Indisponibilité enseignant) ---
                        if t_id and t_id != 231:
                            prof_obj = self.dm.teacher_map.get(t_id)
                            if prof_obj and slot.id in prof_obj.unavailable_slots:
                                cost += 1000
                        
                        # --- Vérification H10 (Compatibilité Type Salle) ---
                        if mp.required_room_type and room.type != mp.required_room_type:
                            cost += 1000
                        
                        # --- Vérification H12 (Interdiction Samedi) ---
                        if slot.day == "SAMEDI":
                            if is_cm: cost += 100000 
                            else:     cost += 15000  # Forte dissuasion pour les TD
                            
                        # --- Vérification H13/H14 (Chevauchement de filières) ---
                        if sec_id:
                            for r_sid in related_sids.get(sec_id, []):
                                r_status = sec_occupancy.get((r_sid, slot.id))
                                if r_status:
                                    # Si un CM ou un Gr 6 est déjà présent dans une section liée
                                    if (is_cm or is_gr6) and r_status['any']:
                                        cost += 3000
                                    elif r_status['cm'] or r_status['gr6']:
                                        cost += 3000

                        # Critère d'acceptation du glouton
                        if cost < best_cost:
                            best_cost = cost
                            best_room, best_slot = room, slot
                            if cost == 0: break # On prend la première place parfaite trouvée
                    if best_cost == 0: break
                
                room, slot = best_room, best_slot
            
            # 4. Finalisation et mise à jour des registres de l'individu
            if mp.teacher_id and mp.teacher_id != 231:
                teacher_slot_used[(mp.teacher_id, slot.id) ] = True
            room_slot_used[(room.id, slot.id)] = True
            for gid in mp.td_group_ids:
                group_slot_used[(gid, slot.id)] = True
            
            if sec_id:
                key_sec = (sec_id, slot.id)
                if key_sec not in sec_occupancy: 
                    sec_occupancy[key_sec] = {'cm': False, 'gr6': False, 'any': False}
                sec_occupancy[key_sec]['any'] = True
                if is_cm:  sec_occupancy[key_sec]['cm'] = True
                if is_gr6: sec_occupancy[key_sec]['gr6'] = True
            
            assignments.append(Assignment(mp, room, slot))
            
        return Schedule(self.dm, assignments)

   
    # SECTION D : EVOLUTION (UNE GENERATION GA COMPLETE)
    # ==========================================================================

    def inject_diversity(self, n_replace=None):
        """
        Anti-stagnation : Remplace une partie de la population par de nouveaux
        individus greedy pour sortir des plateaux profonds .
        Appelé depuis main_solver.py quand le meilleur score ne bouge plus.
        """
        if n_replace is None:
            n_replace = max(2, self.pop_size // 3)  # Remplace 33% de la population
        
        # Toujours garder les élites
        kept = self.population[:self.elitism]
        new_blood = [self._build_greedy_individual() for _ in range(n_replace)]
        
        # Remplacer les pires individus (fin de liste, après tri)
        self.population = kept + new_blood + self.population[self.elitism:self.pop_size - n_replace]
        
        # Re-scorer pour que la prochaine génération parte proprement
        for ind in new_blood:
            self.get_score(ind)

    def evolve(self):
        """
        Exécute un cycle complet d'évolution mémétique (Génération GA + Raffinement SA).
        
        Processus :
        1. ÉLITISME : Préservation des meilleurs individus pour garantir la non-régression.
        2. POLISSAGE ÉLITE : Application du SA sur les élites pour franchir les paliers locaux.
        3. REPRODUCTION : 
           - Sélection par tournoi (Tournament Selection) riche en diversité.
           - Croisement uniforme par module pour préserver les blocs cohérents.
        4. MUTATION : Modification aléatoire ciblée sur les zones de conflit.
        5. MÉMÉTIQUE : Chaque enfant subit une recherche locale intensive (SA) avant insertion.
        6. SURVIE : Remplacement de l'ancienne population par les nouveaux individus polis.
        """
        # 1. Tri de la population par fitness (utilisation du cache)
        self.population.sort(key=lambda x: self.get_score(x))

        # 2. Elitisme : conserver les E meilleurs directement
        new_gen = self.population[:self.elitism]
        
        # 2.5 SA sur l'Elite : Indispensable pour franchir les derniers paliers locaux (H=1/3 à H=0)
        for i in range(len(new_gen)):
            new_gen[i] = self.simulated_annealing_search(new_gen[i])

        # 3. Produire les (Pop_size - E) autres individus
        while len(new_gen) < self.pop_size:

            # a. Selection par Tournoi : lire directement le cache fitness (
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)

            # b. Croisement Uniforme : creer un Enfant
            child = self.crossover(p1, p2)
            child.fitness = None  # Invalider : le crossover casse le cache (

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
        Croisement Uniforme par Module (Module-preserving Crossover).
        
        Contrairement au croisement classique point par point, nous opérons ici au niveau 
        de l'entité 'Module'. L'objectif est de préserver la cohérence interne des matières 
        (CM/TD/TP) en ne les séparant pas entre deux parents différents.
        """
        # 1. Analyse de la structure sémantique (On groupe les indices par module_id)
        module_groups = {}
        for i, a in enumerate(p1.assignments):
            mid = a.module_part.module_id
            module_groups.setdefault(mid, []).append(i)

        new_assignments = [None] * len(p1.assignments)

        # 2. Transmission génétique par bloc
        for module_id, indices in module_groups.items():
            # Pour chaque module, on tire au sort quel parent transmet ses gènes
            # pile (Parent 1) ou face (Parent 2)
            parent = p1 if random.random() < 0.5 else p2
            
            for i in indices:
                # On recopie l'affectation complète (salle + créneau) de ce parent
                orig = parent.assignments[i]
                new_assignments[i] = Assignment(orig.module_part, orig.room, orig.timeslot)

        return Schedule(self.dm, new_assignments)

    def mutate(self, schedule):
        """
        Mutation Pondérée  : Focalise l'exploration sur les zones de conflit.
        
        Plutôt que de muter une séance au hasard, on calcule un poids pour chaque gène.
        L'algorithme a ainsi beaucoup plus de chances de modifier une séance qui viole
        une contrainte Hard qu'une séance déjà parfaitement placée.
        """
        if not schedule.assignments:
            return
            
        # On ne mute que les séances qui ne sont pas verrouillées par l'utilisateur
        unlocked = [(i, a) for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked:
            return
            
        # 1. Analyse des conflits actuels pour définir les priorités de mutation
        # On appelle une version ultra-rapide du calcul de pénalités (Hard seulement)
        penalties = self._compute_rough_penalties(schedule)
        
        # 2. Création de la liste des poids : (Poids élevé = Haute probabilité de mutation)
        weights = [penalties.get(i, 0.1) for i, _ in unlocked]
        
        # 3. Sélection de la séance à muter (Tirage au sort pondéré)
        indices_list = [i for i, _ in unlocked]
        idx = random.choices(indices_list, weights=weights, k=1)[0]
        
        # 4. Mutation effective : Changement aléatoire de la salle ET du créneau
        schedule.assignments[idx].room     = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)

    def _compute_rough_penalties(self, schedule):
        """
        Calculateur de 'Chaleur' (Rough Penalties).
        Scan rapide de la population pour identifier les indices 'coupeables' de conflits.
        """
        penalties = {}
        # Dictionnaires pour détecter les doublons au vol
        prof_slots = {}
        room_slots = {}
        group_slots = {}
        
        for i, a in enumerate(schedule.assignments):
            # Poids de base (0.1) pour permettre une exploration résiduelle même sans conflit
            penalties[i] = 0.1 
            
            # Détection Conflit Enseignant (H1)
            if a.module_part.teacher_id:
                key = (a.module_part.teacher_id, a.timeslot.id)
                if key in prof_slots:
                    penalties[i] += 1000
                    penalties[prof_slots[key]] += 1000
                prof_slots[key] = i
            
            # Détection Conflit Salle (H2)
            key_r = (a.room.id, a.timeslot.id)
            if key_r in room_slots:
                penalties[i] += 1000
                penalties[room_slots[key_r]] += 1000
            room_slots[key_r] = i
            
            # Détection Conflit Groupes d'étudiants (H3)
            for g_id in a.module_part.td_group_ids:
                key_g = (g_id, a.timeslot.id)
                if key_g in group_slots:
                    penalties[i] += 1000
                    penalties[group_slots[key_g]] += 1000
                group_slots[key_g] = i
                
        return penalties

    
    # SECTION F : RECHERCHE LOCALE (RECUIT SIMULE LOCAL - SA)
    # ==========================================================================

    def _find_conflicting_indices(self, schedule):
        """Identifie les indices des assignments qui causent un conflit de groupe (H3).
        Retourne une liste d'indices ciblés pour le mouvement hard."""
        group_slots = {}
        conflicting = set()
        for i, a in enumerate(schedule.assignments):
            ts = a.timeslot.id
            for gid in a.module_part.td_group_ids:
                key = (gid, ts)
                if key in group_slots:
                    conflicting.add(i)
                    conflicting.add(group_slots[key])
                else:
                    group_slots[key] = i
        return list(conflicting)

    def simulated_annealing_search(self, schedule):
        """
        Recherche Locale par Recuit Simulé (SA) optimisée.
        
        Cette méthode affine l'individu en explorant son voisinage. Elle utilise
        une logique bi-phasée (Hard d'abord, puis Soft) et une modification
        directe (In-place) avec capacité d'annulation (Undo) pour maximiser les performances.
        """
        current_sch = schedule
        current_fit = self.get_score(current_sch)
        
        # Température initiale adaptative basée sur la qualité actuelle
        temp = max(self.sa_temp, current_fit * 0.05)
        
        best_fit = current_fit
        best_state = [(a.room, a.timeslot) for a in schedule.assignments]
        
        # Détermination de la phase active
        active_phase = 'hard' if schedule.h_violations > 0 else 'soft'

        # CIBLAGE : On identifie les gènes à problèmes une seule fois pour économiser du CPU
        unlocked_set_full = set(i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked)
        conflict_cache = []
        if active_phase == 'hard':
            raw_conflicts = self._find_conflicting_indices(schedule)
            conflict_cache = [i for i in raw_conflicts if i in unlocked_set_full]
        
        refresh_counter = 0

        for it in range(self.sa_iterations):
            # Passage dynamique à la phase soft si le problème hard est résolu à mi-parcours
            if it == self.sa_iterations // 2 and active_phase == 'hard':
                if schedule.h_violations == 0:
                    active_phase = 'soft'
                    conflict_cache = []

            unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
            if not unlocked: break

            saved_indices = []
            saved_states = []

            # Choix et application du mouvement selon la phase
            if active_phase == 'hard':
                # Stratégie 70/30 : On cible les conflits 70% du temps, le reste en exploration libre
                if random.random() < 0.7 and conflict_cache:
                    targeted_unlocked = conflict_cache
                else:
                    targeted_unlocked = unlocked
                saved_indices, saved_states = self._apply_hard_move(schedule, targeted_unlocked)
            else:
                # Mouvements "Métier" (Salles, Profs, Gaps)
                saved_indices, saved_states = self._apply_soft_move(schedule, unlocked)

            # Recalcul du score (get_score gère l'invalidation du cache)
            schedule.fitness = None
            neighbor_fit = self.get_score(schedule)
            delta = neighbor_fit - current_fit

            # Critère d'acceptation de Metropolis
            if delta < 0 or (temp > 0 and random.random() < math.exp(-delta / temp)):
                # Mouvement accepté
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_fit = current_fit
                    best_state = [(a.room, a.timeslot) for a in schedule.assignments]
                
                # Mise à jour périodique du cache des conflits si nécessaire
                if active_phase == 'hard':
                    refresh_counter += 1
                    if refresh_counter >= 20: 
                        refresh_counter = 0
                        raw_conflicts = self._find_conflicting_indices(schedule)
                        unlocked_set_full = set(i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked)
                        conflict_cache = [i for i in raw_conflicts if i in unlocked_set_full]
            else:
                # REJET : On annule le mouvement en O(1) grâce aux états sauvegardés
                for i, (r, s) in zip(saved_indices, saved_states):
                    schedule.assignments[i].room = r
                    schedule.assignments[i].timeslot = s
                schedule.fitness = current_fit 

            # Refroidissement géométrique
            temp *= self.sa_cooling

        # On applique le meilleur état rencontré durant toute la recherche locale
        for i, (r, s) in enumerate(best_state):
            schedule.assignments[i].room = r
            schedule.assignments[i].timeslot = s
    
        # Recalcul final indispensable
        schedule.fitness = None
        self.get_score(schedule)
        
        return schedule

    def _get_valid_slots(self, mp):
        """Retourne les créneaux autorisés (Interdit le Samedi pour les CM)."""
        if mp.type == "CM":
            return [s for s in self.dm.timeslots if s.day != "SAMEDI"]
        return self.dm.timeslots

    def _apply_hard_move(self, schedule, unlocked):
        """
        Mouvements Génériques (P6) : Vise la résolution des conflits physiques (H1-H4).
        
        L'algorithme choisit entre trois types d'actions :
        1. Shift Complet (40%) : Change la salle et le créneau.
        2. Shift Salle (30%)   : Change uniquement la salle (utile si le créneau est bon).
        3. Swap Intra (30%)    : Échange sa place avec un autre cours du même groupe ou section.
        """
        idx = random.choice(unlocked)
        a = schedule.assignments[idx]
        old_room, old_slot = a.room, a.timeslot
        
        # Identification des ressources valides pour cette séance
        valid_slots = self._get_valid_slots(a.module_part)
        valid_rooms = [r for r in self.dm.rooms if r.capacity >= a.module_part.group_size]
        if a.module_part.required_room_type:
            valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
        if not valid_rooms: valid_rooms = self.dm.rooms # Fallback
        
        r = random.random()
        if r < 0.4:
            # Action 1 : Déplacement total
            a.room = random.choice(valid_rooms)
            a.timeslot = random.choice(valid_slots)
            return [idx], [(old_room, old_slot)]
        elif r < 0.7:
            # Action 2 : Réallocation de salle
            a.room = random.choice(valid_rooms)
            return [idx], [(old_room, old_slot)]
        else:
            # Action 3 : SWAP Intra-Groupe / Intra-Section
            # On cherche une autre séance avec laquelle on pourrait intervertir nos créneaux
            sec_id = a.module_part.section_id
            a_groups = set(a.module_part.td_group_ids)
            
            candidates = [
                i for i in unlocked 
                if i != idx and (
                    (sec_id and schedule.assignments[i].module_part.section_id == sec_id) or
                    a_groups.intersection(schedule.assignments[i].module_part.td_group_ids)
                )
            ]
            
            if candidates:
                other_idx = random.choice(candidates)
                other = schedule.assignments[other_idx]
                
                # Vérification de sécurité pour le Samedi (H12)
                if (a.module_part.type == "CM" and other.timeslot.day == "SAMEDI") or \
                   (other.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
                    a.timeslot = random.choice(valid_slots)
                    return [idx], [(old_room, old_slot)]

                # Échange de références (Double modification In-place)
                old_room_other, old_slot_other = other.room, other.timeslot
                a.timeslot, other.timeslot = other.timeslot, a.timeslot
                return [idx, other_idx], [(old_room, old_slot), (old_room_other, old_slot_other)]
            else:
                a.timeslot = random.choice(valid_slots)
                return [idx], [(old_room, old_slot)]

    def _apply_soft_move(self, schedule, unlocked):
        """
        Mouvements Métier (P6 & P10) : Vise le confort pédagogique (S1-S8).
        
        Cette méthode n'est activée que lorsque H=0. Elle utilise une intelligence
        métier pour regrouper les cours au lieu de simplement les déplacer au hasard.
        """
        r = random.random()
        changed_indices, old_states = [], []

        # LOGIQUE 1 : STABILISATION DES SALLES (Optimise S6)
        # On essaie de mettre toutes les séances d'un module dans la même salle.
        if r < 0.25:
            mid_options = [(a.module_part.module_id, a.module_part.type) for i, a in enumerate(schedule.assignments) if i in unlocked]
            if not mid_options: return self._apply_hard_move(schedule, unlocked)
            mid, m_type = random.choice(mid_options)
            
            target_assigns = [i for i in unlocked if schedule.assignments[i].module_part.module_id == mid and schedule.assignments[i].module_part.type == m_type]
            max_cap = max(schedule.assignments[i].module_part.group_size for i in target_assigns)
            req_type = schedule.assignments[target_assigns[0]].module_part.required_room_type
            
            valid_rooms = [r for r in self.dm.rooms if r.capacity >= max_cap]
            if req_type: valid_rooms = [r for r in valid_rooms if r.type == req_type]
            if not valid_rooms: valid_rooms = self.dm.rooms
            
            target_room = random.choice(valid_rooms)
            
            for i in target_assigns:
                changed_indices.append(i)
                old_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
                schedule.assignments[i].room = target_room
        
        # LOGIQUE 2 : COMPACTAGE PROFESSEUR (Optimise S3 Profs)
        # On déplace un cours vers un jour où le prof a déjà d'autres cours.
        elif r < 0.55:
            idx = random.choice(unlocked)
            a = schedule.assignments[idx]
            prof_id = a.module_part.teacher_id
            
            prof_assigns = [schedule.assignments[i] for i in unlocked 
                            if schedule.assignments[i].module_part.teacher_id == prof_id and i != idx]
            
            if prof_assigns:
                ref_day = random.choice(prof_assigns).timeslot.day
                target_slot = random.choice([s for s in self.dm.timeslots if s.day == ref_day])
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot
            else:
                changed_indices, old_states = self._apply_hard_move(schedule, unlocked)

        # LOGIQUE 3 : COMPACTAGE ÉTUDIANT (Optimise S3/S7 Sections)
        # On déplace un cours vers un jour déjà occupé pour la section.
        elif r < 0.85:
            idx = random.choice(unlocked)
            a = schedule.assignments[idx]
            sec_id = a.module_part.section_id
            
            sec_assigns = [schedule.assignments[i] for i in unlocked 
                           if schedule.assignments[i].module_part.section_id == sec_id and i != idx] if sec_id else []
            
            if sec_assigns:
                ref_day = random.choice(sec_assigns).timeslot.day
                target_slot = random.choice([s for s in self.dm.timeslots if s.day == ref_day])
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot
            else:
                changed_indices, old_states = self._apply_hard_move(schedule, unlocked)
        
        # LOGIQUE 4 : EXPLORATION ALÉATOIRE (Diversité)
        else:
            changed_indices, old_states = self._apply_hard_move(schedule, unlocked)
            
        return changed_indices, old_states
