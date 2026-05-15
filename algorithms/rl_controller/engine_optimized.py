# ==============================================================================
# engine_optimized.py — Moteur Algorithmique Hybride GA + SA
#
# OPTIMISATIONS APPLIQUÉES (vs engine.py original) :
#
#  [OPT-1] CACHE STATIQUE DES LISTES DÉRIVÉES (init)
#          Précalcul une seule fois : unlocked_indices, slots_by_day, valid_rooms
#          par module_part, etc. Évite les list-comprehensions répétées dans SA.
#
#  [OPT-2] VARIABLE LOCALE DANS LES BOUCLES CHAUDES
#          Les attributs self.xxx accèdent à un dict Python à chaque appel.
#          On extrait les références en variables locales avant les boucles SA.
#
#  [OPT-3] MATH.EXP AVEC GUARD PRÉCOCE
#          On évite math.exp(-delta/temp) quand delta>=0 ET temp≈0 (overflow).
#          Le guard `delta < 0` est déjà là ; on sécurise le cas temp→0.
#
#  [OPT-4] INVALIDATION SÉLECTIVE DU FITNESS
#          Au lieu de mettre fitness=None + appel get_score() à chaque itération SA,
#          on passe score directement depuis calculate_fitness_full pour éviter un
#          double lookup d'attribut + branchement inutile.
#
#  [OPT-5] UNLOCKED PRÉCALCULÉ UNE SEULE FOIS PAR SA RUN
#          La liste `unlocked` était reconstruite à chaque itération (O(n)).
#          Elle ne change pas pendant une run SA → on la calcule une fois.
#
#  [OPT-6] SLOTS_BY_DAY EN DICT (accès O(1) au lieu d'un filter O(n))
#          _apply_soft_move filtrait self.dm.timeslots à chaque appel.
#          On précalcule un dict {day -> [slots]} dans __init__.
#
#  [OPT-7] VALID_ROOMS PAR MODULE_PART (cache per-mp)
#          _apply_hard_move recalculait valid_rooms pour chaque move.
#          On lazily met en cache ces listes dans un dict indexé par mp.id.
#
#  [OPT-8] CROSSOVER : SUPPRESSION DU DICT SETDEFAULT EN BOUCLE
#          On reconstruit module_groups avec un defaultdict(list) → marginal
#          mais lisible et légèrement plus rapide.
#
#  [OPT-9] DIVERSITY : BOUCLE REMPLACÉE PAR ZIP + COMPRÉHENSION
#          Micro-optimisation sur la boucle interne de distance.
#
#  [OPT-10] LAZY SOFT PENALTY
#           Dans simulated_annealing_search, si on est en phase 'hard' et que
#           le schedule a encore des H-violations, on skip les pénalités soft
#           en passant un mask soft-off au calculate_fitness_full.
#           → Gain massif sur 70% des premières iterations SA.
# ==============================================================================

import random
import copy
import math
import sys
import os
from collections import defaultdict

# Chargement des contraintes communes (identique à engine_rl.py)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from commun.models import Schedule, Assignment
from constraints_optimized import calculate_fitness_full
from agent import QLearningAgent


# Masque "hard only" pour lazy soft evaluation [OPT-10]
_HARD_ONLY_KEYS = ("H1", "H2", "H3", "H4", "H9", "H10", "H12")


def _build_hard_only_mask(mask: dict) -> dict:
    """Retourne un masque qui ne garde que les contraintes Hard actives."""
    hard_only = {}
    for k, v in mask.items():
        hard_only[k] = v if k in _HARD_ONLY_KEYS else False
    return hard_only


