# ==============================================================================
# CONSTRAINTS.PY — FORMULATION MATHÉMATIQUE ET PÉDAGOGIQUE
# 
# Approche : Lexicographique avec Facteur de Pénalité Big-M (M = 1,000,000)
# Formule  : Score Total = (M * Somme(Violations_Hard)) + Somme(Pénalités_Soft)
# ==============================================================================

def calculate_fitness_full(schedule, mask=None):
    """
    Calcule la fitness globale d'un emploi du temps.
    
    L'objectif est d'atteindre H_violations = 0 (Solution réalisable),
    puis de minimiser le score Soft (Qualité pédagogique).
    """
    if mask is None:
        mask = {
            "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
            "S_GAPS": True, "S_BALANCE": True, "S_STABILITY": True, "S_LUNCH": True,
            "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True
        }

    M = 1000000 # Poids dissuasif pour les contraintes critiques
    dm = schedule.data_manager
    
    # Initialisation des compteurs
    h_violations = 0
    soft_score = 0
    details = {}

    # 1. ── PRÉ-CALCULS DE STRUCTURE (FILIÈRES) ──
    # Identifie quelles sections partagent les mêmes étudiants (ex: S4 hérite du S2)
    sec_to_filieres = {}
    # { 1: [3, 5, 10], # La section 1 est liée aux sections 3, 5 et 10
    #  2: [4, 6],     # La section 2 est liée aux sections 4 et ... }


    for s in dm.sections:
        sec_to_filieres[s['id']] = set(g.get('filiere_id') for g in s.get('groupes', []) if g.get('filiere_id'))
        
    related_sids = {}
    #1: [9, ...] ➡ "La section 1 est liée à la 9"
    #9: [1, ...] ➡ "La section 9 est liée à la 1" 
    for s1 in dm.sections:
        sid1 = s1['id']
        related_sids[sid1] = [] 
        f1 = sec_to_filieres.get(sid1, set())
        for s2 in dm.sections:
            sid2 = s2['id']
            if sid1 != sid2 and f1.intersection(sec_to_filieres.get(sid2, set())):
                related_sids[sid1].append(sid2)

    # 2. ── ANALYSE DES CONTRAINTES DURES (HARD) ──
    # Ces contraintes DOIVENT être à 0 pour que l'emploi du temps soit valide.
    
    prof_slots = {} # (ID_Prof, ID_Creneau)
    room_slots = {}  
    group_slots = {} 
    sec_occupancy = {} #  H13/H14 (sec_id, slot_id) -> {'cm': bool, 'gr6': bool}
    
    h1, h2, h3, h4, h9, h10, h12 = 0, 0, 0, 0, 0, 0, 0

    for a in schedule.assignments:
        ts_id = a.timeslot.id
        mp = a.module_part
        is_cm = (mp.type == "CM")

        # H1 & H9 : Contraintes Enseignants
        t_id = mp.teacher_id
        if t_id and t_id != 231: # 231 est le prof générique
            # H1: Un prof = Un créneau
            if (t_id, ts_id) in prof_slots: h1 += 1
            prof_slots[(t_id, ts_id)] = True
            # H9: Indisponibilité déclarée
            prof_obj = dm.teacher_map.get(t_id)
            if prof_obj and ts_id in prof_obj.unavailable_slots: h9 += 1
                
        # H2 & H10 : Contraintes Salles
        r_id = a.room.id
        if (r_id, ts_id) in room_slots: h2 += 1
        room_slots[(r_id, ts_id)] = True
        # H10: Type de salle (Amphi vs Salle TD)
        if mp.required_room_type and a.room.type != mp.required_room_type: h10 += 1

        # H4 : Capacité Physique
        if a.room.capacity < mp.group_size: h4 += 1

        # H12 : CM le Samedi interdit
        if a.timeslot.day == "SAMEDI" and is_cm: h12 += 1

        # H3 : Chevauchement de Groupes (Direct et Filière)
        is_gr6 = any("Gr 6" in dm.group_map.get(gid, "") or "Gr6" in dm.group_map.get(gid, "") for gid in mp.td_group_ids)
        
        # Conflit direct (Même groupe au même moment)
        for g_id in mp.td_group_ids:
            if (g_id, ts_id) in group_slots: h3 += 1
            group_slots[(g_id, ts_id)] = True

        # Conflit Filière (H13/H14) : S2 vs S4
        if mp.section_id:
            sec_key = (mp.section_id, ts_id)
            if sec_key not in sec_occupancy: sec_occupancy[sec_key] = {'cm': False, 'gr6': False}
            
            # Un CM ou un Gr 6 ne peut pas chevaucher un autre CM/Gr6 d'une année liée
            for r_sid in related_sids.get(mp.section_id, []):
                r_status = sec_occupancy.get((r_sid, ts_id))
                if r_status:
                    if (is_cm or is_gr6) and (r_status['cm'] or r_status['gr6']):
                        h3 += 3 # Sanction forte pour conflit filière

            # Maj du statut pour les prochaines itérations
            if is_cm: sec_occupancy[sec_key]['cm'] = True
            if is_gr6: sec_occupancy[sec_key]['gr6'] = True

    # Agrégation des Hard Violations selon le masque
    h_violations = (h1 if mask["H1"] else 0) + (h2 if mask["H2"] else 0) + \
                   (h3 if mask["H3"] else 0) + (h4 if mask["H4"] else 0) + \
                   (h9 if mask["H9"] else 0) + (h10 if mask["H10"] else 0) + \
                   (h12 if mask["H12"] else 0)

    # 3. ── ANALYSE DES CONTRAINTES SOUPLES (SOFT) ──
    # Objectif : Confort et Pédagogie.
    
    # Organisation par section pour analyser la journée des étudiants
    section_assigns = {}
    for a in schedule.assignments:
        sid = a.module_part.section_id
        if sid: section_assigns.setdefault(sid, []).append(a)

    s_gaps, s_lunch, s_fatigue, s_balance, s_short, s_free_apm, s_saturday = 0, 0, 0, 0, 0, 0, 0

    for sid, assigns in section_assigns.items():
        day_map = {}
        for a in assigns: day_map.setdefault(a.timeslot.day, []).append(a)
        
        busy_afternoons = set()
        daily_hours = []

        for day, day_acts in day_map.items():
            slots = sorted([a.timeslot.id for a in day_acts])
            daily_hours.append(len(slots) * 1.5)
            
            # S3: Trous (Gaps) - Pénalise les attentes inutiles entre deux cours
            if len(slots) > 1:
                gap_count = (max(slots) - min(slots) + 1) - len(slots)
                s_gaps += gap_count * 10
            
            # Analyse des horaires pour Lunch et Fatigue
            for a in day_acts:
                ts = dm.slot_map.get(a.timeslot.id)
                if not ts: continue
                # S4: Pause Déj (12:30)
                if "12:30" in ts.start_time: s_lunch += 40
                # S9: Fatigue (14:30 = +10, 16h35 = +20)
                if "14:30" in ts.start_time: s_fatigue += 10
                if "16:35" in ts.start_time: s_fatigue += 20
                # S10: Samedi (Malus TD le samedi)
                if ts.day == "SAMEDI": s_saturday += 5000
                # Tracking des après-midis occupés (pour S8)
                if any(h in ts.start_time for h in ["14:30", "16:35"]): busy_afternoons.add(day)

        # S7: Évitement des journées à une seule séance (déplacement inutile)
        s_short += sum(80 for h in daily_hours if h == 1.5)

        # S8: Après-midis libres (Cible : >= 2 après-midis vides par semaine)
        free_apm_count = 5 - len(busy_afternoons)
        if free_apm_count < 2: s_free_apm += (2 - free_apm_count) * 100

        # S5: Équilibre de charge (évite un jour à 6h et un autre à 1.5h)
        if len(daily_hours) > 1:
            avg = sum(daily_hours) / len(daily_hours)
            s_balance += sum(abs(h - avg) * 5 for h in daily_hours)

    # S6: Stabilité des Salles (Un module doit rester dans la même salle au fil de la semaine)
    mod_rooms = {}
    for a in schedule.assignments:
        mid = a.module_part.module_id
        mod_rooms.setdefault(mid, set()).add(a.room.id)
    s_stability = sum((len(rooms)-1) * 100 for rooms in mod_rooms.values() if len(rooms) > 1)

    # Calcul du score Soft total
    soft_score = (s_gaps if mask["S_GAPS"] else 0) + \
                 (s_lunch if mask["S_LUNCH"] else 0) + \
                 (s_fatigue if mask["S_FATIGUE"] else 0) + \
                 (s_balance if mask["S_BALANCE"] else 0) + \
                 (s_stability if mask["S_STABILITY"] else 0) + \
                 (s_short if mask["S_SHORT_DAY"] else 0) + \
                 (s_free_apm if mask["S_FREE_APM"] else 0) + \
                 s_saturday

    # 4. ── RÉSULTAT FINAL ──
    total_score = (M * h_violations) + soft_score
    
    details.update({
        'H_Total': h_violations, 'S_Total': soft_score,
        'H1_Prof': h1, 'H2_Salle': h2, 'H3_Grp': h3, 'H4_Cap': h4, 'H9_Indisp': h9,
        'S3_Gaps': s_gaps, 'S4_Lunch': s_lunch, 'S6_Stab': s_stability, 
        'S8_FreeApm': s_free_apm, 'S10_Sat': s_saturday
    })

    return total_score, h_violations, soft_score, details
