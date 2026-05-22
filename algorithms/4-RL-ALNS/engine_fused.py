# ==============================================================================
# engine_fused.py — Moteur Hybride FUSIONNÉ (RL + ALNS)
# 
# Philosophie : 
# 1. Macro-Stratégie (RL Actions 8-11) pour les grands changements.
# 2. Micro-Précision (ALNS Actions 0-7) pour le polissage final.
# ==============================================================================

import random
import copy
import math
import sys
import os

# Chargement des contraintes communes
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'commun')))

from models import Schedule, Assignment
from constraints_optimized import calculate_fitness_full
from agent import QLearningAgent

# ==============================================================================
# SECTION 1 : LES 8 MICRO-OPÉRATEURS (ALNS)
# ==============================================================================

def op_random_shift(schedule, unlocked, dm):
    idx = random.choice(unlocked)
    a = schedule.assignments[idx]
    valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
    if not valid_rooms: valid_rooms = dm.rooms
    valid_slots = [s for s in dm.timeslots if not (a.module_part.type == "CM" and s.day == "SAMEDI")]
    old = (a.room, a.timeslot)
    a.room, a.timeslot = random.choice(valid_rooms), random.choice(valid_slots)
    return [idx], [old]

def op_swap_slots(schedule, unlocked, dm):
    if len(unlocked) < 2: return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked); a = schedule.assignments[idx]
    candidates = [i for i in unlocked if i != idx and schedule.assignments[i].module_part.section_id == a.module_part.section_id]
    if not candidates: candidates = [i for i in unlocked if i != idx]
    other_idx = random.choice(candidates); other = schedule.assignments[other_idx]
    if (a.module_part.type == "CM" and other.timeslot.day == "SAMEDI") or (other.module_part.type == "CM" and a.timeslot.day == "SAMEDI"):
        return op_random_shift(schedule, unlocked, dm)
    old_a, old_other = (a.room, a.timeslot), (other.room, other.timeslot)
    a.timeslot, other.timeslot = other.timeslot, a.timeslot
    return [idx, other_idx], [old_a, old_other]

def op_stabilize_room(schedule, unlocked, dm):
    module_groups = {}
    for i in unlocked:
        key = (schedule.assignments[i].module_part.module_id, schedule.assignments[i].module_part.type)
        module_groups.setdefault(key, []).append(i)
    if not module_groups: return op_random_shift(schedule, unlocked, dm)
    multi = [k for k, v in module_groups.items() if len(v) >= 2]
    indices = module_groups[random.choice(multi if multi else list(module_groups.keys()))]
    max_cap = max(schedule.assignments[i].module_part.group_size for i in indices)
    req_type = schedule.assignments[indices[0]].module_part.required_room_type
    valid = [r for r in dm.rooms if r.capacity >= max_cap]
    if req_type: valid = [r for r in valid if r.type == req_type]
    target_room = random.choice(valid if valid else dm.rooms)
    si, ss = [], []
    for i in indices:
        si.append(i); ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
        schedule.assignments[i].room = target_room
    return si, ss

def op_compact_day_prof(schedule, unlocked, dm):
    idx = random.choice(unlocked); a = schedule.assignments[idx]; pid = a.module_part.teacher_id
    prof_assigns = [i for i in unlocked if schedule.assignments[i].module_part.teacher_id == pid and i != idx]
    if not prof_assigns: return op_random_shift(schedule, unlocked, dm)
    day_counts = {}
    for i in prof_assigns: d = schedule.assignments[i].timeslot.day; day_counts[d] = day_counts.get(d, 0) + 1
    anchor_day = max(day_counts, key=day_counts.get)
    slots_on_day = [s for s in dm.timeslots if s.day == anchor_day]
    old = (a.room, a.timeslot); a.timeslot = random.choice(slots_on_day)
    return [idx], [old]

def op_compact_day_section(schedule, unlocked, dm):
    idx = random.choice(unlocked); a = schedule.assignments[idx]; sec_id = a.module_part.section_id
    sec_assigns = [i for i in unlocked if schedule.assignments[i].module_part.section_id == sec_id and i != idx]
    if not sec_assigns: return op_random_shift(schedule, unlocked, dm)
    day_counts = {}
    for i in sec_assigns: d = schedule.assignments[i].timeslot.day; day_counts[d] = day_counts.get(d, 0) + 1
    anchor_day = max(day_counts, key=day_counts.get)
    slots_on_day = [s for s in dm.timeslots if s.day == anchor_day]
    old = (a.room, a.timeslot); a.timeslot = random.choice(slots_on_day)
    return [idx], [old]