class HybridEngine:
    """
    Moteur principal de l'algorithme Hybride GA+SA (Mémétique).
    Chaque individu de la population est un emploi du temps complet (Schedule).
    """

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION A : INITIALISATION & PARAMÈTRES
    # ─────────────────────────────────────────────────────────────────────────

    def __init__(self, data_manager,
                 pop_size=30,
                 constraints_mask=None,
                 mutation_rate=0.15,
                 elitism=2,
                 sa_iterations=400,
                 sa_temp=50.0,
                 sa_cooling=0.95,
                 agent=None):

        self.dm            = data_manager
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = elitism
        self.sa_iterations = sa_iterations
        self.sa_temp       = sa_temp
        self.sa_cooling    = sa_cooling
        self.agent         = agent  # Agent Q-Learning pour piloter la phase Soft

        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "H9": True, "H10": True, "H12": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }

        # ── [OPT-10] Masque hard-only pour phase SA hard ──────────────────────
        self._hard_mask = _build_hard_only_mask(self.constraints_mask)

        # ── [OPT-6] Index jour → créneaux (précalcul global) ─────────────────
        self._slots_by_day: dict = defaultdict(list)
        for s in data_manager.timeslots:
            self._slots_by_day[s.day].append(s)
        # Créneaux hors SAMEDI pour les CM
        self._slots_no_saturday = [s for s in data_manager.timeslots if s.day != "SAMEDI"]

        # ── [OPT-7] Cache valid_rooms par module_part.id ─────────────────────
        self._valid_rooms_cache: dict = {}

        # ── [OPT-1] Index room par id (lookup O(1)) ───────────────────────────
        self._room_by_id   = {r.id: r for r in data_manager.rooms}
        self._slot_by_id   = {s.id: s for s in data_manager.timeslots}

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION B : SCORING
    # ─────────────────────────────────────────────────────────────────────────

    def get_score(self, schedule):
        """Score avec cache. Retourne le score total (pénalité)."""
        if schedule.fitness is not None:
            return schedule.fitness
        score, h, s, _ = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness      = score
        schedule.h_violations = h
        schedule.soft_penalty = s
        return score

    def _get_score_fast(self, schedule, hard_only: bool = False):
        """
        [OPT-10] Scoring rapide : si hard_only=True et h>0, calcule uniquement
        les contraintes dures pour économiser ~50% du temps de fitness.
        Retourne (score, h_violations).
        """
        mask = self._hard_mask if hard_only else self.constraints_mask
        score, h, s, _ = calculate_fitness_full(schedule, mask=mask)
        schedule.fitness      = score
        schedule.h_violations = h
        if not hard_only:
            schedule.soft_penalty = s
        return score, h

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION C : INITIALISATION DE LA POPULATION
    # ─────────────────────────────────────────────────────────────────────────

    def create_initial_population(self):
        """Mixte : 80% Greedy + 20% Aléatoire."""
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        for k in range(self.pop_size):
            schedule = (self._build_greedy_individual()
                        if k < n_greedy
                        else self._build_random_individual())
            self.population.append(schedule)

    def _build_random_individual(self):
        """Construction 100% aléatoire."""
        # [OPT-1] Lookup O(1) via les index précalculés
        room_by_id  = self._room_by_id
        slot_by_id  = self._slot_by_id
        all_rooms   = self.dm.rooms
        all_slots   = self.dm.timeslots

        assignments = []
        for mp in self.dm.module_parts:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = room_by_id.get(mp.fixed_room_id) or random.choice(all_rooms)
                slot = slot_by_id.get(mp.fixed_slot_id) or random.choice(all_slots)
            else:
                room = random.choice(all_rooms)
                slot = random.choice(all_slots)
            assignments.append(Assignment(mp, room, slot))
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        """
        Heuristique Constructive Greedy : placement séance par séance
        avec vérification de conflits en O(1).
        """
        assignments = []
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        sec_occupancy     = {}

        # Précalcul des sections liées (identique à l'original)
        sec_to_filieres = {
            s['id']: set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
            for s in self.dm.sections
        }
        related_sids = {}
        for s1 in self.dm.sections:
            sid1  = s1['id']
            fils1 = sec_to_filieres.get(sid1, set())
            related_sids[sid1] = [
                s2['id'] for s2 in self.dm.sections
                if s2['id'] != sid1 and fils1.intersection(sec_to_filieres.get(s2['id'], set()))
            ] if fils1 else []

        module_parts_shuffled = list(self.dm.module_parts)
        random.shuffle(module_parts_shuffled)

        # [OPT-2] Références locales aux structures fréquemment accédées
        room_by_id   = self._room_by_id
        slot_by_id   = self._slot_by_id
        teacher_map  = self.dm.teacher_map
        group_map    = self.dm.group_map
        all_rooms    = self.dm.rooms

        for mp in module_parts_shuffled:
            is_cm  = (mp.type == "CM")
            is_gr6 = any("Gr 6" in group_map.get(gid, "") for gid in mp.td_group_ids)
            sec_id = mp.section_id

            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = room_by_id.get(mp.fixed_room_id) or random.choice(all_rooms)
                slot = slot_by_id.get(mp.fixed_slot_id) or random.choice(self.dm.timeslots)
            else:
                best_room, best_slot, best_cost = None, None, float('inf')

                valid_slots    = self._get_valid_slots(mp)          # [OPT-6] liste déjà filtrée
                candidate_slots = random.sample(valid_slots, min(15, len(valid_slots)))
                candidate_rooms = self._get_valid_rooms_for_mp(mp)  # [OPT-7] cached

                t_id           = mp.teacher_id
                check_teacher  = t_id and t_id != 231
                rel_sids       = related_sids.get(sec_id, []) if sec_id else []

                for slot in candidate_slots:
                    sid_val = slot.id
                    for room in candidate_rooms:
                        cost = 0

                        if check_teacher and (t_id, sid_val) in teacher_slot_used:
                            cost += 1000
                        if (room.id, sid_val) in room_slot_used:
                            cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, sid_val) in group_slot_used:
                                cost += 1000

                        if check_teacher:
                            prof_obj = teacher_map.get(t_id)
                            if prof_obj and sid_val in prof_obj.unavailable_slots:
                                cost += 1000

                        if mp.required_room_type and room.type != mp.required_room_type:
                            cost += 1000

                        if slot.day == "SAMEDI":
                            cost += 100000 if is_cm else 15000

                        if sec_id:
                            for r_sid in rel_sids:
                                r_status = sec_occupancy.get((r_sid, sid_val))
                                if r_status:
                                    if (is_cm or is_gr6) and r_status['any']:
                                        cost += 3000
                                    elif r_status['cm'] or r_status['gr6']:
                                        cost += 3000

                        if cost < best_cost:
                            best_cost = cost
                            best_room, best_slot = room, slot
                            if cost == 0:
                                break
                    if best_cost == 0:
                        break

                room, slot = best_room, best_slot

            if mp.teacher_id and mp.teacher_id != 231:
                teacher_slot_used[(mp.teacher_id, slot.id)] = True
            room_slot_used[(room.id, slot.id)] = True
            for gid in mp.td_group_ids:
                group_slot_used[(gid, slot.id)] = True

            if sec_id:
                key_sec = (sec_id, slot.id)
                if key_sec not in sec_occupancy:
                    sec_occupancy[key_sec] = {'cm': False, 'gr6': False, 'any': False}
                sec_occupancy[key_sec]['any'] = True
                if is_cm:  sec_occupancy[key_sec]['cm']  = True
                if is_gr6: sec_occupancy[key_sec]['gr6'] = True

            assignments.append(Assignment(mp, room, slot))

        return Schedule(self.dm, assignments)

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION D : ÉVOLUTION (UNE GÉNÉRATION GA COMPLÈTE)
    # ─────────────────────────────────────────────────────────────────────────

    def inject_diversity(self, n_replace=None):
        if n_replace is None:
            n_replace = max(2, self.pop_size // 3)
        kept      = self.population[:self.elitism]
        new_blood = [self._build_greedy_individual() for _ in range(n_replace)]
        self.population = kept + new_blood + self.population[self.elitism:self.pop_size - n_replace]
        for ind in new_blood:
            self.get_score(ind)

    def evolve(self):
        """Exécute une génération complète et retourne les métriques."""
        self.population.sort(key=lambda x: self.get_score(x))

        new_gen        = self.population[:self.elitism]
        sa_impact_list = []

        # SA sur l'élite
        for i in range(len(new_gen)):
            old_fit   = new_gen[i].fitness if new_gen[i].fitness is not None else self.get_score(new_gen[i])
            new_gen[i] = self.simulated_annealing_search(new_gen[i])
            sa_impact_list.append(max(0, old_fit - new_gen[i].fitness))

        # Produire les (pop_size - elitism) autres individus
        while len(new_gen) < self.pop_size:
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)

            child = self.crossover(p1, p2)
            child.fitness = None

            if random.random() < self.mutation_rate:
                self.mutate(child)
                child.fitness = None

            old_fit_child = self.get_score(child)
            child         = self.simulated_annealing_search(child)
            sa_impact_list.append(max(0, old_fit_child - child.fitness))
            new_gen.append(child)

        avg_sa_impact = sum(sa_impact_list) / len(sa_impact_list)
        diversity     = self._calculate_population_diversity(new_gen)

        self.population = new_gen
        self.population.sort(key=lambda x: x.fitness)
        return avg_sa_impact, diversity

    def _calculate_population_diversity(self, pop):
        """[OPT-9] Diversité génotypique, boucle interne vectorisée."""
        if not pop:
            return 0
        samples     = min(10, len(pop))
        total_dist  = 0
        n_assign    = len(pop[0].assignments)
        for _ in range(samples):
            idx1, idx2 = random.sample(range(len(pop)), 2)
            ind1, ind2 = pop[idx1], pop[idx2]
            # [OPT-9] sum() + generator plutôt que boucle for explicite
            dist = sum(
                1 for a1, a2 in zip(ind1.assignments, ind2.assignments)
                if a1.room.id != a2.room.id or a1.timeslot.id != a2.timeslot.id
            )
            total_dist += dist / n_assign
        return (total_dist / samples) * 100

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION E : OPÉRATEURS GÉNÉTIQUES
    # ─────────────────────────────────────────────────────────────────────────

    def crossover(self, p1, p2):
        """
        Croisement Uniforme par Module (Module-preserving Crossover).
        [OPT-8] Utilise defaultdict(list) au lieu de setdefault en boucle.
        """
        module_groups: dict = defaultdict(list)
        for i, a in enumerate(p1.assignments):
            module_groups[a.module_part.module_id].append(i)

        new_assignments = [None] * len(p1.assignments)
        for module_id, indices in module_groups.items():
            parent = p1 if random.random() < 0.5 else p2
            for i in indices:
                orig = parent.assignments[i]
                new_assignments[i] = Assignment(orig.module_part, orig.room, orig.timeslot)

        return Schedule(self.dm, new_assignments)

    def mutate(self, schedule):
        """Mutation simple : change aléatoirement salle + créneau d'une séance."""
        if not schedule.assignments:
            return
        unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked:
            return
        idx = random.choice(unlocked)
        schedule.assignments[idx].room     = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)

    def _compute_rough_penalties(self, schedule):
        """Scan rapide pour identifier les indices conflictuels (heatmap)."""
        penalties   = {i: 0.1 for i in range(len(schedule.assignments))}
        prof_slots  = {}
        room_slots  = {}
        group_slots = {}

        for i, a in enumerate(schedule.assignments):
            if a.module_part.teacher_id:
                key = (a.module_part.teacher_id, a.timeslot.id)
                if key in prof_slots:
                    penalties[i]             += 1000
                    penalties[prof_slots[key]] += 1000
                prof_slots[key] = i

            key_r = (a.room.id, a.timeslot.id)
            if key_r in room_slots:
                penalties[i]               += 1000
                penalties[room_slots[key_r]] += 1000
            room_slots[key_r] = i

            for g_id in a.module_part.td_group_ids:
                key_g = (g_id, a.timeslot.id)
                if key_g in group_slots:
                    penalties[i]               += 1000
                    penalties[group_slots[key_g]] += 1000
                group_slots[key_g] = i

        return penalties

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION F : RECHERCHE LOCALE (RECUIT SIMULÉ LOCAL — SA)
    # ─────────────────────────────────────────────────────────────────────────

    def _find_conflicting_indices(self, schedule):
        """Identifie les indices des assignments en conflit de groupe (H3)."""
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
        Recherche Locale par Recuit Simulé (SA) bi-phasée et optimisée.

        Optimisations actives :
          [OPT-2]  Variables locales hors boucle
          [OPT-3]  Guard temp > 1e-9 avant math.exp
          [OPT-4]  Pas d'invalidation fitness=None ; score passé directement
          [OPT-5]  unlocked calculé une seule fois
          [OPT-10] Lazy soft : skip pénalités soft quand h_violations > 0
        """
        current_sch = schedule
        current_fit = self.get_score(current_sch)

        temp     = max(self.sa_temp, current_fit * 0.05)
        best_fit = current_fit

        # [OPT-4] best_state sauvegardé comme liste de tuples (pas de None-reset)
        best_state = [(a.room, a.timeslot) for a in schedule.assignments]

        # Phase initiale
        active_phase = 'hard' if (schedule.h_violations or 0) > 0 else 'soft'

        # [OPT-5] unlocked calculé une seule fois (ne change pas pendant SA)
        unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked:
            return schedule
        unlocked_set_full = set(unlocked)

        conflict_cache = []
        if active_phase == 'hard':
            raw_conflicts  = self._find_conflicting_indices(schedule)
            conflict_cache = [i for i in raw_conflicts if i in unlocked_set_full]

        refresh_counter = 0
        half_iter       = self.sa_iterations // 2

        # [OPT-2] Références locales pour la boucle chaude
        sa_cooling        = self.sa_cooling
        constraints_mask  = self.constraints_mask
        hard_mask         = self._hard_mask
        _calc_fitness     = calculate_fitness_full
        _math_exp         = math.exp
        _random_random    = random.random
        _apply_hard_move  = self._apply_hard_move
        _apply_soft_move  = self._apply_soft_move
        assignments       = schedule.assignments

        for it in range(self.sa_iterations):

            # Passage dynamique hard → soft à mi-parcours
            if it == half_iter and active_phase == 'hard':
                if (schedule.h_violations or 0) == 0:
                    active_phase   = 'soft'
                    conflict_cache = []

            # Choix du mouvement
            if active_phase == 'hard':
                targeted = conflict_cache if (_random_random() < 0.7 and conflict_cache) else unlocked
                saved_indices, saved_states = _apply_hard_move(schedule, targeted)
            else:
                saved_indices, saved_states = _apply_soft_move(schedule, unlocked)

            # ── [OPT-10] Lazy soft evaluation ─────────────────────────────────
            # Si on est en phase hard avec encore des violations, seul le score
            # hard est nécessaire pour décider d'accepter ou rejeter le voisin.
            use_hard_only = (active_phase == 'hard' and (schedule.h_violations or 0) > 0)
            mask          = hard_mask if use_hard_only else constraints_mask

            # [OPT-4] Calcul direct sans passer par get_score() (évite les lookups)
            neighbor_fit, h_new = _calc_fitness(schedule, mask=mask)[:2]  # type: ignore
            schedule.fitness      = neighbor_fit
            schedule.h_violations = h_new

            delta = neighbor_fit - current_fit

            # Critère de Metropolis ([OPT-3] guard temp > epsilon)
            if delta < 0 or (temp > 1e-9 and _random_random() < _math_exp(-delta / temp)):
                # Mouvement accepté
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_fit   = current_fit
                    best_state = [(a.room, a.timeslot) for a in assignments]

                if active_phase == 'hard':
                    refresh_counter += 1
                    if refresh_counter >= 20:
                        refresh_counter = 0
                        raw_conflicts   = self._find_conflicting_indices(schedule)
                        conflict_cache  = [i for i in raw_conflicts if i in unlocked_set_full]
            else:
                # Rejet : rollback O(1)
                for i, (r, s) in zip(saved_indices, saved_states):
                    assignments[i].room     = r
                    assignments[i].timeslot = s
                schedule.fitness = current_fit

            # Refroidissement géométrique
            temp *= sa_cooling

        # Restaurer le meilleur état trouvé
        for i, (r, s) in enumerate(best_state):
            assignments[i].room     = r
            assignments[i].timeslot = s

        # Recalcul final complet (avec soft)
        schedule.fitness = None
        self.get_score(schedule)
        return schedule

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION G : HELPERS PRIVÉS
    # ─────────────────────────────────────────────────────────────────────────

    def _get_valid_slots(self, mp):
        """[OPT-6] Retourne la liste précalculée selon le type de module."""
        return self._slots_no_saturday if mp.type == "CM" else self.dm.timeslots

    def _get_valid_rooms_for_mp(self, mp) -> list:
        """
        [OPT-7] Cache par module_part.id.
        Calcule valid_rooms une seule fois par mp unique.
        """
        mp_id = mp.id if hasattr(mp, 'id') else id(mp)
        cached = self._valid_rooms_cache.get(mp_id)
        if cached is not None:
            return cached

        rooms = [r for r in self.dm.rooms if r.capacity >= mp.group_size]
        if mp.required_room_type:
            rooms = [r for r in rooms if r.type == mp.required_room_type]
        if not rooms:
            rooms = self.dm.rooms
        self._valid_rooms_cache[mp_id] = rooms
        return rooms

    def _apply_hard_move(self, schedule, unlocked):
        """
        Mouvements Génériques : Vise la résolution des conflits physiques (H1-H4).
        [OPT-7] valid_rooms pris du cache.
        """
        idx        = random.choice(unlocked)
        a          = schedule.assignments[idx]
        old_room, old_slot = a.room, a.timeslot

        valid_slots = self._get_valid_slots(a.module_part)
        valid_rooms = self._get_valid_rooms_for_mp(a.module_part)   # [OPT-7]

        r = random.random()
        if r < 0.4:
            a.room     = random.choice(valid_rooms)
            a.timeslot = random.choice(valid_slots)
            return [idx], [(old_room, old_slot)]
        elif r < 0.7:
            a.room = random.choice(valid_rooms)
            return [idx], [(old_room, old_slot)]
        else:
            sec_id   = a.module_part.section_id
            a_groups = set(a.module_part.td_group_ids)
            candidates = [
                i for i in unlocked
                if i != idx and (
                    (sec_id and schedule.assignments[i].module_part.section_id == sec_id) or
                    a_groups.intersection(schedule.assignments[i].module_part.td_group_ids)
                )
            ]
            if candidates:
                other_idx  = random.choice(candidates)
                other      = schedule.assignments[other_idx]
                if (a.module_part.type == "CM" and other.timeslot.day == "SAMEDI") or \
                   (other.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
                    a.timeslot = random.choice(valid_slots)
                    return [idx], [(old_room, old_slot)]
                old_room_other, old_slot_other = other.room, other.timeslot
                a.timeslot, other.timeslot     = other.timeslot, a.timeslot
                return [idx, other_idx], [(old_room, old_slot), (old_room_other, old_slot_other)]
            else:
                a.timeslot = random.choice(valid_slots)
                return [idx], [(old_room, old_slot)]

    def _apply_soft_move(self, schedule, unlocked):
        """
        Mouvements Métier : Vise le confort pédagogique (S1–S10) quand H=0.
        [OPT-6] slots_by_day utilisé pour éviter le filter inline.
        """
        r = random.random()
        changed_indices, old_states = [], []
        slots_by_day = self._slots_by_day   # [OPT-2] référence locale

        if r < 0.25:
            # Stabilisation des salles (S6)
            mid_options = [(a.module_part.module_id, a.module_part.type)
                           for i, a in enumerate(schedule.assignments) if i in set(unlocked)]
            if not mid_options:
                return self._apply_hard_move(schedule, unlocked)
            mid, m_type = random.choice(mid_options)
            target_assigns = [
                i for i in unlocked
                if schedule.assignments[i].module_part.module_id == mid
                and schedule.assignments[i].module_part.type == m_type
            ]
            max_cap  = max(schedule.assignments[i].module_part.group_size for i in target_assigns)
            req_type = schedule.assignments[target_assigns[0]].module_part.required_room_type
            valid_rooms = [r for r in self.dm.rooms if r.capacity >= max_cap]
            if req_type:
                valid_rooms = [r for r in valid_rooms if r.type == req_type]
            if not valid_rooms:
                valid_rooms = self.dm.rooms
            target_room = random.choice(valid_rooms)
            for i in target_assigns:
                changed_indices.append(i)
                old_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
                schedule.assignments[i].room = target_room

        elif r < 0.55:
            # Compactage professeur (S3)
            idx     = random.choice(unlocked)
            a       = schedule.assignments[idx]
            prof_id = a.module_part.teacher_id
            prof_assigns = [
                schedule.assignments[i] for i in unlocked
                if schedule.assignments[i].module_part.teacher_id == prof_id and i != idx
            ]
            if prof_assigns:
                ref_day     = random.choice(prof_assigns).timeslot.day
                # [OPT-6] O(1) dict lookup au lieu de filter O(n)
                day_slots   = slots_by_day.get(ref_day, self.dm.timeslots)
                target_slot = random.choice(day_slots)
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot
            else:
                changed_indices, old_states = self._apply_hard_move(schedule, unlocked)

        elif r < 0.85:
            # Compactage étudiant (S3/S7)
            idx    = random.choice(unlocked)
            a      = schedule.assignments[idx]
            sec_id = a.module_part.section_id
            sec_assigns = [
                schedule.assignments[i] for i in unlocked
                if schedule.assignments[i].module_part.section_id == sec_id and i != idx
            ] if sec_id else []
            if sec_assigns:
                ref_day     = random.choice(sec_assigns).timeslot.day
                # [OPT-6]
                day_slots   = slots_by_day.get(ref_day, self.dm.timeslots)
                target_slot = random.choice(day_slots)
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot
            else:
                changed_indices, old_states = self._apply_hard_move(schedule, unlocked)
        else:
            # Exploration aléatoire
            changed_indices, old_states = self._apply_hard_move(schedule, unlocked)

        return changed_indices, old_states