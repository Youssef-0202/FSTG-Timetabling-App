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
    
    # Identification GB-GEG S2 pour filtrage slots
    gb_id = None
    for sid, name in dm.sec_id_to_name.items():
        if "GB" in name.upper() and "GEG" in name.upper() and "S2" in name.upper():
            gb_id = sid; break

    def is_ok(s):
        st = s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else str(s.start_time)[:5]
        is_morn = (st in ["08:30", "10:35"])
        is_target_sec = (a.module_part.section_id == gb_id)
        if is_target_sec and st == "12:30": return False
        
        if s.day == "SAMEDI":
            is_p_grp = False
            if is_target_sec:
                for gid in a.module_part.td_group_ids:
                    gn = dm.group_map.get(gid, ""); import re
                    m = re.search(r'Gr\s*(\d+)', gn)
                    if m and int(m.group(1)) > 2: is_p_grp = True; break
            return (is_target_sec and is_morn and a.module_part.type != "CM" and is_p_grp)
        return True

    valid_rooms = [r for r in dm.rooms if r.capacity >= a.module_part.group_size]
    if a.module_part.required_room_type:
        valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
    if not valid_rooms: valid_rooms = dm.rooms
    
    valid_slots = [s for s in dm.timeslots if is_ok(s)]
    # Filtrage des créneaux indisponibles (Sanctuarisation TP)
    if a.module_part.unavailable_slots:
        valid_slots = [s for s in valid_slots if s.id not in a.module_part.unavailable_slots]
    if not valid_slots: # Fallback de secours (Semaine uniquement)
        valid_slots = [s for s in dm.timeslots if s.day != "SAMEDI"]
    
    old = (a.room, a.timeslot)
    a.room, a.timeslot = random.choice(valid_rooms), random.choice(valid_slots)
    return [idx], [old]

def op_swap_slots(schedule, unlocked, dm):
    if len(unlocked) < 2: return op_random_shift(schedule, unlocked, dm)
    idx = random.choice(unlocked); a = schedule.assignments[idx]
    candidates = [i for i in unlocked if i != idx and schedule.assignments[i].module_part.section_id == a.module_part.section_id]
    if not candidates: candidates = [i for i in unlocked if i != idx]
    other_idx = random.choice(candidates); other = schedule.assignments[other_idx]
    
    gb_id = None
    for sid, n in dm.sec_id_to_name.items():
        if "GB" in n.upper() and "GEG" in n.upper() and "S2" in n.upper(): gb_id = sid; break

    def is_ok(s, mp):
        st = s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else str(s.start_time)[:5]
        is_target = (mp.section_id == gb_id)
        if is_target and st == "12:30": return False
        if s.day == "SAMEDI":
            is_p = False
            if is_target:
                for gid in mp.td_group_ids:
                    gn = dm.group_map.get(gid, ""); import re
                    m = re.search(r'Gr\s*(\d+)', gn)
                    if m and int(m.group(1)) > 2: is_p = True; break
            return (is_target and st in ["08:30", "10:35"] and mp.type != "CM" and is_p)
        return True

    if not is_ok(other.timeslot, a.module_part) or not is_ok(a.timeslot, other.module_part):
        return op_random_shift(schedule, unlocked, dm)
    
    old_a, old_other = (a.room, a.timeslot), (other.room, other.timeslot)
    if a.module_part.unavailable_slots and other.timeslot.id in a.module_part.unavailable_slots: return op_random_shift(schedule, unlocked, dm)
    if other.module_part.unavailable_slots and a.timeslot.id in other.module_part.unavailable_slots: return op_random_shift(schedule, unlocked, dm)
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
    # Filtrage Sanctuarisation TP
    if a.module_part.unavailable_slots:
        slots_on_day = [s for s in slots_on_day if s.id not in a.module_part.unavailable_slots]
    if not slots_on_day: return op_random_shift(schedule, unlocked, dm)
    
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
    # Filtrage Sanctuarisation TP
    if a.module_part.unavailable_slots:
        slots_on_day = [s for s in slots_on_day if s.id not in a.module_part.unavailable_slots]
    if not slots_on_day: return op_random_shift(schedule, unlocked, dm)
    
    old = (a.room, a.timeslot); a.timeslot = random.choice(slots_on_day)
    return [idx], [old]

