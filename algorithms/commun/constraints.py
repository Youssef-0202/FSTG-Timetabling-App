
def calculate_fitness_full(schedule, mask=None):
    """
    Calcule la fitness totale en utilisant l'approche lexicographique rapport
    F(x) = M * f1 + f2 + alpha * f3
    
    mask: dict of bool to enabled/disable constraints (e.g. {'H1': False})
    """
    if mask is None:
        mask = {
            "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H11": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True,
            "S_BALANCE": True, "S_STABILITY": True, "S_EMPTY_DAYS": True,
            "S_PREFERENCES": True, "S_FREE_AFTERNOONS": True
        }

    M = 1000000 # Big M massif pour interdire les erreurs Hard (Lexicographique)
    
    dm = schedule.data_manager
    h_violations = 0
    total_gaps = 0
    consec_penalty = 0
    mixing_penalty = 0
    dispersion_penalty = 0
    stability_penalty = 0
    s7_empty_day_penalty = 0
    s5_balance_penalty = 0
    s4_lunch_penalty = 0
    s9_fatigue_penalty = 0
    s8_free_afternoon_penalty = 0
    
    s10_saturday_penalty = 0
    
    details = {}

    # ── PRÉ-CALCUL GÉNÉRATIF (H13-H14) ──
    # On construit l'arbre de parenté dynamiquement à partir des noms
    name_to_sid = {s['name']: s['id'] for s in dm.sections}
    sid_to_name = dm.sec_id_to_name
    all_s4_sids = [sid for sid, name in sid_to_name.items() if " S4" in name]
    
    # --- Mapping de Parenté Structurale V3.16 ---
    # Deux sections partagent les mêmes étudiants si elles ont au moins un GroupeFiliere en commun
    related_sids = {}
    sec_to_base_groups = {}
    for s in schedule.data_manager.sections:
        sec_to_base_groups[s['id']] = set(g['id'] for g in s.get('groupes', []))
        
    for s1 in schedule.data_manager.sections:
        sid1 = s1['id']
        related_sids[sid1] = []
        for s2 in schedule.data_manager.sections:
            sid2 = s2['id']
            if sid1 == sid2: continue
            if sec_to_base_groups[sid1].intersection(sec_to_base_groups.get(sid2, set())):
                related_sids[sid1].append(sid2)

    # ── CONTRAINTES DURES (HARD) ──
    
    prof_slots = {}
    room_slots = {}
    group_slots = {}
    sec_occupancy = {} # Tracking chirurgical pour H13-H14: (sec_id, time_id) -> {'cm': bool, 'gr6': bool, 'any': bool}
    
    h1_count = 0
    h2_count = 0
    h3_count = 0
    h4_count = 0
    h9_count = 0
    h10_count = 0

    for a in schedule.assignments:
        # H1: Enseignant (Ignorer si c'est le prof générique ID 231)
        t_id = a.module_part.teacher_id
        if t_id and t_id != 231:
            key = (t_id, a.timeslot.id)
            if key in prof_slots:
                h1_count += 1
            prof_slots[key] = True
            
            # H9: Indisponibilites
            prof_obj = dm.teacher_map.get(t_id)
            if prof_obj and a.timeslot.id in prof_obj.unavailable_slots:
                h9_count += 1
                
        # H2: Salle
        key_r = (a.room.id, a.timeslot.id)
        if key_r in room_slots:
            h2_count += 1
        room_slots[key_r] = True
        
        # H10: Type de Salle Requis
        if a.module_part.required_room_type and a.room.type != a.module_part.required_room_type:
            h10_count += 1

        # H12 & S10: Gestion du Samedi
        if a.timeslot.day == "SAMEDI":
            if a.module_part.type == "CM":
                h_violations += 1 # Hard : Interdiction totale pour les cours magistraux
            else:
                s10_saturday_penalty += 5000 # Soft : Très forte pénalité pour vider le samedi sauf cas critique

        # H3: Chevauchements des Groupes TD (Standard)
        is_gr6 = False
        for g_id in a.module_part.td_group_ids:
            key_g = (g_id, a.timeslot.id)
            if key_g in group_slots:
                h3_count += 1
            group_slots[key_g] = True
            if "Gr 6" in dm.group_map.get(g_id, ""):
                is_gr6 = True

        # H13 & H14: Chevauchements Parents-Enfants (S2 vs S4)
        sec_id = a.module_part.section_id
        if sec_id:
            key_sec = (sec_id, a.timeslot.id)
            if key_sec not in sec_occupancy:
                sec_occupancy[key_sec] = {'cm': False, 'gr6': False, 'any': False}
                
            is_cm = (a.module_part.type == "CM")
            
            # Vérifier les sections liées (Ex: si je suis GB-GEG S2, je regarde GB S4 et GEG S4)
            for r_sid in related_sids.get(sec_id, []):
                r_status = sec_occupancy.get((r_sid, a.timeslot.id))
                if r_status:
                    # Je suis un CM ou Gr 6 S2, et l'autre section a déjà un cours placé
                    if (is_cm or is_gr6) and r_status['any']:
                        h3_count += 3
                    # L'autre section est déjà un CM ou Gr 6 S2, et moi je viens m'ajouter par dessus
                    elif r_status['cm'] or r_status['gr6']:
                        h3_count += 3

            # Mise à jour du statut pour les prochaines séances de la boucle
            sec_occupancy[key_sec]['any'] = True
            if is_cm:  sec_occupancy[key_sec]['cm'] = True
            if is_gr6: sec_occupancy[key_sec]['gr6'] = True

        # H4: Capacite
        if a.room.capacity < a.module_part.group_size:
            h4_count += 1

    if mask.get("H1", True): h_violations += h1_count
    if mask.get("H2", True): h_violations += h2_count
    if mask.get("H3", True): h_violations += h3_count
    if mask.get("H4", True): h_violations += h4_count
    if mask.get("H9", True): h_violations += h9_count
    if mask.get("H10", True): h_violations += h10_count
    
    details['H1'] = h1_count
    details['H2'] = h2_count
    details['H3'] = h3_count
    details['H4'] = h4_count
    details['H9'] = h9_count
    details['H10'] = h10_count
    details['H12_SAT_CM'] = sum(1 for a in schedule.assignments if a.timeslot.day == "SAMEDI" and a.module_part.type == "CM")

    # ── CONTRAINTES SOUPLES (SOFT) ──
    
    # Organisation par Section pour S1, S2, S3, S5, S7, S8
    section_assignments = {}
    for a in schedule.assignments:
        sid = a.module_part.section_id
        if sid not in section_assignments:
            section_assignments[sid] = []
        section_assignments[sid].append(a)

    for sid, assigns in section_assignments.items():
        day_map = {}
        for a in assigns:
            day = a.timeslot.day
            if day not in day_map: day_map[day] = []
            day_map[day].append(a)
            
        # S8: Apres-midis libres (Favoriser >= 2 apm vides par semaine)
        # On considere un apm occupe s'il y a un cours a 14h30 ou 16h35
        busy_days = set()
        daily_hours = [] # pour S7 et S5

        for day, day_assigns in day_map.items():
            # Analyse du temps reel pour S4 et S9
            for a in day_assigns:
                # Recuperer les infos du Timeslot via le DataManager
                ts = dm.slot_map.get(a.timeslot.id)
                if not ts: continue
                
                start_time = ts.start_time # format "HH:MM:SS"
                
                # S4: Pause Dejeuner (12:30)
                if "12:30" in start_time:
                    if mask.get("S_PREFERENCES", True): s4_lunch_penalty += 40
                
                # S9: Fatigue et Preferences
                if "14:30" in start_time:
                    if mask.get("S_PREFERENCES", True): s9_fatigue_penalty += 10
                if "16:35" in start_time:
                    if mask.get("S_PREFERENCES", True): s9_fatigue_penalty += 20
                
                # Detecter si l'apres-midi est occupe (Slots apres 14h)
                if "14:30" in start_time or "16:35" in start_time:
                    busy_days.add(day)

            # S3: Gaps (Trous)
            # Trier par ID de creneau (hypothese: les IDs suivent l'ordre chronologique)
            slots = sorted([a.timeslot.id for a in day_assigns])
            daily_hours.append(len(slots) * 1.5)
            
            if len(slots) > 1:
                # Un trou est un saut dans les IDs de creneaux sur un meme jour
                day_gap = (max(slots) - min(slots) + 1) - len(slots)
                if day_gap > 0:
                    total_gaps += day_gap * 5
            
            # S1: Mixing (Melange de matieres dans la meme demi-journee)
            # Matin: slots 1, 2, 3 | Apres-midi: 4, 5 (ou selon ta structure)
            # Ici simplifie: on verifie juste combien de modules differents par jour
            modules_today = set(a.module_part.module_id for a in day_assigns)
            if len(modules_today) > 1:
                mixing_penalty += 30

        # S8 final calculation
        free_afternoons = 5 - len(busy_days) # On suppose 5 jours travaillés (Lundi-Vendredi)
        if free_afternoons < 2:
            if mask.get("S_FREE_AFTERNOONS", True):
                s8_free_afternoon_penalty += (2 - free_afternoons) * 80

        # S7: Évitement des journées "1 séance seulement" 
        for h in daily_hours:
            if h == 1.5:
                if mask.get("S_EMPTY_DAYS", True): s7_empty_day_penalty += 80

        # S5: Équilibre (Balance) - Éviter les jours à 6h+ si d'autres jours ont 1.5h
        if len(daily_hours) > 1:
            avg = sum(daily_hours) / len(daily_hours)
            for h in daily_hours:
                s5_balance_penalty += abs(h - avg) * 2

    # S6: Stabilite des Salles (Un module doit rester dans la meme salle)
    module_rooms = {}
    for a in schedule.assignments:
        mid = a.module_part.module_id
        if mid not in module_rooms: module_rooms[mid] = set()
        module_rooms[mid].add(a.room.id)
    
    for mid, rooms in module_rooms.items():
        if len(rooms) > 1:
            stability_penalty += (len(rooms) - 1) * 50

    # Aggregation des Hard
    h_violations = h1_count + h2_count + h3_count + h4_count + h9_count + h10_count

    # FINAL CALCULATION
    total_soft = (
        (total_gaps if mask.get("S_GAPS", True) else 0) +
        (mixing_penalty if mask.get("S_MIXING", True) else 0) +
        (dispersion_penalty if mask.get("S_CM_DISPERSION", True) else 0) +
        (stability_penalty if mask.get("S_STABILITY", True) else 0) +
        (s7_empty_day_penalty if mask.get("S_EMPTY_DAYS", True) else 0) +
        (s5_balance_penalty if mask.get("S_BALANCE", True) else 0) +
        (s4_lunch_penalty if mask.get("S_PREFERENCES", True) else 0) +
        (s8_free_afternoon_penalty if mask.get("S_FREE_AFTERNOONS", True) else 0) +
        (s9_fatigue_penalty if mask.get("S_PREFERENCES", True) else 0) +
        s10_saturday_penalty
    )

    total_score = (M * h_violations) + total_soft
    
    # Detail complet pour le reporting
    details.update({
        'H1_Teacher': h1_count,
        'H2_Room': h2_count,
        'H3_Group': h3_count,
        'H4_Cap': h4_count,
        'H9_Unavail': h9_count,
        'H10_RoomType': h10_count,
        'S1_Mixing': mixing_penalty,
        'S2_Disp': dispersion_penalty,
        'S3_Gaps': total_gaps,
        'S4_Lunch': s4_lunch_penalty,
        'S5_Balance': s5_balance_penalty,
        'S6_Stability': stability_penalty,
        'S7_ShortDay': s7_empty_day_penalty,
        'S8_FreeApm': s8_free_afternoon_penalty,
        'S9_Fatigue': s9_fatigue_penalty,
        'S10_Sat_TD': s10_saturday_penalty
    })

    return total_score, h_violations, total_soft, details
