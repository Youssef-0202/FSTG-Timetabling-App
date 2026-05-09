# ==============================================================================
# engine_alns.py — Moteur ILS-ALNS v2 (Architecture Bi-Niveau Corrigée)
#
# CORRECTIONS v2 vs v1 :
#   ❌ v1 : Bandit mélangeait perturbation (KempeChain) et intensification
#           → KempeChain dominait (récompense immédiate haute à T° élevée)
#           → StabilizeRoom sous-utilisé malgré S6=4300
#
#   ✅ v2 : Séparation stricte des rôles :
#     - NIVEAU 1 (ILS) : KempeChain + RandomShift réservés à la PERTURBATION
#                        uniquement entre deux SA (jamais pendant le SA)
#     - NIVEAU 2 (SA)  : Bandit UCB1 uniquement sur 6 opérateurs d'INTENSIFICATION
#                        (StabilizeRoom, CompactProf, CompactSection, LunchFix,
#                         SwapSlot, SwapRoomOnly)
#
#   ✅ v2 : Récompense absolue (pas normalisée) → signal plus clair pour le bandit
#   ✅ v2 : UCB1 à fenêtre glissante → adaptatif si le paysage de fitness change
#   ✅ v2 : SA température basse (40 vs 80) → intensification, pas exploration
#   ✅ v2 : Perturbation strength décroissante par génération
# ==============================================================================

import random
import copy
import math

from models import Schedule, Assignment
from constraints import calculate_fitness_full


# ==============================================================================
# SECTION A : BANDIT UCB1 À FENÊTRE GLISSANTE
# ==============================================================================

class UCB1Bandit:
    """
    Bandit UCB1 avec fenêtre glissante (Sliding Window UCB).

    Formule : UCB1(i) = Q_w(i) + C * sqrt( ln(N_w) / n_w(i) )
    où les stats sont calculées sur les window_size dernières observations.

    Avantage vs UCB1 classique : s'adapte si l'utilité des opérateurs change
    au fil de la descente (ce qui arrive naturellement quand S6 baisse).
    """

    def __init__(self, n_operators, exploration_c=2.0, window_size=300):
        self.n           = n_operators
        self.C           = exploration_c
        self.window_size = window_size
        self._history    = []          # Liste de (arm, reward)
        self.total_calls = 0
        # Stats globales pour le reporting
        self._g_counts  = [0]   * n_operators
        self._g_rewards = [0.0] * n_operators

    def _window_stats(self):
        win     = self._history[-self.window_size:]
        counts  = [0]   * self.n
        rewards = [0.0] * self.n
        for arm, r in win:
            counts[arm]  += 1
            rewards[arm] += r
        return counts, rewards, len(win)

    def select(self):
        counts, rewards, total = self._window_stats()
        for i in range(self.n):        # Init : chaque bras au moins une fois
            if counts[i] == 0:
                return i
        ucb = [
            (rewards[i] / counts[i]) + self.C * math.sqrt(math.log(total) / counts[i])
            for i in range(self.n)
        ]
        return ucb.index(max(ucb))

    def update(self, arm, reward):
        self._history.append((arm, reward))
        self.total_calls       += 1
        self._g_counts[arm]    += 1
        self._g_rewards[arm]   += reward

    def get_stats(self):
        return {
            i: {
                "count":      self._g_counts[i],
                "avg_reward": round(
                    self._g_rewards[i] / self._g_counts[i], 6
                ) if self._g_counts[i] > 0 else 0.0
            }
            for i in range(self.n)
        }


# ==============================================================================
# SECTION B : OPÉRATEURS D'INTENSIFICATION (contrôlés par le bandit)
# ==============================================================================

def op_stabilize_room(schedule, unlocked, dm):
    """Op 0 — StabilizeRoom : cible S6_Stab. Force la même salle par module."""
    module_groups = {}
    for i in unlocked:
        k = (schedule.assignments[i].module_part.module_id,
             schedule.assignments[i].module_part.type)
        module_groups.setdefault(k, []).append(i)
    if not module_groups:
        return op_swap_room_only(schedule, unlocked, dm)

    # Prioriser les modules les plus fragmentés (plus d'impact sur S6)
    sorted_groups = sorted(module_groups.items(), key=lambda kv: -len(kv[1]))
    _, indices = random.choice(sorted_groups[:min(5, len(sorted_groups))])

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


