# ==============================================================================
# engine.py — Moteur Algorithmique Hybride GA + SA
# 
# Role        : Contient TOUTE la logique mathematique de l algorithme.
#               Il sait COMMENT faire evoluer une population.
#               Il ne decide NI quand s arreter NI comment charger les donnees.
# Dependances : models.py (Schedule, Assignment) | constraints.py (calculate_fitness_full)
# Appele par  : main_solver.py
# ==============================================================================

import random
import copy
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from commun.models import Schedule, Assignment
from commun.constraints import calculate_fitness_full


class HybridEngine:
    """
    Moteur principal de l algorithme Hybride GA+SA (Memetique).
    Chaque individu de la population est un emploi du temps complet (Schedule).
    """

    # SECTION A : INITIALISATION & PARAMETRES
    # ========================================

    def __init__(self, data_manager, 
                 pop_size=30, 
                 constraints_mask=None,
                 mutation_rate=0.15,
                 elitism=2,
                 sa_iterations=400,
                 sa_temp=50.0,
                 sa_cooling=0.95):
        """
        Initialise le moteur avec les donnees et les parametres de l algorithme.

        Params:
            data_manager      -- Objet DataManager contenant salles, profs, creneaux
            pop_size          -- Nombre d individus (chromosomes) dans la population
            constraints_mask  -- Dictionnaire pour activer/desactiver chaque contrainte
            mutation_rate     -- Probabilite de mutation (0.0 a 1.0)
            elitism           -- Nombre d individus a conserver intacts
            sa_iterations     -- Budget d iterations pour la recherche locale (L_max)
            sa_temp           -- Temperature de depart pour SA (T0)
            sa_cooling        -- Coefficient de refroidissement (Alpha)
        """
        # ── Donnees ──
        self.dm = data_manager

        # ── GA Parameters ──
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = elitism

        # ── SA Parameters (Recuit Simule Local) ──
        self.sa_iterations = sa_iterations
        self.sa_temp       = sa_temp
        self.sa_cooling    = sa_cooling

        # ── Masque des contraintes actives ──
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }

    
    # SECTION B : SCORING
    # ==========================================================================

    def get_score(self, schedule):
        """Calculates scalar score for comparison (Total Penalty) with caching (P4/P2)"""
        if hasattr(schedule, 'fitness') and schedule.fitness is not None:
            return schedule.fitness

        score, h, s, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness = score
        schedule.h_violations = h
        schedule.soft_penalty = s
        return score

    
    # SECTION C : INITIALISATION DE LA POPULATION
    # ==========================================================================

    def create_initial_population(self):
        """
        Crée la population initiale (P9).
        Mixte : 80% Greedy (heuristique constructive) + 20% Aléatoire (diversité).
        """
        self.population = []
        n_greedy = int(self.pop_size * 0.8)
        
        for k in range(self.pop_size):
            if k < n_greedy:
                # 80% de solutions intelligentes (H1/H2/H3 minimisés)
                schedule = self._build_greedy_individual()
            else:
                # 20% de solutions purement aléatoires
                schedule = self._build_random_individual()
            self.population.append(schedule)

    def _build_random_individual(self):
        """Ancien comportement : construction 100% aléatoire."""
        assignments = []
        for mp in self.dm.module_parts:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                room = random.choice(self.dm.rooms)
                slot = random.choice(self.dm.timeslots)
            assignments.append(Assignment(mp, room, slot))
        return Schedule(self.dm, assignments)

    def _build_greedy_individual(self):
        """
        Heuristique constructive Greedy (P9) : placement séance par séance de manière intelligente.
        Objectif : Éviter les conflits durs (H1->H14) dès la naissance de l'horaire, 
        pour donner une avance écrasante au Recuit Simulé.
        """
        assignments = []
        
        # 1. Calendriers de suivi : on note ce qui est déjà occupé pour l'individu en cours de création
        teacher_slot_used = {}
        room_slot_used    = {}
        group_slot_used   = {}
        sec_occupancy     = {}  # Tracking S2/S4 comme dans constraints.py
        
        # 2. Pré-remplissage avec les séances VERROUILLÉES (Crucial pour Phase 2)
        for mp in self.dm.module_parts:
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                rid, sid = mp.fixed_room_id, mp.fixed_slot_id
                if mp.teacher_id and mp.teacher_id != 231: teacher_slot_used[(mp.teacher_id, sid)] = True
                room_slot_used[(rid, sid)] = True
                for gid in mp.td_group_ids: group_slot_used[(gid, sid)] = True
                if mp.section_id:
                    key_sec = (mp.section_id, sid)
                    if key_sec not in sec_occupancy: sec_occupancy[key_sec] = {'cm': False, 'gr6': False, 'any': False}
                    sec_occupancy[key_sec]['any'] = True
                    if mp.type == "CM": sec_occupancy[key_sec]['cm'] = True

        # 2b. Préparation des relations pour éviter S2/S4 (H13)
        name_to_sid = {s['name']: s['id'] for s in self.dm.sections}
        sid_to_name = self.dm.sec_id_to_name
        related_sids = {}
        for sid, name in sid_to_name.items():
            related_sids[sid] = []
            if " S2" in name:
                for p in name.replace(" S2", "").split("-"):
                    if f"{p} S4" in name_to_sid: related_sids[sid].append(name_to_sid[f"{p} S4"])            
            elif " S4" in name:
                prefix = name.replace(" S4", "")
                for s2_name, s2_id in name_to_sid.items():
                    if " S2" in s2_name and prefix in s2_name.replace(" S2", "").split("-"):
                        related_sids[sid].append(s2_id)
        
        # Mélanger pour garantir la diversité
        module_parts_shuffled = list(self.dm.module_parts)
        random.shuffle(module_parts_shuffled)
        
        # 3. Placement glouton (Greedy)
        for mp in module_parts_shuffled:
            # Attributs fixes de la séance à placer (Accessibles partout)
            is_cm = (mp.type == "CM")
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gid, "") for gid in mp.td_group_ids)
            sec_id = mp.section_id
            
            if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                # Les séances verrouillées n'ont pas le choix
                room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
            else:
                best_room, best_slot, best_cost = None, None, float('inf')
                
                # Échantillonnage EXHAUSTIF V3.6
                candidate_slots = self.dm.timeslots
                candidate_rooms = [r for r in self.dm.rooms if r.capacity >= mp.group_size]
                if not candidate_rooms: candidate_rooms = self.dm.rooms
                
                # On mélange quand même un peu pour la diversité
                random.shuffle(candidate_slots) 
                
                for slot in candidate_slots:
                    for room in candidate_rooms:
                        cost = 0
                        
                        # --- H1, H2, H3: Base de l'emploi du temps ---
                        t_id = mp.teacher_id
                        if t_id and t_id != 231 and (t_id, slot.id) in teacher_slot_used: cost += 1000
                        if (room.id, slot.id) in room_slot_used: cost += 1000
                        for gid in mp.td_group_ids:
                            if (gid, slot.id) in group_slot_used: cost += 1000
                        
                        # --- H10: Type de Salle ---
                        if mp.required_room_type and room.type != mp.required_room_type: cost += 1000
                        
                        # --- H12: SAMEDI INTERDIT (Nouvelle contrainte !) ---
                        # --- H12: SAMEDI (CM=Hard, TD=Soft cost) ---
                        if slot.day == "SAMEDI":
                            if is_cm: cost += 100000 # Interdit
                            else:     cost += 15000  # Très coûteux (eviter si possible)
                            
                        # --- H13/H14: NE PAS PLACER S2 et S4 EN MÊME TEMPS ---
                        if sec_id:
                            for r_sid in related_sids.get(sec_id, []):
                                r_status = sec_occupancy.get((r_sid, slot.id))
                                if r_status:
                                    if (is_cm or is_gr6) and r_status['any']: cost += 3000
                                    elif r_status['cm'] or r_status['gr6']: cost += 3000

                        # Si on trouve une solution parfaite (coût 0), on s'arrête immédiatement
                        if cost < best_cost:
                            best_cost = cost
                            best_room, best_slot = room, slot
                            if cost == 0: break
                    if best_cost == 0: break
                
                room, slot = best_room, best_slot
            
            # 4. ENREGISTREMENT: Le meilleur choix est acté, on verrouille le calendrier
            if mp.teacher_id and mp.teacher_id != 231: teacher_slot_used[(mp.teacher_id, slot.id)] = True
            room_slot_used[(room.id, slot.id)] = True
            for gid in mp.td_group_ids: group_slot_used[(gid, slot.id)] = True
            
            # Enregistrement chirurgical S2/S4
            if sec_id:
                key_sec = (sec_id, slot.id)
                if key_sec not in sec_occupancy: 
                    sec_occupancy[key_sec] = {'cm': False, 'gr6': False, 'any': False}
                sec_occupancy[key_sec]['any'] = True
                if is_cm:  sec_occupancy[key_sec]['cm'] = True
                if is_gr6: sec_occupancy[key_sec]['gr6'] = True
            
            assignments.append(Assignment(mp, room, slot))
            
        return Schedule(self.dm, assignments)

   
    # SECTION D : EVOLUTION (UNE GENERATION GA COMPLETE)
    # ==========================================================================

    def evolve(self):
        """
        Execute UNE generation complete de l algorithme Genetique.

        Etapes :
            1. Trier la population par score 
            2. Copier les E meilleurs sans modification (Elitisme)
            3. Boucler jusqu a Pop_size individus :
               a. TournamentSelect x2  → choisir Parent_1 et Parent_2
               b. UniformCrossover     → creer un Enfant
               c. Mutate               → modifier aleatoirement un gene de l Enfant
               d. SA Local Search      → polir intensivement l Enfant (400 iterations SA)
               e. Ajouter l Enfant a la nouvelle generation
            4. Remplacer l ancienne population par la nouvelle
            5. Trier la nouvelle population -> population[0] = meilleur de la gen)
        """
        # 1. Trier par fitness (P4/P2 : get_score mettra en cache)
        self.population.sort(key=lambda x: self.get_score(x))

        # 2. Elitisme : conserver les E meilleurs directement
        new_gen = self.population[:self.elitism]

        # 3. Produire les (Pop_size - E) autres individus
        while len(new_gen) < self.pop_size:

            # a. Selection par Tournoi : lire directement le cache fitness (P4)
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: x.fitness)

            # b. Croisement Uniforme : creer un Enfant
            child = self.crossover(p1, p2)
            child.fitness = None  # Invalider : le crossover casse le cache (P2)

            # c. Mutation (Exploration) : 15% de chance
            if random.random() < self.mutation_rate:
                self.mutate(child)
                child.fitness = None  # Invalider : la mutation casse le cache (P2)

            # d. Recherche Locale SA : Calcule et attache child.fitness une seule fois
            child = self.simulated_annealing_search(child)

            new_gen.append(child)

        # 4 & 5. Remplacer et retrier la population (lecture du cache garantie)
        self.population = new_gen
        self.population.sort(key=lambda x: x.fitness)


    # SECTION E : OPERATEURS GENETIQUES
    # ==========================================================================

    def crossover(self, p1, p2):
        """
        Module-preserving Uniform Crossover (P7).
        On choisit le parent AU NIVEAU DU MODULE, pas de la séance.
        Toutes les séances d'un même module viennent du même parent.
        """
        # Grouper les indices de séances par module_id
        module_groups = {}
        for i, a in enumerate(p1.assignments):
            mid = a.module_part.module_id
            module_groups.setdefault(mid, []).append(i)

        new_assignments = [None] * len(p1.assignments)

        for module_id, indices in module_groups.items():
            # Choisir UN seul parent pour TOUT le module
            parent = p1 if random.random() < 0.5 else p2
            for i in indices:
                orig = parent.assignments[i]
                new_assignments[i] = Assignment(orig.module_part, orig.room, orig.timeslot)

        return Schedule(self.dm, new_assignments)

    def mutate(self, schedule):
        """
        Mutation pondérée (P8) : Modifier un gène, en priorité ceux en conflit.
        """
        if not schedule.assignments:
            return
        unlocked = [(i, a) for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked:
            return
            
        # P8 : Calculer des poids basés sur les conflits Hard (H1, H2, H3)
        penalties = self._compute_rough_penalties(schedule)
        weights = [penalties.get(i, 0.1) for i, _ in unlocked]
        
        # Tirage pondéré
        idx = random.choices([i for i, _ in unlocked], weights=weights, k=1)[0]
        
        schedule.assignments[idx].room     = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)

    def _compute_rough_penalties(self, schedule):
        """Calcule sommairement les conflits Hard pour pondérer la mutation (P8)."""
        penalties = {}
        prof_slots = {}
        room_slots = {}
        group_slots = {}
        
        for i, a in enumerate(schedule.assignments):
            penalties[i] = 0.1 # Poids de base pour permettre la mutation de gènes sains
            
            # H1 : Enseignant
            if a.module_part.teacher_id:
                key = (a.module_part.teacher_id, a.timeslot.id)
                if key in prof_slots:
                    penalties[i] += 1000
                    penalties[prof_slots[key]] += 1000
                prof_slots[key] = i
            
            # H2 : Salle
            key_r = (a.room.id, a.timeslot.id)
            if key_r in room_slots:
                penalties[i] += 1000
                penalties[room_slots[key_r]] += 1000
            room_slots[key_r] = i
            
            # H3 : Groupes
            for g_id in a.module_part.td_group_ids:
                key_g = (g_id, a.timeslot.id)
                if key_g in group_slots:
                    penalties[i] += 1000
                    penalties[group_slots[key_g]] += 1000
                group_slots[key_g] = i
                
        return penalties

    
    # SECTION F : RECHERCHE LOCALE (RECUIT SIMULE LOCAL - SA)
    # ==========================================================================

    def _get_sec_penalty(self, sid, ts_id, is_cm, is_gr6, s_map, related_sids):
        p = 0
        for r_sid in related_sids.get(sid, []):
            r_status = s_map.get((r_sid, ts_id))
            if r_status and r_status['any'] > 0:
                if (is_cm or is_gr6): p += r_status['any']
                else: p += (r_status['cm'] + r_status['gr6'])
        return p

    def simulated_annealing_search(self, schedule):
        """
        RECHERCHE LOCALE V3.6 (DELTA-SCORING SYNCHRONISÉ)
        """
        current_sch = schedule
        current_score, current_h, current_s, _ = calculate_fitness_full(current_sch, mask=self.constraints_mask)
        
        # --- INITIALISATION DES TRACKERS D'OCCUPATION ---
        prof_map, room_map, group_map, sec_map = {}, {}, {}, {}
        
        # Mapping des Sections Liées (Parenté Structurale V3.15)
        related_sids = {}
        sec_to_base_groups = {}
        for s in self.dm.sections:
            sec_to_base_groups[s['id']] = set(g['id'] for g in s.get('groupes', []))
            
        for s1 in self.dm.sections:
            sid1 = s1['id']
            related_sids[sid1] = []
            for s2 in self.dm.sections:
                sid2 = s2['id']
                if sid1 == sid2: continue
                # Intersection non vide = Sections interdites sur le même créneau
                if sec_to_base_groups[sid1].intersection(sec_to_base_groups.get(sid2, set())):
                    related_sids[sid1].append(sid2)

        for a in current_sch.assignments:
            tid, rid, sid = a.module_part.teacher_id, a.room.id, a.timeslot.id
            sec_id = a.module_part.section_id
            if tid and tid != 231: prof_map[(tid, sid)] = prof_map.get((tid, sid), 0) + 1
            room_map[(rid, sid)] = room_map.get((rid, sid), 0) + 1
            for gid in a.module_part.td_group_ids: group_map[(gid, sid)] = group_map.get((gid, sid), 0) + 1
            if sec_id:
                ks = (sec_id, sid)
                st = sec_map.get(ks, {'cm':0, 'gr6':0, 'any':0})
                st['any'] += 1
                if a.module_part.type == "CM": st['cm'] += 1
                if any("Gr 6" in self.dm.group_map.get(gx, "") for gx in a.module_part.td_group_ids): st['gr6'] += 1
                sec_map[ks] = st
        
        def get_delta_h(a, old_r, old_s, new_r, new_s):
            dh = 0
            tid, sid = a.module_part.teacher_id, a.module_part.section_id
            is_cm, gids = (a.module_part.type == "CM"), a.module_part.td_group_ids
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gx, "") for gx in gids)
            prof_obj = self.dm.teacher_map.get(tid) if tid else None
            
            # --- 1. SOUSTRACTION (Ancienne position) ---
            if tid and tid != 231:
                if prof_map.get((tid, old_s.id), 0) > 1: dh -= 1
                if prof_obj and old_s.id in prof_obj.unavailable_slots: dh -= 1
            if room_map.get((old_r.id, old_s.id), 0) > 1: dh -= 1
            for gid in gids:
                if group_map.get((gid, old_s.id), 0) > 1: dh -= 1
            if sid:
                if sec_map.get((sid, old_s.id), {}).get('any', 0) > 1: dh -= 1
                dh -= self._get_sec_penalty(sid, old_s.id, is_cm, is_gr6, sec_map, related_sids) * 3
            if old_s.day == "SAMEDI" and is_cm: dh -= 1
            if a.module_part.required_room_type and old_r.type != a.module_part.required_room_type: dh -= 1
            if a.module_part.group_size > old_r.capacity: dh -= 1

            # Update Maps (Tempo)
            if tid and tid != 231: 
                prof_map[(tid, old_s.id)] = max(0, prof_map.get((tid, old_s.id), 1) - 1)
            room_map[(old_r.id, old_s.id)] = max(0, room_map.get((old_r.id, old_s.id), 1) - 1)
            for gid in gids: 
                group_map[(gid, old_s.id)] = max(0, group_map.get((gid, old_s.id), 1) - 1)
            if sid:
                st = sec_map.get((sid, old_s.id), {'any':0,'cm':0,'gr6':0}).copy()
                st['any'] = max(0, st['any'] - 1)
                if is_cm: st['cm'] = max(0, st['cm'] - 1)
                if is_gr6: st['gr6'] = max(0, st['gr6'] - 1)
                sec_map[(sid, old_s.id)] = st

            # --- 2. ADDITION (Nouvelle position) ---
            if tid and tid != 231:
                if prof_map.get((tid, new_s.id), 0) >= 1: dh += 1
                if prof_obj and new_s.id in prof_obj.unavailable_slots: dh += 1
                prof_map[(tid, new_s.id)] = prof_map.get((tid, new_s.id), 0) + 1
            if room_map.get((new_r.id, new_s.id), 0) >= 1: dh += 1
            room_map[(new_r.id, new_s.id)] = room_map.get((new_r.id, new_s.id), 0) + 1
            for gid in gids:
                if group_map.get((gid, new_s.id), 0) >= 1: dh += 1
                group_map[(gid, new_s.id)] = group_map.get((gid, new_s.id), 0) + 1
            if sid:
                ks = (sid, new_s.id)
                st = sec_map.get(ks, {'any':0,'cm':0,'gr6':0}).copy()
                if st['any'] >= 1: dh += 1
                dh += self._get_sec_penalty(sid, new_s.id, is_cm, is_gr6, sec_map, related_sids) * 3
                st['any'] += 1
                if is_cm: st['cm'] += 1
                if is_gr6: st['gr6'] += 1
                sec_map[ks] = st
            if new_s.day == "SAMEDI" and is_cm: dh += 1
            if a.module_part.required_room_type and new_r.type != a.module_part.required_room_type: dh += 1
            if a.module_part.group_size > new_r.capacity: dh += 1
            
            return dh

        temp = max(self.sa_temp, current_h * 1000)
        unlocked = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        best_h_sa = current_h
        best_sch_sa = current_sch.copy()
        
        for it in range(self.sa_iterations):
            # 1. Tenter un mouvement guidé
            idx, old_r, old_s = self._apply_hard_move(current_sch, unlocked, (prof_map, room_map, group_map, sec_map), related_sids)
            a = current_sch.assignments[idx]
            dh = get_delta_h(a, old_r, old_s, a.room, a.timeslot)
            
            # DECISION V3.13 (Focus on H drop)
            accept = False
            if dh < 0: 
                accept = True
            elif dh == 0:
                if random.random() < 0.05: accept = True # Un peu de mouvement même constant
            else:
                if temp > 0:
                    prob = math.exp(-dh * 10 / temp) # On baisse l'échelle pour permettre de l'exploration Hard
                    if random.random() < prob: accept = True
            
            if accept:
                current_h += dh
                if current_h < best_h_sa:
                    best_h_sa = current_h
                    best_sch_sa = current_sch.copy()
            else:
                # UNDO Maps + Schedule
                tid, sid, gids = a.module_part.teacher_id, a.module_part.section_id, a.module_part.td_group_ids
                is_cm_u = (a.module_part.type == "CM")
                is_gr6_u = any("Gr 6" in self.dm.group_map.get(gx, "") for gx in gids)
                
                if tid and tid != 231:
                    prof_map[(tid, a.timeslot.id)] = max(0, prof_map.get((tid, a.timeslot.id), 1) - 1)
                    prof_map[(tid, old_s.id)] = prof_map.get((tid, old_s.id), 0) + 1
                room_map[(a.room.id, a.timeslot.id)] = max(0, room_map.get((a.room.id, a.timeslot.id), 1) - 1)
                room_map[(old_r.id, old_s.id)] = room_map.get((old_r.id, old_s.id), 0) + 1
                for gid in gids:
                    group_map[(gid, a.timeslot.id)] = max(0, group_map.get((gid, a.timeslot.id), 1) - 1)
                    group_map[(gid, old_s.id)] = group_map.get((gid, old_s.id), 0) + 1
                if sid:
                    kn, ko = (sid, a.timeslot.id), (sid, old_s.id)
                    sn, so = sec_map.get(kn, {'any':0,'cm':0,'gr6':0}).copy(), sec_map.get(ko, {'any':0,'cm':0,'gr6':0}).copy()
                    sn['any'] = max(0, sn['any'] - 1); so['any'] += 1
                    if is_cm_u: sn['cm'] = max(0, sn['cm'] - 1); so['cm'] += 1
                    if is_gr6_u: sn['gr6'] = max(0, sn['gr6'] - 1); so['gr6'] += 1
                    sec_map[kn], sec_map[ko] = sn, so
                a.room, a.timeslot = old_r, old_s
            
            if it % 500 == 0:
                _, rh, _, _ = calculate_fitness_full(current_sch, mask=self.constraints_mask)
                current_h = rh
            temp *= self.sa_cooling
        
        # --- FIN ET MISE À JOUR FINALE ---
        res_score, res_h, res_s, _ = calculate_fitness_full(schedule, mask=self.constraints_mask)
        schedule.fitness, schedule.h_violations, schedule.soft_score = res_score, res_h, res_s
        return schedule

    def _apply_hard_move(self, schedule, unlocked, maps, related_sids):
        """
        Mouvement intelligent O(1) (V3) : Cible une séance en conflit de manière ultra-rapide.
        """
        idx = None
        if maps:
            # Correction Unpacking V3
            prof_map, room_map, group_map, sec_map = maps
            
            # On tente de trouver un coupable au hasard (max 20 tentatives pour aller vite)
            for _ in range(20):
                check_idx = random.choice(unlocked)
                a = schedule.assignments[check_idx]
                tid, rid, sid = a.module_part.teacher_id, a.room.id, a.timeslot.id
                sec_id = a.module_part.section_id
                
                in_conflict = False
                if tid and tid != 231 and prof_map.get((tid, sid), 0) > 1: in_conflict = True
                elif room_map.get((rid, sid), 0) > 1: in_conflict = True
                elif any(group_map.get((gid, sid), 0) > 1 for gid in a.module_part.td_group_ids): in_conflict = True
                elif sec_id and (sec_map.get((sec_id, sid), {}).get('any', 0) > 1 or self._get_sec_penalty(sec_id, sid, a.module_part.type == "CM", any("Gr 6" in self.dm.group_map.get(gx, "") for gx in a.module_part.td_group_ids), sec_map, related_sids) > 0):
                    in_conflict = True
                
                if in_conflict:
                    idx = check_idx
                    break
        
        if idx is None:
            idx = random.choice(unlocked)
            
        a = schedule.assignments[idx]
        old_room, old_slot = a.room, a.timeslot
        
        # On lui cherche une place intelligemment (V3 Guided)
        # On essaie de trouver un slot ou prof et groupes sont LIBRES
        if maps:
            tid = a.module_part.teacher_id
            gids = a.module_part.td_group_ids
            sec_id = a.module_part.section_id
            is_cm = (a.module_part.type == "CM")
            is_gr6 = any("Gr 6" in self.dm.group_map.get(gx, "") for gx in gids)
            prof_map, room_map, group_map, sec_map = maps
            
            # --- DYNAMISME V3.11 : 50% Recherche Place Libre / 50% Swap ---
            if random.random() < 0.5:
                # 1. RECHERCHE CLASSIQUE (LASER)
                best_slot, best_room = None, None
                all_slots = list(self.dm.timeslots)
                random.shuffle(all_slots)
                valid_rooms = [r for r in self.dm.rooms if r.capacity >= a.module_part.group_size]
                if a.module_part.required_room_type:
                    valid_rooms = [r for r in valid_rooms if r.type == a.module_part.required_room_type]
                if not valid_rooms: valid_rooms = self.dm.rooms
                
                for ts in all_slots:
                    if tid and tid != 231 and prof_map.get((tid, ts.id), 0) > 0: continue
                    if any(group_map.get((gid, ts.id), 0) > 0 for gid in gids): continue
                    if sec_id:
                        st = sec_map.get((sec_id, ts.id))
                        # Si moi ou une section liée occupe déjà le slot -> Conflit
                        if st and (st['cm'] or st['gr6'] or ((is_cm or is_gr6) and st['any'] > 0)): continue
                        if self._get_sec_penalty(sec_id, ts.id, is_cm, is_gr6, sec_map, related_sids) > 0: continue
                    
                    random.shuffle(valid_rooms)
                    for tr in valid_rooms:
                        if room_map.get((tr.id, ts.id), 0) == 0:
                            best_slot, best_room = ts, tr
                            break
                    if best_slot: break

                if best_slot: a.room, a.timeslot = best_room, best_slot
                else:
                    a.room, a.timeslot = random.choice(valid_rooms), random.choice(self.dm.timeslots)
                
                return idx, old_room, old_slot
            else:
                # 2. SWAP (Échange de places entre deux TD)
                target_idx = random.choice(unlocked)
                target_a = schedule.assignments[target_idx]
                
                # Sauvegarde pour le retour vers le SA (qui ne gère qu'un objet pour l'instant)
                # Hack: On fait le swap et on renvoie l'idx principal. 
                # Note: Le Delta-Scoring sera un peu approximatif sur le swap car il ne verra que l'impact de 'a'
                # Mais c'est une exploration nécessaire.
                a.room, target_a.room = target_a.room, a.room
                a.timeslot, target_a.timeslot = target_a.timeslot, a.timeslot
                
                return idx, old_room, old_slot # SA annulera uniquement 'a' si besoin, c'est suffisant pour le chaos
        else:
            # Sans maps : Aléatoire pur
            a.room = random.choice(self.dm.rooms)
            a.timeslot = random.choice(self.dm.timeslots)
        
        return idx, old_room, old_slot

    def _apply_soft_move(self, schedule, unlocked):
        """
        RECHERCHE LOCALE GUIDÉE (P6 & P10) : Mouvements spécialisés pour le confort.
        Cette méthode n'est appelée qu'en 'Phase Soft'. Elle utilise une intelligence
        métier pour regrouper les cours au lieu de simplement les déplacer au hasard.
        """
        r = random.random()
        changed_indices, old_states = [], []

        # LOGIQUE 1 : STABILISATION DES SALLES (Réduit S6)
        if r < 0.25:
            # On choisit un module au hasard parmi ceux qui peuvent bouger
            mid_options = [a.module_part.module_id for i, a in enumerate(schedule.assignments) if i in unlocked]
            if not mid_options: return self._apply_hard_move(schedule, unlocked)
            mid = random.choice(mid_options)
            
            # On choisit UNE SEULE salle cible pour tout le module
            target_room = random.choice(self.dm.rooms)
            
            # On aligne TOUTES les séances de ce module dans la même salle
            for i in unlocked:
                if schedule.assignments[i].module_part.module_id == mid:
                    changed_indices.append(i)
                    old_states.append((schedule.assignments[i].room, schedule.assignments[i].timeslot))
                    schedule.assignments[i].room = target_room
        
        # LOGIQUE 2 : COMPACTAGE DE LA JOURNÉE PROF (Réduit S3 pour les profs)
        elif r < 0.55:
            idx = random.choice(unlocked)
            a = schedule.assignments[idx]
            prof_id = a.module_part.teacher_id
            
            prof_assigns = [schedule.assignments[i] for i in unlocked 
                            if schedule.assignments[i].module_part.teacher_id == prof_id and i != idx]
            
            if prof_assigns:
                ref_day = random.choice(prof_assigns).timeslot.day
                target_slot = random.choice([s for s in self.dm.timeslots if s.day == ref_day])
                
                changed_indices.append(idx)
                old_states.append((a.room, a.timeslot))
                a.timeslot = target_slot

        # LOGIQUE 3 : COMPACTAGE DE LA JOURNÉE ÉTUDIANT (Réduit S3 - Gaps & S7 - Journée courte)
        elif r < 0.85:
            idx = random.choice(unlocked)
            a = schedule.assignments[idx]
            sec_id = a.module_part.section_id
            
            if sec_id:
                # Chercher un autre cours de la MÊME section
                sec_assigns = [schedule.assignments[i] for i in unlocked 
                               if schedule.assignments[i].module_part.section_id == sec_id and i != idx]
                
                if sec_assigns:
                    # Prendre le jour de cet autre cours et forcer le déplacement vers ce jour-là
                    ref_day = random.choice(sec_assigns).timeslot.day
                    target_slot = random.choice([s for s in self.dm.timeslots if s.day == ref_day])
                    
                    changed_indices.append(idx)
                    old_states.append((a.room, a.timeslot))
                    a.timeslot = target_slot
        
        # LOGIQUE 4 : EXPLORATION RÉSIDUELLE
        else:
            # Si on ne fait pas de mouvement spécialisé, on fait un mouvement classique
            idx, r_old, s_old = self._apply_hard_move(schedule, unlocked)
            changed_indices, old_states = [idx], [(r_old, s_old)]
            
        return changed_indices, old_states

    # ==========================================================================
    # SECTION G : PERSPECTIVES & OPTIMISATIONS (P1 - DELTA SCORING)
    # ==========================================================================

    def _calculate_hard_delta_score(self, assignment, old_room, old_slot, new_room, new_slot, occupancy_maps):
        """
        [PROTOTYPE P1] : Algorithme de calcul incrémental en O(1).
        
        Rationnel : Au lieu de scanner les 245 séances (O(N)), cette méthode regarde
        uniquement l'impact local du déplacement d'un cours.
        
        Fonctionnement :
        1. On soustrait les conflits potentiels générés par l'ancienne position.
        2. On ajoute les nouveaux conflits potentiels générés par la nouvelle position.
        3. Le score total est mis à jour par simple addition (Delta).
        """
        delta = 0
        # Cette logique sera branchée lors de la phase de montée en charge (Large Scale)
        # pour garantir des performances fluides sur des milliers de séances.
        pass