def op_lunch_fix(schedule, unlocked, dm):
    l_idx = [i for i in unlocked if '12' in str(getattr(schedule.assignments[i].timeslot, 'start_time', ''))]
    if not l_idx: return op_compact_day_section(schedule, unlocked, dm)
    idx = random.choice(l_idx); a = schedule.assignments[idx]
    alt = [s for s in dm.timeslots if s.day == a.timeslot.day and '12' not in str(getattr(s, 'start_time', ''))]
    # Filtrage
    if a.module_part.unavailable_slots:
        alt = [s for s in alt if s.id not in a.module_part.unavailable_slots]
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
    
    gb_id = None
    for sid, n in dm.sec_id_to_name.items():
        if "GB" in n.upper() and "GEG" in n.upper() and "S2" in n.upper(): gb_id = sid; break

    def is_ok(s, mp):
        st = s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else str(s.start_time)[:5]
        is_target = (mp.section_id == gb_id)
        if is_target and st == "12:30": return False
        if s.day == "SAMEDI":
            is_p = False
            if is_target:
                for gid in mp.td_group_ids:
                    gn = dm.group_map.get(gid, ""); import re
                    m = re.search(r'Gr\s*(\d+)', gn)
                    if m and int(m.group(1)) > 2: is_p = True; break
            return (is_target and st in ["08:30", "10:35"] and mp.type != "CM" and is_p)
        return True

    for i in aa:
        if not is_ok(slot_b, schedule.assignments[i].module_part): return op_random_shift(schedule, unlocked, dm)
        if schedule.assignments[i].module_part.unavailable_slots and slot_b.id in schedule.assignments[i].module_part.unavailable_slots: return op_random_shift(schedule, unlocked, dm)
    for i in bb:
        if not is_ok(slot_a, schedule.assignments[i].module_part): return op_random_shift(schedule, unlocked, dm)
        if schedule.assignments[i].module_part.unavailable_slots and slot_a.id in schedule.assignments[i].module_part.unavailable_slots: return op_random_shift(schedule, unlocked, dm)

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
            "S_BLOCK_SYNERGY": True
        }
        # Agent avec 12 actions (0-7: Micro, 8-11: Macro)
        self.agent = agent or QLearningAgent(actions=list(range(12)))
        
        # Pre-calcul de l'ID GB-GEG S2 pour les opérateurs
        self.gb_geg_s2_id = None
        for sid, name in self.dm.sec_id_to_name.items():
            n_up = (name or "").upper()
            if "GB" in n_up and "GEG" in n_up and "S2" in n_up:
                self.gb_geg_s2_id = sid
                break

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
        assignments = []
        for mp in self.dm.module_parts:
            valid_slots = self.dm.timeslots
            if mp.unavailable_slots:
                valid_slots = [s for s in self.dm.timeslots if s.id not in mp.unavailable_slots]
            
            assignments.append(Assignment(mp, random.choice(self.dm.rooms), random.choice(valid_slots)))
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        """Heuristique Constructive Greedy pour garantir H=0 + Coherence demi-journees GB-GEG."""
        assignments = []
        teacher_slot_used = {}; room_slot_used = {}; group_slot_used = {}
        
        # Tracking pour la symetrie des blocs
        # (gid, day, block_id) -> list of modules (module_id)
        group_block_history = {} 
        # (sid, day, block_id) -> count of CMs
        section_cm_block_count = {}
        # (module_id) -> best room so far
        module_room_history = {}

        # 1. Identifier GB-GEG S2
        gb_geg_s2_id = None
        for sid_check, name in self.dm.sec_id_to_name.items():
            n_up = (name or "").upper()
            if "GB" in n_up and "GEG" in n_up and "S2" in n_up:
                gb_geg_s2_id = sid_check
                break

        partner_logic = {1:2, 2:1, 4:3, 3:4, 6:5, 5:6}

        def get_gr_num(gid):
            name = self.dm.group_map.get(gid, "")
            import re
            m = re.search(r'Gr\s*(\d+)', name)
            return int(m.group(1)) if m else None

        # Tri : Priorite GB-GEG et CMs
        def sort_priority(mp):
            score = 0
            if mp.section_id == gb_geg_s2_id: score += 5000
            if mp.type == "CM": score += 1000
            score += mp.group_size
            return score

        mp_shuffled = list(self.dm.module_parts)
        mp_shuffled.sort(key=sort_priority, reverse=True)

        for mp in mp_shuffled:
            is_cm = (mp.type == "CM")
            is_gb_geg = (mp.section_id == gb_geg_s2_id)
            
            best_room, best_slot, best_cost = None, None, float('inf')
            
            # --- FILTRAGE STRICT DES CRÉNEAUX ---
            def is_slot_permitted(s, mp_type, is_target_sec, mp_td_ids):
                st = s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else str(s.start_time)[:5]
                is_morn = (st in ["08:30", "10:35"])
                is_lunch = (st == "12:30")
                if is_target_sec and is_lunch: return False
                
                if s.day == "SAMEDI":
                    # Autoriser UNIQUEMENT les TD du matin pour GB-GEG S2 (Gr 3,4,5,6)
                    is_p_grp = False
                    if is_target_sec:
                        for gid in mp_td_ids:
                            gn = self.dm.group_map.get(gid, ""); import re
                            match = re.search(r'Gr\s*(\d+)', gn)
                            if match and int(match.group(1)) > 2: is_p_grp = True; break
                    
                    if is_target_sec and is_morn and mp_type != "CM" and is_p_grp:
                        return True
                    return False
                return True

            v_slots = [s for s in self.dm.timeslots if is_slot_permitted(s, mp.type, is_gb_geg, mp.td_group_ids)]
            
            if mp.unavailable_slots:
                v_slots = [s for s in v_slots if s.id not in mp.unavailable_slots]
            
            if not v_slots: # Fallback semaine
                v_slots = [s for s in self.dm.timeslots if s.day != "SAMEDI"]
            
            # Augmentation massive de la recherche pour garantir H=0
            search_slots = random.sample(v_slots, min(60, len(v_slots)))
            
            for slot in search_slots:
                st_val = slot.start_time.strftime("%H:%M") if hasattr(slot.start_time, 'strftime') else str(slot.start_time)[:5]
                # Block 1 (Matin): 08:30 & 10:35 | Block 2 (Apm): 14:30 & 16:35
                bid = 1 if st_val in ["08:30", "10:35"] else (2 if st_val in ["14:30", "16:35"] else None)
                is_lunch = (st_val == "12:30")

                for room in self.dm.rooms:
                    if room.capacity < mp.group_size: continue
                    cost = 0
                    # Hard constraints (M = 2,000,000)
                    if (mp.teacher_id, slot.id) in teacher_slot_used: cost += 2000000
                    if (room.id, slot.id) in room_slot_used: cost += 2000000
                    for gid in mp.td_group_ids:
                        if (gid, slot.id) in group_slot_used: cost += 2000000
                    if mp.required_room_type and room.type != mp.required_room_type: cost += 2000000
                    
                    # Bonus stabilité salle
                    if mp.module_id in module_room_history and room.id == module_room_history[mp.module_id]:
                        cost -= 500
                    
                    # Logique Specifique GB-GEG S2
                    if is_gb_geg:
                        if is_lunch: cost += 50000 # Interdire le lunch
                        if bid:
                            # 1. Favoriser l'alignement des CM (2 CMs par demi-journee)
                            if is_cm:
                                cm_count = section_cm_block_count.get((gb_geg_s2_id, slot.day, bid), 0)
                                if cm_count == 1: cost -= 5000 # Bonus pour completer le bloc CM
                                elif cm_count == 0: cost += 100 # Leger malus pour ne pas eparpiller
                            
                            # 2. Miroir des TD (Partner Sync)
                            for gid in mp.td_group_ids:
                                g_num = get_gr_num(gid)
                                partner_num = partner_logic.get(g_num)
                                if partner_num:
                                    partner_mod_ids = []
                                    # Chercher les modules déjà placés pour le partenaire dans ce bloc
                                    for (hist_gid, hist_day, hist_bid), mod_ids in group_block_history.items():
                                        if hist_day == slot.day and hist_bid == bid:
                                            h_gnum = get_gr_num(hist_gid)
                                            if h_gnum == partner_num:
                                                partner_mod_ids.extend(mod_ids)
                                    
                                    if partner_mod_ids:
                                        # Bonus si on "Boucle" le module (Switch de module entre binomes)
                                        if mp.module_id in partner_mod_ids:
                                            cost -= 8000 # GROS BONUS pour le switch de module
                                        else:
                                            cost -= 2000 # Bonus simple pour heritabilité du bloc
                                    else:
                                        # Si on est le premier du binome, bonus si on boucher notre propre bloc
                                        my_hist = group_block_history.get((gid, slot.day, bid), [])
                                        if my_hist: cost -= 4000
                    
                    if cost < best_cost:
                        best_cost, best_room, best_slot = cost, room, slot
                        if cost <= -5000: break
                if best_cost <= -5000: break
            
            # Mise à jour des tracking
            if mp.teacher_id: teacher_slot_used[(mp.teacher_id, best_slot.id)] = True
            room_slot_used[(best_room.id, best_slot.id)] = True
            module_room_history[mp.module_id] = best_room.id
            
            st_val = best_slot.start_time.strftime("%H:%M") if hasattr(best_slot.start_time, 'strftime') else str(best_slot.start_time)[:5]
            bid = 1 if st_val in ["08:30", "10:35"] else (2 if st_val in ["14:30", "16:35"] else None)
            
            if is_gb_geg and bid:
                if is_cm:
                    key = (gb_geg_s2_id, best_slot.day, bid)
                    section_cm_block_count[key] = section_cm_block_count.get(key, 0) + 1
                
                for gid in mp.td_group_ids:
                    group_slot_used[(gid, best_slot.id)] = True
                    key = (gid, best_slot.day, bid)
                    group_block_history.setdefault(key, []).append(mp.module_id)
            else:
                for gid in mp.td_group_ids: group_slot_used[(gid, best_slot.id)] = True

            assignments.append(Assignment(mp, best_room, best_slot))
            
        return Schedule(self.dm, assignments)

    def evolve(self):
        self.population.sort(key=lambda x: self.get_score(x))
        new_gen = self.population[:self.elitism]
        
        # 1. SA Intensif sur l'Élite (3 premiers)
        for i in range(len(new_gen)):
            new_gen[i] = self.simulated_annealing_search(new_gen[i], iterations=self.sa_iterations)
            
        # 2. SA Light sur le reste de la population (Fill)
        while len(new_gen) < self.pop_size:
            p1 = min(random.sample(self.population, 4), key=lambda x: x.fitness)
            child = copy.deepcopy(p1); child.fitness = None
            if random.random() < self.mutation_rate: 
                op_random_shift(child, list(range(len(child.assignments))), self.dm)
            
            # --- LOGIQUE TURBO : COMPÉTITION (Optimisation temporelle et convergence) ---
            # On ne polit l'individu que s'il est prometteur ou proche du parent.
            score_child = self.get_score(child)
            if score_child < p1.fitness * 1.05:
                # L'enfant est prometteur : on l'optimise via SA Light
                refined = self.simulated_annealing_search(child, iterations=self.sa_iterations // 4)
                new_gen.append(refined)
            else:
                # L'enfant est trop mauvais : on conserve le parent pour maintenir la qualité (Économie CPU)
                new_gen.append(copy.deepcopy(p1))
            
        self.population = new_gen
        return 0, 0

    def simulated_annealing_search(self, schedule, iterations=None):
        curr_fit = self.get_score(schedule)
        best_fit, best_state = curr_fit, [(a.room, a.timeslot) for a in schedule.assignments]
        temp = max(self.sa_temp, curr_fit * 0.05)
        unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        
        n_iters = iterations if iterations is not None else self.sa_iterations
        for it in range(n_iters):
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