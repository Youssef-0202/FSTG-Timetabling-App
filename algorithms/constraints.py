def calculate_fitness_full(schedule):
    """
    Calculates total fitness using the lexicographical approach 
    F(x) = M * f1 + f2 + alpha * f3
    """
    dm = schedule.data_manager
    assignments = schedule.assignments
    
    # LEVEL 1: VIABILITY (f1 - Hard Constraints)

    h_violations = 0
    
    # Dictionaries for fast conflict detection
    busy_teachers = {} # (slot_id, teacher_id)
    busy_rooms = {}    # (slot_id, room_id)
    busy_groups = {}   # (slot_id) -> set of busy group_ids
    parent_map = {s['id']: s.get('parent_id') for s in dm.sections} 

    
    for a in assignments:
        sid = a.timeslot['id']
        tid = a.module_part['teacher_id']
        rid = a.room['id']
        gid = a.module_part['section_id']

        # H1 & H2: Direct conflicts
        if (sid, tid) in busy_teachers: h_violations += 1
        busy_teachers[(sid, tid)] = True
        
        if (sid, rid) in busy_rooms: h_violations += 1
        busy_rooms[(sid, rid)] = True

        # H3: Structure Conflict (Section vs Group)
        
        # A. Si le groupe lui-même est déjà là -> CONFLIT
        if gid in busy_groups[sid]:
            h_violations += 1
        # B. Si le PARENT du groupe a déjà cours -> CONFLIT
        parent = parent_map.get(gid)
        if parent and parent in busy_groups[sid]:
            h_violations += 1
        # C. Si un ENFANT du groupe a déjà cours -> CONFLIT
        # On regarde tous ceux qui ont déjà cours à ce créneau
        for already_busy_id in busy_groups[sid]:
            if parent_map.get(already_busy_id) == gid:
                h_violations += 1
        busy_groups[sid].add(gid)

        # H4: Capacity
        group_size = a.module_part.get('group_size', 30)
        if group_size > a.room['capacity']:
            h_violations += 1

        # H11: Pedagogical Match
        if a.module_part['type'].upper() == "CM" and "AMPHI" not in a.room['type'].upper():
            h_violations += 1

    # LEVEL 2: QUALITY (f2 - Soft Constraints)
    # S1: Group Gaps & S5: Teacher Gaps
    gaps_penalty = 0
    
    group_days = {} # (gid, day) -> list of slot_ids
    teacher_days = {} # (tid, day) -> list of slot_ids
    
    for a in assignments:
        day = a.timeslot['day']
        sid = a.timeslot['id']
        gid = a.module_part['section_id']
        tid = a.module_part['teacher_id']
        
        k_g = (gid, day)
        if k_g not in group_days: group_days[k_g] = []
        group_days[k_g].append(sid)
        
        k_t = (tid, day)
        if k_t not in teacher_days: teacher_days[k_t] = []
        teacher_days[k_t].append(sid)

    # Calculate Gaps (S1 & S5)
    for slots in group_days.values():
        slots.sort()
        for i in range(len(slots)-1):
            gap = slots[i+1] - slots[i] - 1
            if gap > 0: gaps_penalty += gap

    for slots in teacher_days.values():
        slots.sort()
        for i in range(len(slots)-1):
            gap = slots[i+1] - slots[i] - 1
            if gap > 0: gaps_penalty += gap

    
    # FINAL CALCULATION (Lexicographical)
    
    M = 10000
    schedule.fitness = 1 / (1 + (M * h_violations) + gaps_penalty)
    
    return h_violations, gaps_penalty

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