def op_compact_prof(schedule, unlocked, dm):
    """Op 1 — CompactProf : cible S3_Gaps. Regroupe les cours d'un prof sur un jour."""
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
    pid = a.module_part.teacher_id
    if not pid:
        return op_swap_slot(schedule, unlocked, dm)

    prof_idx = [i for i in unlocked
                if schedule.assignments[i].module_part.teacher_id == pid and i != idx]
    if not prof_idx:
        return op_swap_slot(schedule, unlocked, dm)

    day_cnt = {}
    for i in prof_idx:
        d = schedule.assignments[i].timeslot.day
        day_cnt[d] = day_cnt.get(d, 0) + 1
    anchor = max(day_cnt, key=day_cnt.get)
    slots  = [s for s in dm.timeslots if s.day == anchor]
    if not slots:
        return op_swap_slot(schedule, unlocked, dm)

    old = (a.room, a.timeslot)
    a.timeslot = random.choice(slots)
    return [idx], [old]


def op_compact_section(schedule, unlocked, dm):
    """Op 2 — CompactSection : cible S3_Gaps + S4_Lunch. Regroupe les cours d'une section."""
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
    sid = a.module_part.section_id
    if not sid:
        return op_swap_slot(schedule, unlocked, dm)

    sec_idx = [i for i in unlocked
               if schedule.assignments[i].module_part.section_id == sid and i != idx]
    if not sec_idx:
        return op_swap_slot(schedule, unlocked, dm)

    day_cnt = {}
    for i in sec_idx:
        d = schedule.assignments[i].timeslot.day
        day_cnt[d] = day_cnt.get(d, 0) + 1
    anchor = max(day_cnt, key=day_cnt.get)
    slots  = [s for s in dm.timeslots if s.day == anchor]
    if not slots:
        return op_swap_slot(schedule, unlocked, dm)

    old = (a.room, a.timeslot)
    a.timeslot = random.choice(slots)
    return [idx], [old]


def op_lunch_fix(schedule, unlocked, dm):
    """Op 3 — LunchFix : cible S4_Lunch. Déplace les séances du créneau 12h30."""
    lunch_idx = [
        i for i in unlocked
        if '12' in str(getattr(schedule.assignments[i].timeslot, 'start_time', ''))
    ]
    if not lunch_idx:
        return op_compact_section(schedule, unlocked, dm)

    idx = random.choice(lunch_idx)
    a   = schedule.assignments[idx]
    alt = [s for s in dm.timeslots
           if s.day == a.timeslot.day and
           '12' not in str(getattr(s, 'start_time', ''))]
    if not alt:
        return op_swap_slot(schedule, unlocked, dm)

    old = (a.room, a.timeslot)
    a.timeslot = random.choice(alt)
    return [idx], [old]


def op_swap_slot(schedule, unlocked, dm):
    """Op 4 — SwapSlot : échange de créneaux entre deux cours de la même section."""
    if len(unlocked) < 2:
        return op_swap_room_only(schedule, unlocked, dm)
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
    sec = a.module_part.section_id
    cands = [i for i in unlocked if i != idx and
             schedule.assignments[i].module_part.section_id == sec]
    if not cands:
        cands = [i for i in unlocked if i != idx]
    j = random.choice(cands)
    b = schedule.assignments[j]

    if (a.module_part.type == "CM" and b.timeslot.day == "SAMEDI") or \
       (b.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
        return op_swap_room_only(schedule, unlocked, dm)

    oa = (a.room, a.timeslot)
    ob = (b.room, b.timeslot)
    a.timeslot, b.timeslot = b.timeslot, a.timeslot
    return [idx, j], [oa, ob]


def op_swap_room_only(schedule, unlocked, dm):
    """Op 5 — SwapRoomOnly : réallocation de salle sans toucher aux créneaux."""
    idx = random.choice(unlocked)
    a   = schedule.assignments[idx]
    valid = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid = [r for r in valid if r.type == a.module_part.required_room_type]
    if not valid:
        valid = dm.rooms
    old = (a.room, a.timeslot)
    a.room = random.choice(valid)
    return [idx], [old]


# Registre officiel des opérateurs d'intensification
INTENSIFY_OPS   = [op_stabilize_room, op_compact_prof, op_compact_section,
                   op_lunch_fix, op_swap_slot, op_swap_room_only]
INTENSIFY_NAMES = ["StabilizeRoom", "CompactProf", "CompactSection",
                   "LunchFix", "SwapSlot", "SwapRoomOnly"]
N_INTENSIFY     = len(INTENSIFY_OPS)


# ==============================================================================
# SECTION C : OPÉRATEURS DE PERTURBATION (utilisés uniquement dans l'ILS)
# ==============================================================================

def perturb_kempe(schedule, unlocked, dm):
    """Kempe Chain : échange complet de deux créneaux (perturbation forte)."""
    if len(dm.timeslots) < 2:
        return
    slot_a, slot_b = random.sample(dm.timeslots, 2)
    aa = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_a.id]
    bb = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_b.id]

    for i in aa:
        if schedule.assignments[i].module_part.type == "CM" and slot_b.day == "SAMEDI":
            return
    for i in bb:
        if schedule.assignments[i].module_part.type == "CM" and slot_a.day == "SAMEDI":
            return

    for i in aa:
        schedule.assignments[i].timeslot = slot_b
    for i in bb:
        schedule.assignments[i].timeslot = slot_a


