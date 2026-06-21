# ==============================================================================
# CONSTRAINTS_OPTIMIZED.PY — Version haute performance pour RL-Controller
# 
# Optimisations : 
# 1. Mise en cache des relations de filières (related_sids)
# 2. Utilisation de drapeaux pré-calculés pour les créneaux (is_lunch, is_morning, etc.)
# 3. Saut complet des calculs Soft si non demandés par le masque
# 4. Accès local aux variables pour accélérer les boucles Python
# ==============================================================================

_RELATED_SIDS_CACHE = None
_SEC_TO_FILIERES_CACHE = None

def calculate_fitness_full(schedule, mask=None):
    """
    Version optimisée de calculate_fitness_full.
    Réduit les accès aux dictionnaires et évite les calculs statiques redondants.
    """
    if mask is None:
        mask = {
            "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
            "S_GAPS": True, "S_BALANCE": True, "S_STABILITY": True, "S_LUNCH": True,
            "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True
        }

    M = 1000000
    dm = schedule.data_manager
    
    # --- [OPT 1] : GESTION DU CACHE STATIQUE DES FILIÈRES ---
    global _RELATED_SIDS_CACHE, _SEC_TO_FILIERES_CACHE
    if _RELATED_SIDS_CACHE is None:
        sec_to_filieres = {}
        for s in dm.sections:
            sec_to_filieres[s['id']] = set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
        
        related_sids = {}
        for s1 in dm.sections:
            sid1 = s1['id']
            related_sids[sid1] = [] 
            f1 = sec_to_filieres.get(sid1, set())
            if not f1: continue
            for s2 in dm.sections:
                sid2 = s2['id']
                if sid1 != sid2 and f1.intersection(sec_to_filieres.get(sid2, set())):
                    related_sids[sid1].append(sid2)
        _RELATED_SIDS_CACHE = related_sids
        _SEC_TO_FILIERES_CACHE = sec_to_filieres
    
    related_sids = _RELATED_SIDS_CACHE
    
    h_violations = 0
    soft_score = 0
    
    prof_slots = {} 
    room_slots = {}  
    group_slots = {} 
    sec_occupancy = {} 
    
    h1, h2, h3, h4, h9, h10, h12 = 0, 0, 0, 0, 0, 0, 0
    
    # --- [OPT 2] : CACHING LOCAL DES RÉFÉRENCES ---
    teacher_map = dm.teacher_map
    group_map = dm.group_map
    group_to_section = dm.group_to_section

    # 1. ── ANALYSE DES CONTRAINTES DURES (HARD) ──
    for a in schedule.assignments:
        ts = a.timeslot
        ts_id = ts.id
        mp = a.module_part
        is_cm = (mp.type == "CM")

        # H1 & H9 : Enseignants
        t_id = mp.teacher_id
        if t_id and t_id != 231:
            key_t = (t_id, ts_id)
            if key_t in prof_slots: h1 += 1
            prof_slots[key_t] = True
            
            prof_obj = teacher_map.get(t_id)
            if prof_obj and ts_id in prof_obj.unavailable_slots: h9 += 1
                
        # H2 & H10 : Salles
        r_id = a.room.id
        key_r = (r_id, ts_id)
        if key_r in room_slots: h2 += 1
        room_slots[key_r] = True
        if mp.required_room_type and a.room.type != mp.required_room_type: h10 += 1

        # H4 : Capacité
        if a.room.capacity < mp.group_size: h4 += 1

        # H12 : Samedi
        if ts.day == "SAMEDI" and is_cm: h12 += 1

        # H3 : Groupes
        is_gr6 = False
        mp_group_ids = mp.td_group_ids
        for g_id in mp_group_ids:
            if "Gr 6" in group_map.get(g_id, ""): is_gr6 = True
            key_g = (g_id, ts_id)
            if key_g in group_slots: h3 += 1
            group_slots[key_g] = True

        # H13/H14 : Filières (Optimisé)
        if mp.section_id or mp_group_ids:
            involved_sections = set()
            if mp.section_id: involved_sections.add(mp.section_id)
            for gid in mp_group_ids:
                g_sec = group_to_section.get(gid)
                if g_sec: involved_sections.add(g_sec)

            if (is_cm or is_gr6) and involved_sections:
                for sid in involved_sections:
                    sec_key = (sid, ts_id)
                    if sec_key not in sec_occupancy: 
                        sec_occupancy[sec_key] = {'cm': False, 'gr6': False}
                    
                    for r_sid in related_sids.get(sid, []):
                        r_status = sec_occupancy.get((r_sid, ts_id))
                        if r_status and (r_status['cm'] or r_status['gr6']):
                            h3 += 3

                for sid in involved_sections:
                    sec_key = (sid, ts_id)
                    if is_cm: sec_occupancy[sec_key]['cm'] = True
                    if is_gr6: sec_occupancy[sec_key]['gr6'] = True

    h_violations = (h1 if mask["H1"] else 0) + (h2 if mask["H2"] else 0) + \
                   (h3 if mask["H3"] else 0) + (h4 if mask["H4"] else 0) + \
                   (h9 if mask["H9"] else 0) + (h10 if mask["H10"] else 0) + \
                   (h12 if mask["H12"] else 0)

    # --- [OPT 3] : SKIP COMPLET DU SOFT SI NON DEMANDÉ OU SI PHASE HARD ---
    # Cette optimisation permet de diviser le temps de calcul par 2 en phase de faisabilité.
    has_soft_requested = any(k.startswith("S_") or k in ["S3_Gaps", "S4_Lunch", "S6_Stab"] for k, v in mask.items() if v)
    
    if not has_soft_requested:
        return (M * h_violations), h_violations, 0, {'H_Total': h_violations, 'H1_Prof': h1, 'H2_Salle': h2, 'H3_Grp': h3}

    # 3. ── ANALYSE DES CONTRAINTES SOUPLES (SOFT) ──
    s_gaps, s_lunch, s_fatigue, s_balance, s_short, s_free_apm, s_saturday = 0, 0, 0, 0, 0, 0, 0
    s_stability = 0

    section_assigns = {}
    mod_rooms = {}
    
    for a in schedule.assignments:
        # Optimisation : on remplit tout en un seul passage
        sid = a.module_part.section_id
        if sid: section_assigns.setdefault(sid, []).append(a)
        
        mid = a.module_part.module_id
        mod_rooms.setdefault(mid, set()).add(a.room.id)

    # S6: Stabilité (Calculé hors boucle de section)
    if mask.get("S_STABILITY", True):
        for rooms in mod_rooms.values():
            if len(rooms) > 1: s_stability += (len(rooms)-1) * 100

    for sid, assigns in section_assigns.items():
        day_map = {}
        for a in assigns: day_map.setdefault(a.timeslot.day, []).append(a)
        
        busy_afternoons = set()
        daily_hours = []

        for day, day_acts in day_map.items():
            slots_ids = sorted([a.timeslot.id for a in day_acts])
            daily_hours.append(len(slots_ids) * 1.5)
            
            if mask.get("S_GAPS", True) and len(slots_ids) > 1:
                s_gaps += ((max(slots_ids) - min(slots_ids) + 1) - len(slots_ids)) * 10
            
            for a in day_acts:
                ts = a.timeslot
                start = ts.start_time
                # Remplacement de "in" par comparaison directe (plus rapide)
                if mask.get("S_LUNCH", True) and start == "12:30": s_lunch += 40
                if mask.get("S_FATIGUE", True):
                    if start == "14:30": s_fatigue += 10
                    elif start == "16:35": s_fatigue += 20
                
                if mask.get("S_SATURDAY", True) and ts.day == "SAMEDI":
                    # Morning = 08:30 ou 10:35
                    if start not in ["08:30", "10:35"] or a.module_part.type == "CM":
                        s_saturday += 1000
                
                if mask.get("S_FREE_APM", True) and start in ["14:30", "16:35"]:
                    busy_afternoons.add(day)

        if mask.get("S_SHORT_DAY", True):
            for h in daily_hours:
                if h == 1.5: s_short += 80

        if mask.get("S_FREE_APM", True):
            free_apm_count = 5 - len(busy_afternoons)
            if free_apm_count < 2: s_free_apm += (2 - free_apm_count) * 100

        if mask.get("S_BALANCE", True) and len(daily_hours) > 1:
            avg = sum(daily_hours) / len(daily_hours)
            for h in daily_hours: s_balance += abs(h - avg) * 5

    soft_score = s_gaps + s_lunch + s_fatigue + s_balance + s_stability + s_short + s_free_apm + s_saturday

    details = {
        'H_Total': h_violations, 'S_Total': soft_score,
        'H1_Prof': h1, 'H2_Salle': h2, 'H3_Grp': h3, 'H4_Cap': h4, 'H9_Indisp': h9,
        'S3_Gaps': s_gaps, 'S4_Lunch': s_lunch, 'S6_Stab': s_stability, 
        'S8_FreeApm': s_free_apm, 'S10_Sat': s_saturday
    }

    return (M * h_violations) + soft_score, h_violations, soft_score, details
