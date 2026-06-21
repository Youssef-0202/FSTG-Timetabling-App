# ==============================================================================
# engine_alns.py — ILS-ALNS VERSION ORIGINALE (score 9217, H=0)
#
# Paramètres du run gagnant (à utiliser dans main_alns.py) :
#   POP_SIZE      = 20
#   MAX_GEN       = 150
#   SA_ITERATIONS = 1200
#   SA_TEMP       = 50.0
#   SA_COOLING    = 0.965
#   ELITISM       = 2
#   PATIENCE      = 20
# ==============================================================================

import sys
import os
import random
import copy
import math
# Chargement des contraintes communes
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from models import Schedule, Assignment
from constraints_optimized import calculate_fitness_full


# ==============================================================================
# SECTION A : BANDIT UCB1
# ==============================================================================

class UCB1Bandit:

    def __init__(self, n_operators, exploration_c=1.5):
        self.n        = n_operators
        self.C        = exploration_c
        self.counts   = [0]   * n_operators
        self.rewards  = [0.0] * n_operators
        self.total    = 0

    def select(self):
        for i in range(self.n):
            if self.counts[i] == 0:
                return i
        ucb_values = [
            (self.rewards[i] / self.counts[i]) +
            self.C * math.sqrt(math.log(self.total) / self.counts[i])
            for i in range(self.n)
        ]
        return ucb_values.index(max(ucb_values))

    def update(self, arm, reward):
        self.counts[arm]  += 1
        self.rewards[arm] += reward
        self.total        += 1

    def get_stats(self):
        stats = {}
        for i in range(self.n):
            q = (self.rewards[i] / self.counts[i]) if self.counts[i] > 0 else 0.0
            stats[i] = {"count": self.counts[i], "avg_reward": round(q, 4)}
        return stats


# ==============================================================================
# SECTION B : 8 OPÉRATEURS
# ==============================================================================

def op_random_shift(schedule, unlocked, dm):
    """Op 0 : Déplacement aléatoire complet (salle + créneau). Exploration pure."""
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
    if not valid_rooms:
        valid_rooms = dm.rooms
    valid_slots = [s for s in dm.timeslots
                   if not (a.module_part.type == "CM" and s.day == "SAMEDI")]
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
    if (a.module_part.type == "CM" and other.timeslot.day == "SAMEDI") or \
       (other.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
        return op_random_shift(schedule, unlocked, dm)
    old_a     = (a.room,     a.timeslot)
    old_other = (other.room, other.timeslot)
    a.timeslot, other.timeslot = other.timeslot, a.timeslot
    return [idx, other_idx], [old_a, old_other]


def op_stabilize_room(schedule, unlocked, dm):
    """Op 2 : Force la même salle pour toutes les séances d'un module."""
    module_groups = {}
    for i in unlocked:
        key = (schedule.assignments[i].module_part.module_id,
               schedule.assignments[i].module_part.type)
        module_groups.setdefault(key, []).append(i)
    if not module_groups:
        return op_random_shift(schedule, unlocked, dm)
    multi = [k for k, v in module_groups.items() if len(v) >= 2]
    key     = random.choice(multi if multi else list(module_groups.keys()))
    indices = module_groups[key]
    max_cap  = max(schedule.assignments[i].module_part.group_size for i in indices)
    req_type = schedule.assignments[indices[0]].module_part.required_room_type
    valid    = [r for r in dm.rooms if r.capacity >= max_cap]
    if req_type:
        valid = [r for r in valid if r.type == req_type]
    if not valid:
        valid = dm.rooms
    target_room = random.choice(valid)
    si, ss = [], []
    for i in indices:
        si.append(i)
        ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].room = target_room
    return si, ss


def op_compact_day_prof(schedule, unlocked, dm):
    """Op 3 : Regroupe les cours d'un prof sur son jour le plus chargé."""
    if not unlocked:
        return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
    pid = a.module_part.teacher_id
    if not pid:
        return op_random_shift(schedule, unlocked, dm)
    prof_assigns = [i for i in unlocked
                    if schedule.assignments[i].module_part.teacher_id == pid and i != idx]
    if not prof_assigns:
        return op_random_shift(schedule, unlocked, dm)
    day_counts = {}
    for i in prof_assigns:
        d = schedule.assignments[i].timeslot.day
        day_counts[d] = day_counts.get(d, 0) + 1
    anchor_day    = max(day_counts, key=day_counts.get)
    slots_on_day  = [s for s in dm.timeslots if s.day == anchor_day]
    if not slots_on_day:
        return op_random_shift(schedule, unlocked, dm)
    old = (a.room, a.timeslot)
    a.timeslot = random.choice(slots_on_day)
    return [idx], [old]