def perturb_random_block(schedule, unlocked, dm, n=4):
    """Perturbation légère : déplace n séances au hasard."""
    sample = random.sample(unlocked, min(n, len(unlocked)))
    for idx in sample:
        a = schedule.assignments[idx]
        valid_slots = [s for s in dm.timeslots
                       if not (a.module_part.type == "CM" and s.day == "SAMEDI")]
        valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
        if a.module_part.required_room_type:
            valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
        if not valid_rooms:
            valid_rooms = dm.rooms
        a.timeslot = random.choice(valid_slots)
        a.room     = random.choice(valid_rooms)


# ==============================================================================
# SECTION D : SA INTENSIFICATION (recuit avec bandit UCB1)
# ==============================================================================

def sa_intensify(schedule, dm, constraints_mask, bandit,
                 sa_iterations=2500, sa_temp=40.0, sa_cooling=0.985):
    """
    Recuit Simulé d'INTENSIFICATION pure.

    Clé de la correction v2 :
    - Température BASSE (40) = petits pas raffinés, pas de grands sauts
    - UNIQUEMENT les opérateurs d'intensification (pas de Kempe/Random)
    - Récompense = amélioration ABSOLUE du soft score (signal non bruité)
    - Reheat progressif × 2 si stagnation prolongée
    """

    def score(sch):
        if sch.fitness is None:
            s, h, soft, _ = calculate_fitness_full(sch, mask=constraints_mask)
            sch.fitness, sch.h_violations, sch.soft_penalty = s, h, soft
        return sch.fitness

    current_fit = score(schedule)
    best_fit    = current_fit
    best_state  = [(a.room, a.timeslot) for a in schedule.assignments]

    # Température adaptée : si hard violations, on chauffe plus fort
    T0   = sa_temp * 4.0 if (schedule.h_violations or 0) > 0 else sa_temp
    temp = T0
    unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
    if not unlocked:
        return schedule

    stag    = 0
    reheat  = 0
    phase   = 'hard' if (schedule.h_violations or 0) > 0 else 'soft'

    for it in range(sa_iterations):
        # Bascule dynamique hard → soft
        if phase == 'hard' and (schedule.h_violations or 0) == 0:
            phase = 'soft'
            temp  = sa_temp   # Reset T basse pour la phase soft

        # Reheat si plateau (max 2 fois)
        if stag > sa_iterations // 7 and reheat < 2:
            temp   = T0 * (0.35 ** reheat)
            stag   = 0
            reheat += 1

        # Sélection opérateur
        if phase == 'hard':
            arm = random.randint(4, 5)    # SwapSlot ou SwapRoomOnly pour la phase hard
        else:
            arm = bandit.select()

        saved_i, saved_s = INTENSIFY_OPS[arm](schedule, unlocked, dm)

        schedule.fitness = None
        new_fit = score(schedule)
        delta   = new_fit - current_fit

        if delta < 0 or (temp > 1e-10 and random.random() < math.exp(-delta / temp)):
            current_fit = new_fit
            stag        = 0
            if phase == 'soft':
                # Récompense absolue : signal clair même à basse température
                bandit.update(arm, max(0.0, -delta))
            if current_fit < best_fit:
                best_fit   = current_fit
                best_state = [(a.room, a.timeslot) for a in schedule.assignments]
        else:
            for i, (r, s) in zip(saved_i, saved_s):
                schedule.assignments[i].room     = r
                schedule.assignments[i].timeslot = s
            schedule.fitness = current_fit
            stag += 1
            if phase == 'soft':
                bandit.update(arm, 0.0)

        temp *= sa_cooling

    # Restauration du meilleur état trouvé
    for i, (r, s) in enumerate(best_state):
        schedule.assignments[i].room     = r
        schedule.assignments[i].timeslot = s
    schedule.fitness = None
    score(schedule)
    return schedule


