# ==============================================================================
# engine_alns.py — Moteur ILS-ALNS avec Sélection Adaptative d'Opérateurs
#
# Architecture : Iterated Local Search (ILS) + Adaptive Large Neighbourhood
#                Search (ALNS) avec bandit UCB1 pour la sélection d'opérateurs.
#
# Pourquoi mieux que GA+SA+RL ?
#   - Zéro overhead RL pendant la recherche locale
#   - L'ALNS apprend EN LIGNE quels opérateurs sont efficaces (bandit UCB1)
#   - ILS = perturbation forte + re-optimisation, pour sortir des optima locaux
#   - Population gardée pour la diversité (mode Memetic léger)
#
# Compatible à 100% avec votre architecture existante :
#   models.py / constraints.py / data_manager.py / reporting.py
# ==============================================================================

import random
import copy
import math
import os
import json

from models import Schedule, Assignment
from constraints import calculate_fitness_full


# ==============================================================================
# SECTION A : BANDIT UCB1 — Sélecteur Adaptatif d'Opérateurs
# ==============================================================================

class UCB1Bandit:
    """
    Bandit Multi-Bras (UCB1) pour la sélection d'opérateurs ALNS.

    Chaque "bras" est un opérateur de recherche locale (move).
    L'algorithme choisit l'opérateur qui maximise :
        UCB1(i) = Q(i) + C * sqrt( ln(N) / n(i) )
    où Q(i) = récompense moyenne, N = total essais, n(i) = essais de l'op i.

    Avantage vs RL Q-Table : 
        - Pas de discretisation d'état nécessaire
        - Convergence garantie sur bandits stationnaires
        - Très faible overhead computationnel
    """

    def __init__(self, n_operators, exploration_c=1.5):
        self.n = n_operators
        self.C = exploration_c         # Coefficient d'exploration UCB1
        self.counts   = [0]  * n_operators   # Nombre d'utilisations par opérateur
        self.rewards  = [0.0] * n_operators  # Récompense totale cumulée par opérateur
        self.total    = 0                    # Total d'appels

    def select(self):
        """Choisit le bras avec la valeur UCB1 maximale."""
        # Phase d'initialisation : tester chaque opérateur au moins une fois
        for i in range(self.n):
            if self.counts[i] == 0:
                return i
        # Phase d'exploitation/exploration
        ucb_values = [
            (self.rewards[i] / self.counts[i]) +
            self.C * math.sqrt(math.log(self.total) / self.counts[i])
            for i in range(self.n)
        ]
        return ucb_values.index(max(ucb_values))

    def update(self, arm, reward):
        """Met à jour les statistiques après avoir observé une récompense."""
        self.counts[arm]  += 1
        self.rewards[arm] += reward
        self.total        += 1

    def get_stats(self):
        """Retourne les statistiques pour le reporting."""
        stats = {}
        for i in range(self.n):
            q = (self.rewards[i] / self.counts[i]) if self.counts[i] > 0 else 0.0
            stats[i] = {"count": self.counts[i], "avg_reward": round(q, 4)}
        return stats


# ==============================================================================
# SECTION B : OPÉRATEURS DE VOISINAGE (LLH Pool)
# ==============================================================================
# Chaque opérateur prend (schedule, unlocked, dm) et retourne (indices, old_states)
# afin de permettre un rollback O(1).

def op_random_shift(schedule, unlocked, dm):
    """Op 0 : Déplacement aléatoire complet (salle + créneau). Exploration pure."""
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
    if not valid_rooms:
        valid_rooms = dm.rooms
    valid_slots = [s for s in dm.timeslots if not (a.module_part.type == "CM" and s.day == "SAMEDI")]

    old = (a.room, a.timeslot)
    a.room     = random.choice(valid_rooms)
    a.timeslot = random.choice(valid_slots)
    return [idx], [old]


