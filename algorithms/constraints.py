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


    # LEVEL 2: QUALITY (Soft Constraints - Semi-Day Blocks)
    total_gaps = 0
    consec_penalty = 0
    
    # (section_id, day, semi_day) -> list of sessions
    # semi_day: 0 for Morning (Slots 1,2), 1 for Afternoon (Slots 3,4)
    section_semiday_blocks = {}
    
    for a in assignments:
        day = a.timeslot.day
        sid = a.timeslot.id
        sec_id = a.module_part.section_id
        m_type = a.module_part.type
        mod_id = a.module_part.module_id

        # Determine semi-day: 1,2 -> 0 | 3,4 -> 1
        semi_day = 0 if sid <= 2 else 1
        
        k = (sec_id, day, semi_day)
        if k not in section_semiday_blocks: section_semiday_blocks[k] = []
        section_semiday_blocks[k].append({
            'slot': sid,
            'type': m_type,
            'mod': mod_id
        })

    # 1. Processing Semi-Day Consistency
    for k, sessions in section_semiday_blocks.items():
        sessions.sort(key=lambda x: x['slot'])
        
        # A. Module Homogeneity within Semi-Day
        # If we have 2 slots in a semi-day, they SHOULD be the same module (for TD)
        if len(sessions) > 1:
            mods_in_block = set(s['mod'] for s in sessions)
            if len(mods_in_block) > 1:
                # Mixing modules in the same morning/afternoon is BAD
                consec_penalty += 30 
            else:
                # Bonus for keeping the same module for the whole block
                consec_penalty -= 10

        # B. CM Continuity (Within semi-day)
        cm_in_block = [s for s in sessions if s['type'] == "CM"]
        if len(cm_in_block) == 1:
            # If there's only 1 CM in this block, but another CM for the same section exists on the SAME DAY
            # (We check this by looking at the day-level dispersion later)
            pass

    # 2. Daily Level Logic (CM Dispersion)
    # Group by (section, day) to see if CMs are split between Morning & Afternoon
    section_day_cm = {}
    for (sec_id, day, sd), sessions in section_semiday_blocks.items():
        k_day = (sec_id, day)
        if k_day not in section_day_cm: section_day_cm[k_day] = set()
        if any(s['type'] == "CM" for s in sessions):
            section_day_cm[k_day].add(sd)

    for semi_days in section_day_cm.values():
        if len(semi_days) > 1:
            # CMs of same section on same day but different semi-days (one morning, one afternoon)
            consec_penalty += 40 # Heavy penalty for dispersion

    # 3. Traditional Gaps (Still important but secondary)
    # (Existing gap logic simplified)
    for (sec_id, day, sd), sessions in section_semiday_blocks.items():
        if len(sessions) > 1:
            sessions.sort(key=lambda x: x['slot'])
            gap = sessions[1]['slot'] - sessions[0]['slot'] - 1
            if gap > 0: total_gaps += gap * 5

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