# ==============================================================================
# SECTION E : ILS — Iterated Local Search
# ==============================================================================

def ils_step(schedule, dm, constraints_mask, bandit,
             sa_iterations, sa_temp, sa_cooling,
             strength=0.07):
    """
    Un pas ILS complet :
    1. Deepcopy de la solution courante
    2. Perturbation (Kempe 65% / bloc aléatoire 35%)
    3. SA intensification sur la solution perturbée
    4. Acceptation si amélioration (First-Improvement strict)
    """
    perturbed = copy.deepcopy(schedule)
    perturbed.fitness = perturbed.h_violations = perturbed.soft_penalty = None
    unlocked  = [i for i, a in enumerate(perturbed.assignments) if not a.module_part.is_locked]
    if not unlocked:
        return schedule

    n_kicks = max(1, int(len(unlocked) * strength))
    for _ in range(n_kicks):
        if random.random() < 0.65:
            perturb_kempe(perturbed, unlocked, dm)
        else:
            perturb_random_block(perturbed, unlocked, dm, n=3)

    perturbed = sa_intensify(perturbed, dm, constraints_mask, bandit,
                             sa_iterations=sa_iterations,
                             sa_temp=sa_temp,
                             sa_cooling=sa_cooling)

    orig_fit = schedule.fitness if schedule.fitness is not None else float('inf')
    pert_fit = perturbed.fitness if perturbed.fitness is not None else float('inf')
    return perturbed if pert_fit < orig_fit else schedule


# ==============================================================================
# SECTION F : HYBRID ENGINE (Interface identique à votre codebase)
# ==============================================================================