def op_swap_slots(schedule, unlocked, dm):
    """Op 1 : Échange de créneaux entre deux cours de la même section."""
    if len(unlocked) < 2:
        return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    sec_id = a.module_part.section_id
    candidates = [i for i in unlocked if i != idx and
                  schedule.assignments[i].module_part.section_id == sec_id]
    if not candidates:
        candidates = [i for i in unlocked if i != idx]
    other_idx = random.choice(candidates)
    other = schedule.assignments[other_idx]
    # Vérification Samedi pour les CM
    if (a.module_part.type == "CM" and other.timeslot.day == "SAMEDI") or \
       (other.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
        return op_random_shift(schedule, unlocked, dm)
    old_a     = (a.room,     a.timeslot)
    old_other = (other.room, other.timeslot)
    a.timeslot, other.timeslot = other.timeslot, a.timeslot
    return [idx, other_idx], [old_a, old_other]


def op_stabilize_room(schedule, unlocked, dm):
    """
    Op 2 : Stabilisation de salle (cible S6_Stab).
    Choisit un module et assigne la MÊME salle à toutes ses séances.
    C'est l'opérateur le plus puissant contre S6.
    """
    unlocked_set = set(unlocked)
    # Grouper les séances par (module_id, type)
    module_groups = {}
    for i in unlocked:
        key = (schedule.assignments[i].module_part.module_id,
               schedule.assignments[i].module_part.type)
        module_groups.setdefault(key, []).append(i)

    if not module_groups:
        return op_random_shift(schedule, unlocked, dm)

    # Choisir un module avec au moins 2 séances pour un impact maximal
    multi = [k for k, v in module_groups.items() if len(v) >= 2]
    key = random.choice(multi if multi else list(module_groups.keys()))
    indices = module_groups[key]

    # Trouver la meilleure salle commune (la plus petite salle qui convient)
    max_cap = max(schedule.assignments[i].module_part.group_size for i in indices)
    req_type = schedule.assignments[indices[0]].module_part.required_room_type
    valid_rooms = [r for r in dm.rooms if r.capacity >= max_cap]
    if req_type:
        valid_rooms = [r for r in valid_rooms if r.type == req_type]
    if not valid_rooms:
        valid_rooms = dm.rooms

    target_room = random.choice(valid_rooms)
    saved_indices, saved_states = [], []
    for i in indices:
        saved_indices.append(i)
        saved_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].room = target_room
    return saved_indices, saved_states


def op_compact_day_prof(schedule, unlocked, dm):
    """
    Op 3 : Compactage professeur (cible S3_Gaps).
    Tente de regrouper tous les cours d'un prof sur le même jour.
    """
    if not unlocked:
        return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    prof_id = a.module_part.teacher_id
    if not prof_id:
        return op_random_shift(schedule, unlocked, dm)
    prof_assigns = [i for i in unlocked
                    if schedule.assignments[i].module_part.teacher_id == prof_id and i != idx]
    if not prof_assigns:
        return op_random_shift(schedule, unlocked, dm)

    # Trouver le jour où ce prof a le plus de cours (jour "ancrage")
    day_counts = {}
    for i in prof_assigns:
        d = schedule.assignments[i].timeslot.day
        day_counts[d] = day_counts.get(d, 0) + 1
    anchor_day = max(day_counts, key=day_counts.get)

    slots_on_day = [s for s in dm.timeslots if s.day == anchor_day]
    if not slots_on_day:
        return op_random_shift(schedule, unlocked, dm)

    old_state = (a.room, a.timeslot)
    a.timeslot = random.choice(slots_on_day)
    return [idx], [old_state]