def op_compact_day_section(schedule, unlocked, dm):
    """Op 4 : Regroupe les cours d'une section sur son jour le plus chargé."""
    if not unlocked:
        return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
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
    anchor_day   = max(day_counts, key=day_counts.get)
    slots_on_day = [s for s in dm.timeslots if s.day == anchor_day]
    if not slots_on_day:
        return op_random_shift(schedule, unlocked, dm)
    old = (a.room, a.timeslot)
    a.timeslot = random.choice(slots_on_day)
    return [idx], [old]


def op_lunch_fix(schedule, unlocked, dm):
    """Op 5 : Déplace les séances du créneau 12h30."""
    lunch_indices = [
        i for i in unlocked
        if '12' in str(getattr(schedule.assignments[i].timeslot, 'start_time', ''))
    ]
    if not lunch_indices:
        return op_compact_day_section(schedule, unlocked, dm)
    idx = random.choice(lunch_indices)
    a   = schedule.assignments[idx]
    current_day = a.timeslot.day
    alt_slots = [s for s in dm.timeslots
                 if s.day == current_day and
                 '12' not in str(getattr(s, 'start_time', ''))]
    if not alt_slots:
        return op_random_shift(schedule, unlocked, dm)
    old = (a.room, a.timeslot)
    a.timeslot = random.choice(alt_slots)
    return [idx], [old]


def op_swap_room_only(schedule, unlocked, dm):
    """Op 6 : Réallocation de salle uniquement."""
    idx   = random.choice(unlocked)
    a     = schedule.assignments[idx]
    valid = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid = [r for r in valid if r.type == a.module_part.required_room_type]
    if not valid:
        valid = dm.rooms
    old    = (a.room, a.timeslot)
    a.room = random.choice(valid)
    return [idx], [old]


def op_kempe_chain(schedule, unlocked, dm):
    """Op 7 : Kempe Chain — échange complet de deux créneaux."""
    if len(dm.timeslots) < 2:
        return op_swap_slots(schedule, unlocked, dm)
    slot_a, slot_b = random.sample(dm.timeslots, 2)
    aa = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_a.id]
    bb = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_b.id]
    if not aa and not bb:
        return op_swap_slots(schedule, unlocked, dm)
    for i in aa:
        if schedule.assignments[i].module_part.type == "CM" and slot_b.day == "SAMEDI":
            return op_swap_slots(schedule, unlocked, dm)
    for i in bb:
        if schedule.assignments[i].module_part.type == "CM" and slot_a.day == "SAMEDI":
            return op_swap_slots(schedule, unlocked, dm)
    si, ss = [], []
    for i in aa:
        si.append(i)
        ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].timeslot = slot_b
    for i in bb:
        si.append(i)
        ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].timeslot = slot_a
    return si, ss


OPERATORS = [
    op_random_shift,        # 0
    op_swap_slots,          # 1
    op_stabilize_room,      # 2
    op_compact_day_prof,    # 3
    op_compact_day_section, # 4
    op_lunch_fix,           # 5
    op_swap_room_only,      # 6
    op_kempe_chain,         # 7
]
OP_NAMES = [
    "RandomShift", "SwapSlots", "StabilizeRoom", "CompactProf",
    "CompactSection", "LunchFix", "SwapRoomOnly", "KempeChain"
]
N_OPERATORS = len(OPERATORS)


# ==============================================================================
# SECTION C : SA-ALNS
# ==============================================================================