class HybridEngine:
    """
    Moteur ILS-ALNS v2 — Architecture Bi-Niveau.

    Interface 100% compatible :
      create_initial_population() / evolve() / inject_diversity()
      simulated_annealing_search() / get_score() / get_bandit_stats()
    """

    def __init__(self, data_manager,
                 pop_size=20,
                 constraints_mask=None,
                 mutation_rate=0.40,
                 elitism=2,
                 sa_iterations=2500,
                 sa_temp=40.0,
                 sa_cooling=0.985,
                 agent=None):   # agent conservé pour compatibilité

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

        # Bandit UCB1 partagé — UNIQUEMENT sur les opérateurs d'intensification
        self.bandit        = UCB1Bandit(N_INTENSIFY, exploration_c=2.0, window_size=300)
        self.generation    = 0
        self.best_ever     = None
        self.best_ever_fit = float('inf')
        self.population    = []

    # ── Scoring ──────────────────────────────────────────────────────────────

    def get_score(self, schedule):
        if hasattr(schedule, 'fitness') and schedule.fitness is not None:
            return schedule.fitness
        s, h, soft, _ = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness, schedule.h_violations, schedule.soft_penalty = s, h, soft
        return s

    # ── Construction initiale ─────────────────────────────────────────────────

    def create_initial_population(self):
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        for k in range(self.pop_size):
            ind = self._build_greedy_individual() if k < n_greedy else self._build_random_individual()
            self.get_score(ind)
            self.population.append(ind)
        self.population.sort(key=lambda x: x.fitness)
        self.best_ever     = copy.deepcopy(self.population[0])
        self.best_ever_fit = self.population[0].fitness

    def _build_random_individual(self):
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
        assignments       = {}
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
            if not fils1: continue
            for s2 in self.dm.sections:
                sid2 = s2['id']
                if sid1 == sid2: continue
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
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                valid_slots = [s for s in self.dm.timeslots if not (is_cm and s.day == "SAMEDI")]
                cand_slots  = random.sample(valid_slots, min(15, len(valid_slots)))
                cand_rooms  = [r for r in self.dm.rooms if r.capacity >= mp.group_size] or self.dm.rooms

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

    # ── Évolution (une génération ILS-ALNS bi-niveau) ─────────────────────────

    def evolve(self):
        """
        Génération bi-niveau :
          NIVEAU 1 — Élites (elitism individus) : SA intensif seul (pas de perturbation)
          NIVEAU 2 — Reste  : ILS complet (perturbation Kempe + SA) depuis un parent
        """
        self.generation += 1
        self.population.sort(key=lambda x: self.get_score(x))
        new_gen, impact_list = [], []

        # ── Niveau 1 : Élites → SA intensif ──────────────────────────────────
        for i in range(self.elitism):
            ind     = copy.deepcopy(self.population[i])
            old_fit = self.get_score(ind)
            ind     = sa_intensify(ind, self.dm, self.constraints_mask, self.bandit,
                                   sa_iterations=self.sa_iterations,
                                   sa_temp=self.sa_temp,
                                   sa_cooling=self.sa_cooling)
            impact_list.append(max(0, old_fit - ind.fitness))
            new_gen.append(ind)

        # ── Niveau 2 : Non-élites → ILS ──────────────────────────────────────
        strength = max(0.03, 0.10 - self.generation * 0.0005)  # Décroissant
        while len(new_gen) < self.pop_size:
            tournament = random.sample(self.population, min(3, len(self.population)))
            parent     = min(tournament, key=lambda x: x.fitness)
            old_fit    = self.get_score(parent)
            improved   = ils_step(parent, self.dm, self.constraints_mask, self.bandit,
                                   sa_iterations=max(700, self.sa_iterations // 3),
                                   sa_temp=self.sa_temp * 0.5,
                                   sa_cooling=self.sa_cooling,
                                   strength=strength)
            impact_list.append(max(0, old_fit - improved.fitness))
            new_gen.append(improved)

        # ── Mise à jour ───────────────────────────────────────────────────────
        new_gen.sort(key=lambda x: x.fitness)
        if new_gen[0].fitness < self.best_ever_fit:
            self.best_ever     = copy.deepcopy(new_gen[0])
            self.best_ever_fit = new_gen[0].fitness

        self.population = new_gen
        return (sum(impact_list) / max(1, len(impact_list)),
                self._calculate_population_diversity(new_gen))

    # ── Anti-stagnation ───────────────────────────────────────────────────────

    def inject_diversity(self, n_replace=None):
        if n_replace is None:
            n_replace = max(2, self.pop_size // 4)
        kept      = self.population[:self.elitism]
        new_blood = []
        for _ in range(n_replace):
            ind = self._build_greedy_individual()
            ind = sa_intensify(ind, self.dm, self.constraints_mask, self.bandit,
                               sa_iterations=self.sa_iterations // 4,
                               sa_temp=self.sa_temp * 2,
                               sa_cooling=self.sa_cooling)
            self.get_score(ind)
            new_blood.append(ind)
        rest             = self.population[self.elitism: self.pop_size - n_replace]
        self.population  = kept + new_blood + rest
        self.population.sort(key=lambda x: self.get_score(x))

    # ── Compatibilité ─────────────────────────────────────────────────────────

    def simulated_annealing_search(self, schedule):
        return sa_intensify(schedule, self.dm, self.constraints_mask, self.bandit,
                            sa_iterations=self.sa_iterations,
                            sa_temp=self.sa_temp,
                            sa_cooling=self.sa_cooling)

    def get_bandit_stats(self):
        raw = self.bandit.get_stats()
        return {INTENSIFY_NAMES[i]: v for i, v in raw.items()}

    def _calculate_population_diversity(self, pop):
        if not pop or len(pop) < 2: return 0.0
        samples, total = min(10, len(pop)), 0
        for _ in range(samples):
            i1, i2 = random.sample(range(len(pop)), 2)
            dist = sum(1 for a1, a2 in zip(pop[i1].assignments, pop[i2].assignments)
                       if a1.room.id != a2.room.id or a1.timeslot.id != a2.timeslot.id)
            total += dist / max(1, len(pop[i1].assignments))
        return (total / samples) * 100