def op_compact_day_section(schedule, unlocked, dm):
    """
    Op 4 : Compactage section (cible S3_Gaps + S4_Lunch).
    Tente de regrouper les cours d'une section sur moins de jours.
    """
    if not unlocked:
        return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    sec_id = a.module_part.section_id
    if not sec_id:
        return op_random_shift(schedule, unlocked, dm)

    sec_assigns = [i for i in unlocked
                   if schedule.assignments[i].module_part.section_id == sec_id and i != idx]
    if not sec_assigns:
        return op_random_shift(schedule, unlocked, dm)

    day_counts = {}
    for i in sec_assigns:
        d = schedule.assignments[i].timeslot.day
        day_counts[d] = day_counts.get(d, 0) + 1
    anchor_day = max(day_counts, key=day_counts.get)

    slots_on_day = [s for s in dm.timeslots if s.day == anchor_day]
    if not slots_on_day:
        return op_random_shift(schedule, unlocked, dm)

    old_state = (a.room, a.timeslot)
    a.timeslot = random.choice(slots_on_day)
    return [idx], [old_state]


def op_lunch_fix(schedule, unlocked, dm):
    """
    Op 5 : Correction créneau déjeuner (cible S4_Lunch).
    Déplace un cours du slot 12h30 vers un autre slot du même jour.
    """
    lunch_indices = [
        i for i in unlocked
        if hasattr(schedule.assignments[i].timeslot, 'start_time') and
        '12' in str(getattr(schedule.assignments[i].timeslot, 'start_time', ''))
    ]
    if not lunch_indices:
        return op_compact_day_section(schedule, unlocked, dm)

    idx = random.choice(lunch_indices)
    a = schedule.assignments[idx]
    current_day = a.timeslot.day
    alt_slots = [s for s in dm.timeslots
                 if s.day == current_day and
                 '12' not in str(getattr(s, 'start_time', ''))]
    if not alt_slots:
        return op_random_shift(schedule, unlocked, dm)

    old_state = (a.room, a.timeslot)
    a.timeslot = random.choice(alt_slots)
    return [idx], [old_state]


def op_swap_room_only(schedule, unlocked, dm):
    """Op 6 : Réallocation de salle uniquement (ne touche pas au créneau)."""
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
    if not valid_rooms:
        valid_rooms = dm.rooms
    old_state = (a.room, a.timeslot)
    a.room = random.choice(valid_rooms)
    return [idx], [old_state]


def op_kempe_chain(schedule, unlocked, dm):
    """
    Op 7 : Mouvement Kempe Chain (échange de créneaux entre deux blocs).
    Sélectionne deux créneaux et échange TOUS les cours qui s'y trouvent.
    Très puissant pour sortir des optima locaux profonds.
    """
    if len(dm.timeslots) < 2:
        return op_swap_slots(schedule, unlocked, dm)

    slot_a, slot_b = random.sample(dm.timeslots, 2)
    assignments_a = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_a.id]
    assignments_b = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_b.id]

    if not assignments_a and not assignments_b:
        return op_swap_slots(schedule, unlocked, dm)

    saved_indices, saved_states = [], []
    # Vérification CM/Samedi avant l'échange
    for i in assignments_a:
        if schedule.assignments[i].module_part.type == "CM" and slot_b.day == "SAMEDI":
            return op_swap_slots(schedule, unlocked, dm)
    for i in assignments_b:
        if schedule.assignments[i].module_part.type == "CM" and slot_a.day == "SAMEDI":
            return op_swap_slots(schedule, unlocked, dm)

    for i in assignments_a:
        saved_indices.append(i)
        saved_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].timeslot = slot_b
    for i in assignments_b:
        saved_indices.append(i)
        saved_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].timeslot = slot_a

    return saved_indices, saved_states


# Registre global des opérateurs (facile à étendre)
OPERATORS = [
    op_random_shift,       # 0 — Exploration pure
    op_swap_slots,         # 1 — Swap créneau intra-section
    op_stabilize_room,     # 2 — Stabilisation salle (→ S6)
    op_compact_day_prof,   # 3 — Compactage professeur (→ S3)
    op_compact_day_section,# 4 — Compactage section (→ S3, S4)
    op_lunch_fix,          # 5 — Fix déjeuner (→ S4)
    op_swap_room_only,     # 6 — Réalloc salle pure (→ S6)
    op_kempe_chain,        # 7 — Kempe chain (anti-plateau)
]
OP_NAMES = [
    "RandomShift", "SwapSlots", "StabilizeRoom", "CompactProf",
    "CompactSection", "LunchFix", "SwapRoomOnly", "KempeChain"
]
N_OPERATORS = len(OPERATORS)


