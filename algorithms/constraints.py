def calculate_fitness_full(schedule):
    """
    Calcule la fitness totale en utilisant l'approche lexicographique de votre rapport.
    F(x) = M * f1 + f2 + alpha * f3
    """
    dm = schedule.data_manager
    assignments = schedule.assignments
    
    # LEVEL 1: VIABILITY (f1 - Hard Constraints)
    h1_violations = 0
    h2_violations = 0
    h3_violations = 0
    h4_violations = 0
    
    # Dictionnaires pour détection rapide des conflits
    busy_teachers = {} # (slot_id, teacher_id)
    busy_rooms = {}    # (slot_id, room_id)
    busy_groups = {}   # (slot_id) -> set of busy group_ids
    busy_sections = {} # (slot_id) -> {section_id: [types]}
    
    # Mapping rapide des parents (H3)
    parent_map = {s.id: s.parent_id for s in dm.sections} 

    for a in assignments:
        sid = a.timeslot.id
        tid = a.module_part.teacher_id
        rid = a.room.id
        gid = a.module_part.section_id

        # H1: Teacher Conflict
        if tid is not None:
            if (sid, tid) in busy_teachers: h1_violations += 1
            busy_teachers[(sid, tid)] = True
        
        # H2: Room Conflict
        if (sid, rid) in busy_rooms: h2_violations += 1
        busy_rooms[(sid, rid)] = True

        # H3: Section & Group Conflicts (The 4 Rules)
        sec_id = a.module_part.section_id
        sid = a.timeslot.id
        m_type = a.module_part.type
        my_groups = a.module_part.td_group_ids

        if sec_id:
            # RULE 1 & 2: CM occupation
            # If there's a CM in this section, nobody else can have class
            if sid in busy_sections and sec_id in busy_sections[sid] and "CM" in busy_sections[sid][sec_id]:
                h3_violations += 1
            
            # If WE are a CM, check if anyone in the section is already busy
            if m_type == "CM" and sid in busy_sections and sec_id in busy_sections[sid]:
                if len(busy_sections[sid][sec_id]) > 0:
                    h3_violations += 1
            
            # RULE 3: Same group overlap
            for gid in my_groups:
                if sid in busy_groups and gid in busy_groups[sid]:
                    h3_violations += 1
            
            # Record our usage
            if sid not in busy_sections: busy_sections[sid] = {}
            if sec_id not in busy_sections[sid]: busy_sections[sid][sec_id] = []
            busy_sections[sid][sec_id].append(m_type)
            
            if sid not in busy_groups: busy_groups[sid] = set()
            for gid in my_groups:
                busy_groups[sid].add(gid)

        # H4: Capacity & Suitability
        if a.module_part.group_size > a.room.capacity:
            # Weighted penalty: large violations count more
            h4_violations += 5
        
        # Enforce AMPHI for large CM
        if a.module_part.type == "CM" and a.module_part.group_size > 50:
            if a.room.type != "AMPHI":
                h4_violations += 5


    # LEVEL 2: QUALITY (Soft Constraints - Compactness)
    total_gaps = 0
    consec_penalty = 0
    
    section_day_slots = {} # (section_id, day) -> list of (slot_id, type, module_id)
    
    for a in assignments:
        day = a.timeslot.day
        sid = a.timeslot.id
        sec_id = a.module_part.section_id
        m_type = a.module_part.type
        mod_id = a.module_part.module_id

        # Track for specific section logic
        k_s = (sec_id, day)
        if k_s not in section_day_slots: section_day_slots[k_s] = []
        section_day_slots[k_s].append({
            'slot': sid,
            'type': m_type,
            'mod': mod_id
        })

    # 1. Section Logic (Multi-Module)
    for k, sessions in section_day_slots.items():
        sessions.sort(key=lambda x: x['slot'])
        
        # A. Global Gaps (Empty slots between any classes of the section)
        for i in range(len(sessions)-1):
            gap = sessions[i+1]['slot'] - sessions[i]['slot'] - 1
            if gap > 0: 
                total_gaps += gap * 2
        
        # B. Module Stability (CRITICAL: All groups of SAME module must be together)
        # Group by module for this specific day
        mods_today = {}
        for s in sessions:
            if s['mod'] not in mods_today: mods_today[s['mod']] = []
            mods_today[s['mod']].append(s['slot'])
            
        for mod_id, slots in mods_today.items():
            if len(slots) > 1:
                slots.sort()
                for i in range(len(slots)-1):
                    gap = slots[i+1] - slots[i] - 1
                    if gap > 0:
                        # Heavy penalty if Grupe 1 is morning and Groupe 2 is afternoon for same module
                        consec_penalty += 15
                    else:
                        # Bonus for perfect consecutiveness
                        consec_penalty -= 5

        # C. CM Consecutiveness
        cm_slots = [s['slot'] for s in sessions if s['type'] == "CM"]
        if len(cm_slots) > 1:
            cm_slots.sort()
            for i in range(len(cm_slots)-1):
                if (cm_slots[i+1] - cm_slots[i]) > 1:
                    consec_penalty += 10 # Penalty for non-consecutive CMs

    # FINAL CALCULATION
    h_violations = h1_violations + h2_violations + h3_violations + h4_violations
    soft_violations = total_gaps + consec_penalty
    
    # Store for UI display in main_solver
    schedule.h_violations = h_violations
    schedule.h1 = h1_violations
    schedule.h2 = h2_violations
    schedule.h3 = h3_violations
    schedule.h4 = h4_violations
    schedule.gaps = total_gaps + consec_penalty
    
    M = 10000
    # Use max(0, ...) to ensure negative gap bonuses don't cause division by zero
    raw_soft_score = schedule.gaps
    denominator = 1 + (M * h_violations) + raw_soft_score
    
    schedule.fitness = 1 / max(0.0001, denominator)
    
    return h_violations, schedule.gaps, {
        "H1_Teacher": h1_violations,
        "H2_Room": h2_violations,
        "H3_Section": h3_violations,
        "H4_Capacity": h4_violations
    }

if __name__ == "__main__":
    from models import Schedule
    from data_manager import DataManager
    dm = DataManager()
    if dm.fetch_all_data():
        sch = Schedule(dm)
        sch.initialize_random()
        h, s = calculate_fitness_full(sch)
        print(f"\n--- Fitness Analysis (FSTM Mode) ---")
        print(f"Hard Violations (f1): {h}")
        print(f"Soft Penalties (f2): {s}")
        print(f"Global Fitness Score: {sch.fitness:.8f}")
