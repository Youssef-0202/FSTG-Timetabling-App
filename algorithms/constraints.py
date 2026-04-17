def calculate_fitness_full(schedule, mask=None):
    """
    Calcule la fitness totale en utilisant l'approche lexicographique rapport
    F(x) = M * f1 + f2 + alpha * f3
    
    mask: dict of bool to enabled/disable constraints (e.g. {'H1': False})
    """
    if mask is None:
        mask = {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }

    dm = schedule.data_manager
    assignments = schedule.assignments
    
    # LEVEL 1: VIABILITY (f1 - Hard Constraints)
    h1_violations = 0
    h2_violations = 0
    h3_violations = 0
    h4_violations = 0
    h9_violations = 0
    
    # Dictionnaires pour détection rapide des conflits
    busy_teachers = {} # (slot_id, teacher_id)
    busy_rooms = {}    # (slot_id, room_id)
    busy_groups = {}   # (slot_id) -> set of busy group_ids
    busy_sections = {} # (slot_id) -> {section_id: [types]}
    
    for a in assignments:
        sid = a.timeslot.id
        tid = a.module_part.teacher_id
        rid = a.room.id
        gid = a.module_part.section_id

        # H1: Teacher Conflict
        if tid is not None:
            if (sid, tid) in busy_teachers: 
                if mask.get("H1", True): h1_violations += 1
            busy_teachers[(sid, tid)] = True
            
            # H9 (Inverse): Teacher Availability
            prof = dm.teacher_map.get(tid)
            if prof and sid in prof.unavailable_slots:
                if mask.get("H1", True): h9_violations += 1 
        
        # H2: Room Conflict
        if (sid, rid) in busy_rooms: 
            if mask.get("H2", True): h2_violations += 1
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
                if mask.get("H3", True): h3_violations += 1
            
            # If WE are a CM, check if anyone in the section is already busy
            if m_type == "CM" and sid in busy_sections and sec_id in busy_sections[sid]:
                if len(busy_sections[sid][sec_id]) > 0:
                    if mask.get("H3", True): h3_violations += 1
            
            # RULE 3: Same group overlap
            for gid in my_groups:
                if sid in busy_groups and gid in busy_groups[sid]:
                    if mask.get("H3", True): h3_violations += 1
            
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
            if mask.get("H4", True): h4_violations += 5
        
        # Enforce AMPHI for large CM
        if a.module_part.type == "CM" and a.module_part.group_size > 50:
            if a.room.type != "AMPHI":
                if mask.get("H4", True): h4_violations += 5


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

    # Counters for detailed soft reporting
    mixing_count = 0      # Demi-journées avec mélange de modules
    cm_dispersion_count = 0  # CMs d'une section dispersés matin/après-midi
    gap_count = 0         # Blocs avec créneaux non consécutifs

    # 1. Processing Semi-Day Consistency
    for k, sessions in section_semiday_blocks.items():
        sessions.sort(key=lambda x: x['slot'])
        
        # A. Module Homogeneity within Semi-Day
        if len(sessions) > 1:
            mods_in_block = set(s['mod'] for s in sessions)
            if len(mods_in_block) > 1:
                if mask.get("S_MIXING", True): consec_penalty += 30
                mixing_count += 1
            else:
                if mask.get("S_MIXING", True): consec_penalty -= 10

    # 2. Daily Level Logic (CM Dispersion)
    section_day_cm = {}
    for (sec_id, day, sd), sessions in section_semiday_blocks.items():
        k_day = (sec_id, day)
        if k_day not in section_day_cm: section_day_cm[k_day] = set()
        if any(s['type'] == "CM" for s in sessions):
            section_day_cm[k_day].add(sd)

    for semi_days in section_day_cm.values():
        if len(semi_days) > 1:
            if mask.get("S_CM_DISPERSION", True): consec_penalty += 40
            cm_dispersion_count += 1

    # 3. Traditional Gaps & Sensitive Slots (S4)
    sensitive_penalty = 0
    for (sec_id, day, sd), sessions in section_semiday_blocks.items():
        for s in sessions:
            slot_id = s['slot']
            # S4: Sensitive Slots (Samedi ou fin de journée)
            # Supposons que IDs 5, 10, 15, 20... sont les slots de fin de journée ou Samedi
            # Adapté selon tes IDs de timeslots. Si Samedi est le jour 6:
            if day == "Samedi":
                if mask.get("S_PREFERENCES", True): sensitive_penalty += 30
            # Si c'est le dernier créneau de la journée (ex: 4ème séance)
            if slot_id % 4 == 0: 
                if mask.get("S_PREFERENCES", True): sensitive_penalty += 10
        if len(sessions) > 1:
            sessions.sort(key=lambda x: x['slot'])
            gap = sessions[1]['slot'] - sessions[0]['slot'] - 1
            if gap > 0:
                if mask.get("S_GAPS", True): total_gaps += gap * 5
                gap_count += 1

    # FINAL CALCULATION
    h_violations = h1_violations + h2_violations + h3_violations + h4_violations + h9_violations
    soft_violations = total_gaps + consec_penalty
    
    # Store for UI display in main_solver
    schedule.h_violations = h_violations
    schedule.h1 = h1_violations
    schedule.h2 = h2_violations
    schedule.h3 = h3_violations
    schedule.h4 = h4_violations
    schedule.h9 = h9_violations
    schedule.gaps = total_gaps + consec_penalty
    
    M = 10000
    # Use max(0, ...) to ensure don't cause division by zero
    raw_soft_score = schedule.gaps
    
    # --- SOURCED SOFT CONSTRAINTS (S5, S6, S7) ---
    s5_balance_penalty = 0
    s6_stability_penalty = 0
    s7_empty_day_penalty = 0

    # S6: Room Stability (Un module doit rester dans la même salle)
    # mod_id -> set of room_ids
    mod_rooms = {}
    for a in assignments:
        mid = a.module_part.module_id
        rid = a.room.id
        if mid not in mod_rooms: mod_rooms[mid] = set()
        mod_rooms[mid].add(rid)

    for rooms_set in mod_rooms.values():
        if len(rooms_set) > 1:
            if mask.get("S_STABILITY", True): 
                s6_stability_penalty += (len(rooms_set) - 1) * 50

    # S5 & S7: Daily Balancing (Groups)
    # group_id -> day -> hours
    group_daily_load = {}
    for a in assignments:
        # On utilise les groupes TD pour le calcul de charge (plus fin que la section)
        gids = a.module_part.td_group_ids or [f"sec-{a.module_part.section_id}"]
        day = a.timeslot.day
        for gid in gids:
            if gid not in group_daily_load: group_daily_load[gid] = {}
            group_daily_load[gid][day] = group_daily_load[gid].get(day, 0) + 1.5

    for gid, days in group_daily_load.items():
        daily_hours = list(days.values())
        if not daily_hours: continue
        
        # S7: Évitement des journées "1 séance seulement" (1.5h)
        for h in daily_hours:
            if h == 1.5:
                if mask.get("S_EMPTY_DAYS", True): s7_empty_day_penalty += 100

        # S5: Équilibre (Balance) - Éviter les jours à 6h+ si d'autres jours ont 1.5h
        if len(daily_hours) > 1:
            avg = sum(daily_hours) / 5 # Sur 5 jours ouvrés
            for h in daily_hours:
                if mask.get("S_BALANCE", True):
                    s5_balance_penalty += abs(h - avg) * 10

    # FINAL CALCULATION
    total_soft = raw_soft_score + s5_balance_penalty + s6_stability_penalty + s7_empty_day_penalty + sensitive_penalty
    h_violations = h1_violations + h2_violations + h3_violations + h4_violations + h9_violations
    
    # Store for UI display in main_solver
    schedule.h_violations = h_violations
    schedule.h1 = h1_violations
    schedule.h2 = h2_violations
    schedule.h3 = h3_violations
    schedule.h4 = h4_violations
    schedule.h9 = h9_violations
    schedule.gaps = total_soft
    
    denominator = 1 + (M * h_violations) + total_soft
    schedule.fitness = 1 / max(0.0001, denominator)
    
    return h_violations, total_soft, {
        "H1_Teacher": h1_violations,
        "H2_Room": h2_violations,
        "H3_Section": h3_violations,
        "H4_Capacity": h4_violations,
        "H9_Availability": h9_violations,
        "S1_Mixing": mixing_count,
        "S2_CM_Dispersion": cm_dispersion_count,
        "S3_Gaps": gap_count,
        "S4_Preferences": sensitive_penalty,
        "S5_Balance": int(s5_balance_penalty),
        "S6_Stability": s6_stability_penalty,
        "S7_EmptyDays": s7_empty_day_penalty,
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