# ==============================================================================
# SECTION C : SA-ALNS — Recuit Simulé avec Sélection Adaptative (ALNS)
# ==============================================================================

def sa_alns(schedule, dm, constraints_mask, bandit,
            sa_iterations=2000, sa_temp=80.0, sa_cooling=0.975,
            phase='soft'):
    """
    Recuit Simulé avec opérateurs choisis par le bandit UCB1.

    Améliorations vs votre SA actuel :
    1. Opérateurs sélectionnés par UCB1 (apprendant lequel marche le mieux)
    2. Récompense = amélioration relative du score soft (normalisée)
    3. Reheat automatique si stagnation longue (anti-plateau)
    4. Rollback O(1) conservé

    Retourne le meilleur schedule rencontré.
    """
    def get_score(sch):
        if sch.fitness is None:
            s, h, soft, _ = calculate_fitness_full(sch, mask=constraints_mask)
            sch.fitness = s
            sch.h_violations = h
            sch.soft_penalty = soft
        return sch.fitness

    current_fit = get_score(schedule)
    best_fit    = current_fit
    best_state  = [(a.room, a.timeslot) for a in schedule.assignments]

    temp = max(sa_temp, current_fit * 0.04)
    unlocked_all = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
    if not unlocked_all:
        return schedule

    # Phase : si hard violations encore présentes, basculer sur hard moves prioritairement
    active_phase = 'hard' if (schedule.h_violations or 0) > 0 else phase
    stagnation   = 0
    reheat_count = 0

    for it in range(sa_iterations):
        # Bascule dynamique hard→soft
        if active_phase == 'hard' and (schedule.h_violations or 0) == 0:
            active_phase = 'soft'

        # Reheat si stagnation > 15% du budget (max 3 reheats)
        if stagnation > sa_iterations // 6 and reheat_count < 3:
            temp = sa_temp * (0.5 ** reheat_count)
            stagnation   = 0
            reheat_count += 1

        # Sélection de l'opérateur
        if active_phase == 'hard':
            # Phase hard : uniquement random_shift, swap_slots, swap_room
            arm = random.choice([0, 1, 6])
        else:
            arm = bandit.select()

        operator = OPERATORS[arm]
        saved_indices, saved_states = operator(schedule, unlocked_all, dm)

        # Évaluation
        schedule.fitness = None
        neighbor_fit = get_score(schedule)
        delta = neighbor_fit - current_fit

        # Critère de Metropolis
        if delta < 0 or (temp > 1e-10 and random.random() < math.exp(-delta / temp)):
            current_fit = neighbor_fit
            stagnation  = 0
            # Mise à jour de la récompense bandit (amélioration normalisée)
            if active_phase == 'soft' and arm not in [0, 1, 6]:
                reward = max(0.0, -delta / max(1.0, abs(best_fit))) * 100
                bandit.update(arm, reward)
            elif active_phase == 'soft':
                reward = max(0.0, -delta / max(1.0, abs(best_fit))) * 100
                bandit.update(arm, reward)

            if current_fit < best_fit:
                best_fit  = current_fit
                best_state = [(a.room, a.timeslot) for a in schedule.assignments]
        else:
            # Rollback O(1)
            for i, (r, s) in zip(saved_indices, saved_states):
                schedule.assignments[i].room     = r
                schedule.assignments[i].timeslot = s
            schedule.fitness = current_fit
            stagnation += 1
            # Pénalité légère sur l'opérateur si rejet systématique (anti-explore-exploitation)
            if active_phase == 'soft' and stagnation % 50 == 0:
                bandit.update(arm, 0.0)

        temp *= sa_cooling

    # Restauration du meilleur état
    for i, (r, s) in enumerate(best_state):
        schedule.assignments[i].room     = r
        schedule.assignments[i].timeslot = s
    schedule.fitness = None
    get_score(schedule)
    return schedule