def op_lunch_fix(schedule, unlocked, dm):
    l_idx = [i for i in unlocked if '12' in str(getattr(schedule.assignments[i].timeslot, 'start_time', ''))]
    if not l_idx: return op_compact_day_section(schedule, unlocked, dm)
    idx = random.choice(l_idx); a = schedule.assignments[idx]
    alt = [s for s in dm.timeslots if s.day == a.timeslot.day and '12' not in str(getattr(s, 'start_time', ''))]
    if not alt: return op_random_shift(schedule, unlocked, dm)
    old = (a.room, a.timeslot); a.timeslot = random.choice(alt)
    return [idx], [old]

def op_swap_room_only(schedule, unlocked, dm):
    idx = random.choice(unlocked); a = schedule.assignments[idx]
    valid = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type: valid = [r for r in valid if r.type == a.module_part.required_room_type]
    old = (a.room, a.timeslot); a.room = random.choice(valid if valid else dm.rooms)
    return [idx], [old]

def op_kempe_chain(schedule, unlocked, dm):
    if len(dm.timeslots) < 2: return op_swap_slots(schedule, unlocked, dm)
    slot_a, slot_b = random.sample(dm.timeslots, 2)
    aa = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_a.id]
    bb = [i for i in unlocked if schedule.assignments[i].timeslot.id == slot_b.id]
    if not aa and not bb: return op_swap_slots(schedule, unlocked, dm)
    si, ss = [], []
    for i in aa: si.append(i); ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot)); schedule.assignments[i].timeslot = slot_b
    for i in bb: si.append(i); ss.append((schedule.assignments[i].room, schedule.assignments[i].timeslot)); schedule.assignments[i].timeslot = slot_a
    return si, ss

# Mapping des 12 Actions du Moteur Fusionné
ACTION_MAP = {
    0: op_random_shift, 1: op_swap_slots, 2: op_stabilize_room, 3: op_compact_day_prof,
    4: op_compact_day_section, 5: op_lunch_fix, 6: op_swap_room_only, 7: op_kempe_chain,
    8: "macro_stabilize", 9: "macro_compact_prof", 10: "macro_compact_section", 11: "macro_random"
}