def sa_alns(schedule, dm, constraints_mask, bandit,
            sa_iterations=1200, sa_temp=50.0, sa_cooling=0.965, iterations=None):
    """
    Recherche Locale par Recuit Simulé (SA) pilotée par un Bandit ALNS.
    
    C'est le 'cœur' de l'optimisation. Cette fonction polit une solution en alternant
    entre des opérateurs de voisinage choisis dynamiquement par le Bandit UCB1.
    """

    def get_score(sch):
        if sch.fitness is None:
            s, h, soft, _ = calculate_fitness_full(sch, mask=constraints_mask)
            sch.fitness      = s
            sch.h_violations = h
            sch.soft_penalty = soft
        return sch.fitness

    current_fit  = get_score(schedule)
    best_fit     = current_fit
    #  enregistre l'état exact de l'élite 
    # on restaure systématiquement le meilleur état rencontré durant les 1200 itérations au cas de mauvais result
    best_state   = [(a.room, a.timeslot) for a in schedule.assignments]

    temp         = max(sa_temp, current_fit * 0.04)
    unlocked     = [i for i, a in enumerate(schedule.assignments)
                    if not a.module_part.is_locked]
    if not unlocked:
        return schedule
    
    # Détection de stagnation (nombre d'itérations sans amélioration)
    stag         = 0 
    reheat_count = 0
    n_iters      = iterations if iterations is not None else sa_iterations

    for it in range(n_iters):
        # 1. MÉCANISME DE REHEATING (SÉCURITÉ ANTI-BLOCAGE)
        # Si aucune amélioration après 1/6 du temps total, on remonte brusquement la température
        if stag > sa_iterations // 6 and reheat_count < 3: 
            temp         = sa_temp * (0.5 ** reheat_count)
            stag         = 0
            reheat_count += 1

        # 2. SÉLECTION ET ACTION
        # Le Bandit choisit un opérateur via la formule UCB1 (Exploration vs Exploitation)
        arm       = bandit.select()
        # On sauvegarde l'état avant modif pour un éventuel ROLLBACK O(1)
        saved_i, saved_s = OPERATORS[arm](schedule, unlocked, dm)

        schedule.fitness = None
        neighbor_fit     = get_score(schedule)
        delta            = neighbor_fit - current_fit

        # 3. CRITÈRE DE METROPOLIS (ACCEPTATION)
        # On accepte si c'est mieux (delta < 0) OU via une probabilité décroissante
        if delta < 0 or (temp > 1e-10 and random.random() < math.exp(-delta / temp)):
            # MOUVEMENT ACCEPTÉ
            current_fit = neighbor_fit
            stag        = 0
            # Calcul de la RÉCOMPENSE pour le feedback du Bandit
            reward = max(0.0, -delta / max(1.0, abs(best_fit))) * 150
            bandit.update(arm, reward)
            
            if current_fit < best_fit:
                best_fit   = current_fit
                best_state = [(a.room, a.timeslot) for a in schedule.assignments]
        else:
            # MOUVEMENT REFUSÉ : On restaure l'ancien état (Undo)
            for i, (r, s) in zip(saved_i, saved_s):
                schedule.assignments[i].room     = r
                schedule.assignments[i].timeslot = s
            schedule.fitness = current_fit
            stag += 1
            # Signal de stagnation à l'opérateur après 50 échecs
            if stag % 50 == 0:
                bandit.update(arm, 0.0)

        # Refroidissement géométrique
        temp *= sa_cooling

    # FIN DE SESSION : On restaure le meilleur état absolu rencontré durant le polissage
    for i, (r, s) in enumerate(best_state):
        schedule.assignments[i].room     = r
        schedule.assignments[i].timeslot = s
    schedule.fitness = None
    get_score(schedule)
    return schedule


# ==============================================================================
# SECTION D : ILS PERTURBATION
# ==============================================================================

def ils_perturbation(schedule, dm, constraints_mask, strength=0.08):
    """
    Mécanisme de 'Kick' ILS (Iterated Local Search).
    Détruit partiellement la solution pour l'envoyer dans une autre vallée 
    de l'espace de recherche (Diversification).
    """
    # 1. Copie intégrale pour créer un enfant sans modifier le parent
    perturbed = copy.deepcopy(schedule)
    
    # 2. Filtrage des cours modifiables (évite de toucher aux créneaux verrouillés/bloqués)
    unlocked  = [i for i, a in enumerate(perturbed.assignments)
                 if not a.module_part.is_locked]
    if not unlocked:
        return perturbed
    
    # 3. Calcul du nombre de mouvements de choc (Kicks)
    # Plus la 'strength' est haute, plus on déstructure la solution
    n_kicks = max(1, int(len(unlocked) * strength))
    
    # 4. Boucle de choc : Application de mouvements radicaux
    for _ in range(n_kicks):
        # 60% de chances d'utiliser Kempe Chain : Échange de blocs de créneaux complexes
        if len(dm.timeslots) >= 2 and random.random() < 0.6:
            op_kempe_chain(perturbed, unlocked, dm)
        # 40% de chances de stabiliser les salles d'un module
        else:
            op_stabilize_room(perturbed, unlocked, dm)
            
    # 5. Invalidation du cache de fitness pour forcer un recalcul ultérieur
    perturbed.fitness      = None
    perturbed.h_violations = None
    perturbed.soft_penalty = None
    return perturbed