# ==============================================================================
# SECTION D : ILS — Iterated Local Search (Méta-niveau)
# ==============================================================================

def ils_perturbation(schedule, dm, constraints_mask, strength=0.08):
    """
    Perturbation ILS : Applique des Kempe Chains aléatoires pour sortir de l'optimum local.
    
    'strength' contrôle le pourcentage de séances perturbées (8% par défaut = ~20 séances).
    C'est l'équivalent d'une mutation forte ciblée.
    """
    perturbed = copy.deepcopy(schedule)
    unlocked = [i for i, a in enumerate(perturbed.assignments) if not a.module_part.is_locked]
    if not unlocked:
        return perturbed

    n_kicks = max(1, int(len(unlocked) * strength))

    for _ in range(n_kicks):
        # Kempe chain perturbation : échange deux créneaux entiers
        if len(dm.timeslots) >= 2 and random.random() < 0.6:
            op_kempe_chain(perturbed, unlocked, dm)
        else:
            op_stabilize_room(perturbed, unlocked, dm)

    perturbed.fitness       = None
    perturbed.h_violations  = None
    perturbed.soft_penalty  = None
    return perturbed


# ==============================================================================
# SECTION E : HYBRIDENGINE (Compatible avec votre architecture)
# ==============================================================================

class HybridEngine:
    """
    Moteur ILS-ALNS avec Bandit UCB1.
    
    Interface identique à votre HybridEngine GA+SA existant :
    - create_initial_population()
    - evolve() → (sa_impact, diversity)
    - inject_diversity()
    Compatible avec main_rl.py / reporting.py sans modification.
    
    Stratégie :
    1. Population légère (pop_size individus) pour diversité
    2. Chaque individu est optimisé par SA-ALNS (un bandit global partagé)
    3. À chaque génération : élitisme + ILS sur les meilleurs + sélection/remplacement
    4. Injection de diversité si plateau détecté
    """

    def __init__(self, data_manager,
                 pop_size=30,
                 constraints_mask=None,
                 mutation_rate=0.40,
                 elitism=2,
                 sa_iterations=2000,
                 sa_temp=80.0,
                 sa_cooling=0.975,
                 agent=None):  # 'agent' conservé pour compatibilité, non utilisé

        self.dm            = data_manager
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = elitism
        self.sa_iterations = sa_iterations
        self.sa_temp       = sa_temp
        self.sa_cooling    = sa_cooling
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "H9": True, "H10": True, "H12": True,
            "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True,
            "S_STABILITY": True, "S_SHORT_DAY": True, "S_FREE_APM": True,
            "S_FATIGUE": True, "S_SATURDAY": True,
            "S_MIXING": True, "S_CM_DISPERSION": True
        }

        # Bandit UCB1 PARTAGÉ entre tous les individus : il apprend sur l'ensemble de la recherche
        self.bandit = UCB1Bandit(N_OPERATORS, exploration_c=1.5)

        # Stats pour le reporting
        self.generation     = 0
        self.best_ever      = None
        self.best_ever_fit  = float('inf')
        self.population     = []

    # ── Scoring ──────────────────────────────────────────────────────────────

    def get_score(self, schedule):
        if hasattr(schedule, 'fitness') and schedule.fitness is not None:
            return schedule.fitness
        score, h, s, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness        = score
        schedule.h_violations   = h
        schedule.soft_penalty   = s
        return score

    # ── Construction initiale ─────────────────────────────────────────────────

    def create_initial_population(self):
        """80% Greedy + 20% Aléatoire, identique à votre version actuelle."""
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        for k in range(self.pop_size):
            if k < n_greedy:
                ind = self._build_greedy_individual()
            else:
                ind = self._build_random_individual()
            self.population.append(ind)
        # Score initial
        for ind in self.population:
            self.get_score(ind)
        self.population.sort(key=lambda x: x.fitness)
        self.best_ever     = copy.deepcopy(self.population[0])
        self.best_ever_fit = self.population[0].fitness

    def _build_random_individual(self):
        """Construction aléatoire basique."""
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
        Heuristique Constructive Greedy identique à votre version originale.
        Conservée telle quelle pour ne pas casser la construction initiale.
        """
        assignments = []
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        sec_occupancy     = {}

        sec_to_filieres = {}
        for s in self.dm.sections:
            sec_to_filieres[s['id']] = set(
                g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id')
            )
        related_sids = {}
        for s1 in self.dm.sections:
            sid1 = s1['id']
            related_sids[sid1] = []
            fils1 = sec_to_filieres.get(sid1, set())
            if not fils1:
                continue
            for s2 in self.dm.sections:
                sid2 = s2['id']
                if sid1 == sid2:
                    continue
                if fils1.intersection(sec_to_filieres.get(sid2, set())):
                    related_sids[sid1].append(sid2)

        module_parts_shuffled = list(self.dm.module_parts)
        random.shuffle(module_parts_shuffled)

        for mp in module_parts_shuffled:
            is_cm  = (mp.type == "CM")
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gid, "") for gid in mp.td_group_ids)
            sec_id = mp.section_id

            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                valid_slots = [s for s in self.dm.timeslots if not (is_cm and s.day == "SAMEDI")]
                candidate_slots = random.sample(valid_slots, min(15, len(valid_slots)))
                candidate_rooms = [r for r in self.dm.rooms if r.capacity >= mp.group_size]
                if not candidate_rooms:
                    candidate_rooms = self.dm.rooms

                for slot_c in candidate_slots:
                    for room_c in candidate_rooms:
                        cost = 0
                        t_id = mp.teacher_id
                        if t_id and t_id != 231 and (t_id, slot_c.id) in teacher_slot_used:
                            cost += 1000
                        if (room_c.id, slot_c.id) in room_slot_used:
                            cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, slot_c.id) in group_slot_used:
                                cost += 1000
                        if t_id and t_id != 231:
                            prof_obj = self.dm.teacher_map.get(t_id)
                            if prof_obj and slot_c.id in prof_obj.unavailable_slots:
                                cost += 1000
                        if mp.required_room_type and room_c.type != mp.required_room_type:
                            cost += 1000
                        if slot_c.day == "SAMEDI":
                            cost += 100000 if is_cm else 15000
                        if sec_id:
                            for r_sid in related_sids.get(sec_id, []):
                                r_status = sec_occupancy.get((r_sid, slot_c.id))
                                if r_status:
                                    if (is_cm or is_gr6) and r_status['any']:
                                        cost += 3000
                                    elif r_status['cm'] or r_status['gr6']:
                                        cost += 3000
                        if cost < best_cost:
                            best_cost = cost
                            best_room, best_slot = room_c, slot_c
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
                if is_cm:  sec_occupancy[key_sec]['cm'] = True
                if is_gr6: sec_occupancy[key_sec]['gr6'] = True
            assignments.append(Assignment(mp, room, slot))

        return Schedule(self.dm, assignments)

    # ── Évolution (une génération) ────────────────────────────────────────────

    def evolve(self):
        """
        Une génération ILS-ALNS :
        1. Élites → SA-ALNS direct (intensification)
        2. Non-élites → ILS (perturbation + SA-ALNS)
        3. Remplacement par les meilleurs
        Retourne (sa_impact, diversity) pour compatibilité reporting.
        """
        self.generation += 1
        self.population.sort(key=lambda x: self.get_score(x))

        new_gen = []
        sa_impact_list = []

        # ── Élites : SA-ALNS pur (intensification profonde) ──
        for i in range(min(self.elitism, len(self.population))):
            ind      = copy.deepcopy(self.population[i])
            old_fit  = self.get_score(ind)
            ind      = sa_alns(ind, self.dm, self.constraints_mask, self.bandit,
                               sa_iterations=self.sa_iterations,
                               sa_temp=self.sa_temp,
                               sa_cooling=self.sa_cooling)
            sa_impact_list.append(max(0, old_fit - ind.fitness))
            new_gen.append(ind)

        # ── Reste de la population : ILS (perturbation + SA-ALNS) ──
        while len(new_gen) < self.pop_size:
            # Sélection tournoi parmi la population courante
            tournament = random.sample(self.population, min(4, len(self.population)))
            parent     = min(tournament, key=lambda x: x.fitness)

            # ILS : strength adaptée à la génération (plus forte au début)
            strength = max(0.04, 0.12 - self.generation * 0.001)
            perturbed = ils_perturbation(parent, self.dm, self.constraints_mask, strength=strength)

            old_fit  = self.get_score(perturbed)
            improved = sa_alns(perturbed, self.dm, self.constraints_mask, self.bandit,
                               sa_iterations=self.sa_iterations,
                               sa_temp=self.sa_temp * 0.6,   # Température réduite pour les non-élites
                               sa_cooling=self.sa_cooling)
            sa_impact_list.append(max(0, old_fit - improved.fitness))
            new_gen.append(improved)

        # ── Mise à jour du meilleur global ──
        new_gen.sort(key=lambda x: x.fitness)
        if new_gen[0].fitness < self.best_ever_fit:
            self.best_ever     = copy.deepcopy(new_gen[0])
            self.best_ever_fit = new_gen[0].fitness

        self.population = new_gen

        avg_sa_impact = sum(sa_impact_list) / max(1, len(sa_impact_list))
        diversity     = self._calculate_population_diversity(new_gen)

        return avg_sa_impact, diversity

    # ── Anti-stagnation ───────────────────────────────────────────────────────

    def inject_diversity(self, n_replace=None):
        """Remplace une fraction de la population par de nouveaux individus greedy."""
        if n_replace is None:
            n_replace = max(2, self.pop_size // 3)
        kept      = self.population[:self.elitism]
        new_blood = [self._build_greedy_individual() for _ in range(n_replace)]
        for ind in new_blood:
            # Optimisation rapide des nouveaux arrivants
            sa_alns(ind, self.dm, self.constraints_mask, self.bandit,
                    sa_iterations=self.sa_iterations // 3,
                    sa_temp=self.sa_temp,
                    sa_cooling=self.sa_cooling)
            self.get_score(ind)

        self.population = kept + new_blood + self.population[self.elitism:self.pop_size - n_replace]
        self.population.sort(key=lambda x: self.get_score(x))

    # ── Outils ───────────────────────────────────────────────────────────────

    def _calculate_population_diversity(self, pop):
        """Diversité génotypique estimée (distance moyenne entre paires)."""
        if not pop or len(pop) < 2:
            return 0.0
        samples   = min(10, len(pop))
        total_dist = 0
        for _ in range(samples):
            idx1, idx2 = random.sample(range(len(pop)), 2)
            dist = sum(
                1 for a1, a2 in zip(pop[idx1].assignments, pop[idx2].assignments)
                if a1.room.id != a2.room.id or a1.timeslot.id != a2.timeslot.id
            )
            total_dist += dist / max(1, len(pop[idx1].assignments))
        return (total_dist / samples) * 100

    def get_bandit_stats(self):
        """Retourne les statistiques UCB1 pour le reporting."""
        raw = self.bandit.get_stats()
        return {OP_NAMES[i]: v for i, v in raw.items()}

    # ── Compatibilité avec simulated_annealing_search ─────────────────────────
    # (appelé directement depuis certains main.py)

    def simulated_annealing_search(self, schedule):
        """Wrapper pour compatibilité avec l'ancien interface."""
        return sa_alns(schedule, self.dm, self.constraints_mask, self.bandit,
                       sa_iterations=self.sa_iterations,
                       sa_temp=self.sa_temp,
                       sa_cooling=self.sa_cooling)