class HybridEngine:
    def __init__(self, data_manager, pop_size=20, constraints_mask=None, 
                 mutation_rate=0.4, elitism=2, sa_iterations=1200, sa_temp=50.0, sa_cooling=0.965, agent=None):
        self.dm = data_manager
        self.pop_size = pop_size
        self.mutation_rate = mutation_rate
        self.elitism = elitism
        self.sa_iterations = sa_iterations
        self.sa_temp = sa_temp
        self.sa_cooling = sa_cooling
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
            "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True, "S_STABILITY": True, 
            "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True,
            "S_MIXING": True, "S_CM_DISPERSION": True
        }
        # Agent avec 12 actions (0-7: Micro, 8-11: Macro)
        self.agent = agent or QLearningAgent(actions=list(range(12)))

    def get_score(self, schedule):
        if hasattr(schedule, 'fitness') and schedule.fitness is not None: return schedule.fitness
        s, h, soft, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness, schedule.h_violations, schedule.soft_penalty, schedule.soft_penalty_detail = s, h, soft, details
        return s

    def create_initial_population(self):
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        for k in range(self.pop_size):
            ind = self._build_greedy_individual() if k < n_greedy else self._build_random_individual()
            self.get_score(ind)
            self.population.append(ind)
        self.population.sort(key=lambda x: x.fitness)

    def _build_random_individual(self):
        assignments = [Assignment(mp, random.choice(self.dm.rooms), random.choice(self.dm.timeslots)) for mp in self.dm.module_parts]
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        """Heuristique Constructive Greedy pour garantir H=0 des le depart."""
        assignments = []
        teacher_slot_used = {}; room_slot_used = {}; group_slot_used = {}; sec_occupancy = {}
        sec_to_filieres = {s['id']: set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id')) for s in self.dm.sections}
        related_sids = {}
        for s1 in self.dm.sections:
            sid1 = s1['id']; related_sids[sid1] = []
            fils1 = sec_to_filieres.get(sid1, set())
            for s2 in self.dm.sections:
                sid2 = s2['id']
                if sid1 != sid2 and fils1.intersection(sec_to_filieres.get(sid2, set())):
                    related_sids[sid1].append(sid2)

        mp_shuffled = list(self.dm.module_parts); random.shuffle(mp_shuffled)
        for mp in mp_shuffled:
            is_cm = (mp.type == "CM"); is_gr6 = any("Gr 6" in self.dm.group_map.get(gid, "") for gid in mp.td_group_ids)
            best_room, best_slot, best_cost = None, None, float('inf')
            v_slots = [s for s in self.dm.timeslots if not (is_cm and s.day == "SAMEDI")]
            candidate_slots = random.sample(v_slots, min(20, len(v_slots)))
            
            for slot in candidate_slots:
                for room in random.sample(self.dm.rooms, min(10, len(self.dm.rooms))):
                    if room.capacity < mp.group_size: continue
                    cost = 0
                    if (mp.teacher_id, slot.id) in teacher_slot_used: cost += 1000
                    if (room.id, slot.id) in room_slot_used: cost += 1000
                    for gid in mp.td_group_ids:
                        if (gid, slot.id) in group_slot_used: cost += 1000
                    if mp.required_room_type and room.type != mp.required_room_type: cost += 1000
                    
                    if cost < best_cost:
                        best_cost, best_room, best_slot = cost, room, slot
                        if cost == 0: break
                if best_cost == 0: break
            
            teacher_slot_used[(mp.teacher_id, best_slot.id)] = True
            room_slot_used[(best_room.id, best_slot.id)] = True
            for gid in mp.td_group_ids: group_slot_used[(gid, best_slot.id)] = True
            assignments.append(Assignment(mp, best_room, best_slot))
            
        return Schedule(self.dm, assignments)

    def evolve(self):
        self.population.sort(key=lambda x: self.get_score(x))
        new_gen = self.population[:self.elitism]
        for i in range(len(new_gen)):
            new_gen[i] = self.simulated_annealing_search(new_gen[i])
        while len(new_gen) < self.pop_size:
            p1 = min(random.sample(self.population, 4), key=lambda x: x.fitness)
            child = copy.deepcopy(p1); child.fitness = None
            if random.random() < self.mutation_rate: op_random_shift(child, list(range(len(child.assignments))), self.dm)
            new_gen.append(self.simulated_annealing_search(child))
        self.population = new_gen
        return 0, 0 # Impact/Diversity stats simplifiées ici

    def simulated_annealing_search(self, schedule):
        curr_fit = self.get_score(schedule)
        best_fit, best_state = curr_fit, [(a.room, a.timeslot) for a in schedule.assignments]
        temp = max(self.sa_temp, curr_fit * 0.05)
        unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        
        for it in range(self.sa_iterations):
            state = [schedule.h_violations or 0, 
                     schedule.soft_penalty_detail.get('S3_Gaps', 0), 
                     schedule.soft_penalty_detail.get('S6_Stab', 0), it/self.sa_iterations]
            
            action = self.agent.choose_action(state)
            
            # Application de l'action (Micro 0-7 ou Macro 8-11)
            if action < 8:
                saved_i, saved_s = ACTION_MAP[action](schedule, unlocked, self.dm)
            else:
                # Mouvements Macro (Heuristiques composites)
                if action == 8: saved_i, saved_s = op_stabilize_room(schedule, unlocked, self.dm)
                elif action == 9: saved_i, saved_s = op_compact_day_prof(schedule, unlocked, self.dm)
                elif action == 10: saved_i, saved_s = op_compact_day_section(schedule, unlocked, self.dm)
                else: saved_i, saved_s = op_random_shift(schedule, unlocked, self.dm)

            schedule.fitness = None
            neigh_fit = self.get_score(schedule)
            delta = neigh_fit - curr_fit

            if delta < 0 or (temp > 0 and random.random() < math.exp(-delta/temp)):
                curr_fit = neigh_fit
                # RECOMPENSE BOOSTEE : On valorise enormement les gains soft quand H=0
                reward = 0.0
                if delta < 0:
                    improvement_abs = -delta
                    # Multiplicateur adaptatif : plus on est proche de la fin, plus le gain est precieux
                    reward = (improvement_abs / 50.0) * (1.0 + best_fit/10000.0)
                
                self.agent.learn(state, action, reward, 
                                [schedule.h_violations or 0, schedule.soft_penalty_detail.get('S3_Gaps', 0),
                                 schedule.soft_penalty_detail.get('S6_Stab', 0), (it+1)/self.sa_iterations])
                if curr_fit < best_fit:
                    best_fit, best_state = curr_fit, [(a.room, a.timeslot) for a in schedule.assignments]
            else:
                for i, (r, s) in zip(saved_i, saved_s): schedule.assignments[i].room, schedule.assignments[i].timeslot = r, s
                schedule.fitness = curr_fit
            temp *= self.sa_cooling

        for i, (r, s) in enumerate(best_state): schedule.assignments[i].room, schedule.assignments[i].timeslot = r, s
        schedule.fitness = None; self.get_score(schedule)
        return schedule