# ==============================================================================
# SECTION E : HYBRID ENGINE
# ==============================================================================

class HybridEngine:

    def __init__(self, data_manager,
                 pop_size=20,
                 constraints_mask=None,
                 mutation_rate=0.40,
                 elitism=2,
                 sa_iterations=1200,
                 sa_temp=50.0,
                 sa_cooling=0.965,
                 agent=None):

        self.dm            = data_manager
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = min(elitism, pop_size)
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
        self.bandit        = UCB1Bandit(N_OPERATORS, exploration_c=1.1)
        self.generation    = 0
        self.best_ever     = None
        self.best_ever_fit = float('inf')
        self.population    = []

    def get_score(self, schedule):
        if hasattr(schedule, 'fitness') and schedule.fitness is not None:
            return schedule.fitness
        s, h, soft, _ = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness, schedule.h_violations, schedule.soft_penalty = s, h, soft
        return s

    def create_initial_population(self):
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        for k in range(self.pop_size):
            ind = self._build_greedy_individual() if k < n_greedy \
                  else self._build_random_individual()
            self.get_score(ind)
            self.population.append(ind)
        self.population.sort(key=lambda x: x.fitness)
        self.best_ever     = copy.deepcopy(self.population[0])
        self.best_ever_fit = self.population[0].fitness

    def _build_random_individual(self):
        assignments = []
        for mp in self.dm.module_parts:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id),
                            random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id),
                            random.choice(self.dm.timeslots))
            else:
                room = random.choice(self.dm.rooms)
                slot = random.choice(self.dm.timeslots)
            assignments.append(Assignment(mp, room, slot))
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        sec_occupancy     = {}

        sec_to_filieres = {}
        for s in self.dm.sections:
            sec_to_filieres[s['id']] = set(
                g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
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

        mps = list(self.dm.module_parts)
        random.shuffle(mps)
        result = []

        for mp in mps:
            is_cm  = (mp.type == "CM")
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gid, "") for gid in mp.td_group_ids)
            sec_id = mp.section_id

            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id),
                            random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id),
                            random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                valid_slots = [s for s in self.dm.timeslots
                               if not (is_cm and s.day == "SAMEDI")]
                cand_slots  = random.sample(valid_slots, min(15, len(valid_slots)))
                cand_rooms  = [r for r in self.dm.rooms
                               if r.capacity >= mp.group_size] or self.dm.rooms

                for sc in cand_slots:
                    for rc in cand_rooms:
                        cost = 0
                        tid  = mp.teacher_id
                        if tid and tid != 231 and (tid, sc.id) in teacher_slot_used: cost += 1000
                        if (rc.id, sc.id) in room_slot_used:                         cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, sc.id) in group_slot_used:                      cost += 1000
                        if tid and tid != 231:
                            po = self.dm.teacher_map.get(tid)
                            if po and sc.id in po.unavailable_slots:                 cost += 1000
                        if mp.required_room_type and rc.type != mp.required_room_type: cost += 1000
                        if sc.day == "SAMEDI": cost += 100000 if is_cm else 15000
                        if sec_id:
                            for r_sid in related_sids.get(sec_id, []):
                                rs = sec_occupancy.get((r_sid, sc.id))
                                if rs:
                                    if (is_cm or is_gr6) and rs['any']: cost += 3000
                                    elif rs['cm'] or rs['gr6']:          cost += 3000
                        if cost < best_cost:
                            best_cost, best_room, best_slot = cost, rc, sc
                            if cost == 0: break
                    if best_cost == 0: break
                room, slot = best_room, best_slot

            if mp.teacher_id and mp.teacher_id != 231:
                teacher_slot_used[(mp.teacher_id, slot.id)] = True
            room_slot_used[(room.id, slot.id)] = True
            for gid in mp.td_group_ids:
                group_slot_used[(gid, slot.id)] = True
            if sec_id:
                k2 = (sec_id, slot.id)
                if k2 not in sec_occupancy:
                    sec_occupancy[k2] = {'cm': False, 'gr6': False, 'any': False}
                sec_occupancy[k2]['any'] = True
                if is_cm:  sec_occupancy[k2]['cm'] = True
                if is_gr6: sec_occupancy[k2]['gr6'] = True
            result.append(Assignment(mp, room, slot))

        return Schedule(self.dm, result)

    def evolve(self):
        """
        Cycle d'évolution complet d'une génération.
        L'algorithme sépare les tâches : Intensification (Élites) vs Diversification (ILS).
        """
        self.generation += 1
        # Tri de la population par score de fitness (le plus bas est le meilleur)
        self.population.sort(key=lambda x: self.get_score(x))
        new_gen, impact_list = [], []

        # --- ÉLITES : SA direct (LA PHASE D'INTENSIFICATION) ---
        for i in range(self.elitism):
            ind     = copy.deepcopy(self.population[i])
            old_fit = self.get_score(ind)
            # Polissage intensif (800 itérations)
            ind     = sa_alns(ind, self.dm, self.constraints_mask, self.bandit,
                               iterations=self.sa_iterations,
                               sa_temp=self.sa_temp,
                               sa_cooling=self.sa_cooling)
            impact_list.append(max(0, old_fit - ind.fitness))
            new_gen.append(ind)

        # --- NON-ÉLITES : ILS + SA (LA PHASE DE DIVERSIFICATION) ---
        strength = max(0.04, 0.12 - self.generation * 0.001)
        while len(new_gen) < self.pop_size:
            tournament = random.sample(self.population, min(4, len(self.population)))
            parent     = min(tournament, key=lambda x: x.fitness)
            old_fit    = self.get_score(parent)
            
            perturbed  = ils_perturbation(parent, self.dm, self.constraints_mask,
                                          strength=strength)
            
            # Polissage light (200 itérations) pour valider rapidement le kick
            improved   = sa_alns(perturbed, self.dm, self.constraints_mask, self.bandit,
                                 iterations=self.sa_iterations // 4,
                                 sa_temp=self.sa_temp,
                                 sa_cooling=self.sa_cooling)
                                 
            impact_list.append(max(0, old_fit - improved.fitness))
            new_gen.append(improved)

        # Tri de la nouvelle génération et sauvegarde du record historique
        new_gen.sort(key=lambda x: x.fitness)
        if new_gen[0].fitness < self.best_ever_fit:
            self.best_ever     = copy.deepcopy(new_gen[0])
            self.best_ever_fit = new_gen[0].fitness

        self.population = new_gen
        # Calcul des statistiques de performance (gain moyen et diversité)
        return (sum(impact_list) / max(1, len(impact_list)),
                self._calculate_population_diversity(new_gen))

    def inject_diversity(self, n_replace=None):
        if n_replace is None:
            n_replace = max(2, self.pop_size // 3)
        kept      = self.population[:self.elitism]
        new_blood = []
        for _ in range(n_replace):
            ind = self._build_greedy_individual()
            sa_alns(ind, self.dm, self.constraints_mask, self.bandit,
                    sa_iterations=self.sa_iterations // 2,
                    sa_temp=self.sa_temp,
                    sa_cooling=self.sa_cooling)
            self.get_score(ind)
            new_blood.append(ind)
        self.population = (kept + new_blood +
                           self.population[self.elitism:self.pop_size - n_replace])
        self.population.sort(key=lambda x: self.get_score(x))

    def simulated_annealing_search(self, schedule):
        return sa_alns(schedule, self.dm, self.constraints_mask, self.bandit,
                       sa_iterations=self.sa_iterations,
                       sa_temp=self.sa_temp,
                       sa_cooling=self.sa_cooling)

    def get_bandit_stats(self):
        raw = self.bandit.get_stats()
        return {OP_NAMES[i]: v for i, v in raw.items()}

    def _calculate_population_diversity(self, pop):
        if not pop or len(pop) < 2: return 0.0
        samples, total = min(10, len(pop)), 0
        for _ in range(samples):
            i1, i2 = random.sample(range(len(pop)), 2)
            dist = sum(1 for a1, a2 in zip(pop[i1].assignments, pop[i2].assignments)
                       if a1.room.id != a2.room.id or a1.timeslot.id != a2.timeslot.id)
            total += dist / max(1, len(pop[i1].assignments))
        return (total / samples) * 100