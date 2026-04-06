from typing import List, Dict
from .models import *
from .solution import Timetable, Assignment

class FitnessCalculator:
    def __init__(self, 
                 modules: Dict[str, Module], 
                 rooms: Dict[str, Room], 
                 teachers: Dict[str, Teacher], 
                 groups: Dict[str, StudentGroup],
                 slots: Dict[int, Timeslot],
                 incompatibilities: List[tuple] = None):
        self.modules = modules
        self.rooms = rooms
        self.teachers = teachers
        self.groups = groups
        self.slots = slots
        self.incompatibilities = incompatibilities if incompatibilities else []
        
        self.M = 10000 # Big-M pour f1
        self.alpha = 0.5 # Facteur pour f3
        
        # Poids des Soft Constraints (S1-S7)
        self.weights = {
            "Ps1": 2, "Ps2": 1, "Ps3": 2, "Ps4": 1,
            "Ps5": 2, "Ps6": 1, "Ps7": 5
        }

    def calculate_total_fitness(self, timetable: Timetable) -> float:
        f1 = self.calculate_f1_viability(timetable)
        f2 = self.calculate_f2_quality(timetable)
        f3 = self.calculate_f3_comfort(timetable)
        return (self.M * f1) + f2 + (self.alpha * f3)

    # --- NIVEAU 1 : VIABILITÉ (HARD) ---

    def calculate_f1_viability(self, timetable: Timetable) -> int:
        v = 0
        v += self.check_h1_teacher_conflict(timetable)
        v += self.check_h2_room_conflict(timetable)
        v += self.check_h3_group_conflict(timetable)
        v += self.check_h4_capacity(timetable)
        v += self.check_h5_equipment(timetable)
        v += self.check_h6_consecutivity(timetable)
        v += self.check_h7_weekly_volume(timetable)
        v += self.check_h8_online_consistency(timetable)
        v += self.check_h9_teacher_availability(timetable)
        v += self.check_h10_curriculum_conflict(timetable)
        v += self.check_h11_room_type(timetable)
        v += self.check_h13_daily_limit(timetable)
        return v


    # --- NIVEAU 2 & 3 : QUALITÉ ET CONFORT (SOFT) ---

    def calculate_f2_quality(self, timetable: Timetable) -> float:
        score = 0
        score += self.weights["Ps1"] * self.check_ps1_group_gaps(timetable)
        score += self.weights["Ps5"] * self.check_ps5_teacher_gaps(timetable)
        score += self.weights["Ps6"] * self.check_ps6_room_stability(timetable)
        score += self.weights["Ps7"] * self.check_ps7_empty_days(timetable)
        return score

    def calculate_f3_comfort(self, timetable: Timetable) -> float:
        score = 0
        score += self.weights["Ps2"] * self.check_ps2_weekly_balance(timetable)
        score += self.weights["Ps3"] * self.check_ps3_sensitive_slots(timetable)
        score += self.weights["Ps4"] * self.check_ps4_teacher_prefs(timetable)
        return score

    def check_h1_teacher_conflict(self, timetable: Timetable) -> int:
        v = 0
        usage = {}
        for x in timetable.assignments:
            tid = self.modules[x.module_id].teacher_id
            key = (tid, x.slot_id)
            usage[key] = usage.get(key, 0) + 1
            if usage[key] > 1: v += 1
        return v

    def check_h2_room_conflict(self, timetable: Timetable) -> int:
        v = 0
        usage = {}
        for x in timetable.assignments:
            key = (x.room_id, x.slot_id)
            usage[key] = usage.get(key, 0) + 1
            if usage[key] > 1: v += 1
        return v

    def check_h3_group_conflict(self, timetable: Timetable) -> int:
        v = 0
        busy_groups = {} # (slot_id) -> set of busy group_ids
        
        for x in timetable.assignments:
            gid = self.modules[x.module_id].group_id
            sid = x.slot_id
            
            if sid not in busy_groups: busy_groups[sid] = set()
            
            # 1. Vérification conflit direct (l'entité elle-même)
            if gid in busy_groups[sid]:
                v += 1
            
            # 2. Vérification hiérarchie Section/TD
            # Si gid est un TDGroup, vérifier si sa Section parente est occupée
            group = self.groups[gid]
            if group.parent_id and group.parent_id in busy_groups[sid]:
                v += 1
                
            # Si gid est une Section, vérifier si l'un de ses enfants est occupé
            # On parcourt les autres groupes occupés au même créneau
            if not group.parent_id: # gid est une section
                for other_gid in busy_groups[sid]:
                    other_group = self.groups[other_gid]
                    if other_group.parent_id == gid:
                        v += 1
            
            busy_groups[sid].add(gid)
        return v

    def check_h4_capacity(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            m = self.modules[x.module_id]
            if self.groups[m.group_id].size > self.rooms[x.room_id].capacity:
                v += 1
        return v

    def check_h5_equipment(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            m = self.modules[x.module_id]
            r = self.rooms[x.room_id]
            for req in m.required_features:
                if req not in r.features:
                    v += 1; break
        return v

    def check_h6_consecutivity(self, timetable: Timetable) -> int:
        v = 0
        for mid, m in self.modules.items():
            # H6 : Contrainte appliquée uniquement si is_block est True
            if m.is_block and m.weekly_hours >= 2:
                slots = sorted([a.slot_id for a in timetable.get_assignment_by_module(mid)])
                for i in range(0, len(slots), 2):
                    if i+1 < len(slots) and slots[i+1] != slots[i] + 1: 
                        v += 1
        return v

    def check_h7_weekly_volume(self, timetable: Timetable) -> int:
        v = 0
        for mid, m in self.modules.items():
            if len(timetable.get_assignment_by_module(mid)) != m.weekly_hours:
                v += 1
        return v

    def check_h8_online_consistency(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            if x.modality == Modality.ONLINE and x.room_id != "ONLINE": v += 1
        return v

    def check_h9_teacher_availability(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            t = self.teachers[self.modules[x.module_id].teacher_id]
            if x.slot_id not in t.availabilities: v += 1
        return v

    def check_h10_curriculum_conflict(self, timetable: Timetable) -> int:
        v = 0
        # H10 : Utilisation de la matrice d'incompatibilité pour les redoublants
        for sid in self.slots:
            # Modules programmés au même créneau
            mods_at_slot = [a.module_id for a in timetable.assignments if a.slot_id == sid]
            
            for i in range(len(mods_at_slot)):
                for j in range(i + 1, len(mods_at_slot)):
                    m1, m2 = mods_at_slot[i], mods_at_slot[j]
                    
                    # Vérifier si la paire (m1, m2) est dans le set d'incompatibilités
                    if (m1, m2) in self.incompatibilities or (m2, m1) in self.incompatibilities:
                        v += 1
        return v

    def check_h11_room_type(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            if self.modules[x.module_id].course_type != self.rooms[x.room_id].room_type:
                v += 1
        return v

    def check_h13_daily_limit(self, timetable: Timetable) -> int:
        v = 0
        usage = {}
        for x in timetable.assignments:
            gid = self.modules[x.module_id].group_id
            day = self.slots[x.slot_id].day
            usage[(gid, day)] = usage.get((gid, day), 0) + 1
            if usage[(gid, day)] > 8: v += 1
        return v

    def check_ps3_sensitive_slots(self, timetable: Timetable) -> int:
        v = 0
        for x in timetable.assignments:
            if self.slots[x.slot_id].is_sensitive: v += 1
        return v

    def check_ps4_teacher_prefs(self, timetable: Timetable) -> float:
        penalty = 0
        for x in timetable.assignments:
            t = self.teachers[self.modules[x.module_id].teacher_id]
            pref = t.preferences.get(x.slot_id, 1.0)
            penalty += (1.0 - pref)
        return penalty


    def check_ps6_room_stability(self, timetable: Timetable) -> int:
        """S6: Un module devrait rester dans la même salle."""
        v = 0
        for mid in self.modules:
            rooms_used = set([a.room_id for a in timetable.get_assignment_by_module(mid)])
            if len(rooms_used) > 1: v += (len(rooms_used) - 1)
        return v

    def check_ps1_group_gaps(self, timetable: Timetable) -> int:
        """S1: Minimiser les trous (gaps) pour les groupes."""
        total_gaps = 0
        for gid in self.groups:
            day_slots = {}
            for x in [a for a in timetable.assignments if self.modules[a.module_id].group_id == gid]:
                day = self.slots[x.slot_id].day
                if day not in day_slots: day_slots[day] = []
                day_slots[day].append(x.slot_id)
            
            for slots in day_slots.values():
                slots.sort()
                for i in range(len(slots) - 1):
                    gap = slots[i+1] - slots[i] - 1
                    if gap > 0: total_gaps += gap
        return total_gaps

    def check_ps5_teacher_gaps(self, timetable: Timetable) -> int:
        """S5: Minimiser les trous (gaps) pour les enseignants."""
        total_gaps = 0
        for tid in self.teachers:
            day_slots = {}
            for x in [a for a in timetable.assignments if self.modules[a.module_id].teacher_id == tid]:
                day = self.slots[x.slot_id].day
                if day not in day_slots: day_slots[day] = []
                day_slots[day].append(x.slot_id)
            
            for slots in day_slots.values():
                slots.sort()
                for i in range(len(slots) - 1):
                    gap = slots[i+1] - slots[i] - 1
                    if gap > 0: total_gaps += gap
        return total_gaps

    def check_ps2_weekly_balance(self, timetable: Timetable) -> float:
        """S2: Équilibre de la charge quotidienne."""
        penalty = 0.0
        for gid in self.groups:
            daily_hours = {}
            for x in [a for a in timetable.assignments if self.modules[a.module_id].group_id == gid]:
                day = self.slots[x.slot_id].day
                daily_hours[day] = daily_hours.get(day, 0) + 1
            
            # Pénalité : écart au carré par rapport à une journée idéale de 4h
            for day_h in daily_hours.values():
                penalty += (day_h - 4) ** 2
        return penalty

    def check_ps7_empty_days(self, timetable: Timetable) -> int:
        """S7: Favoriser les journées libres (pénalité si jour travaillé)."""
        worked_days = 0
        for gid in self.groups:
            days = set()
            for x in [a for a in timetable.assignments if self.modules[a.module_id].group_id == gid]:
                days.add(self.slots[x.slot_id].day)
            worked_days += len(days)
        return worked_days
