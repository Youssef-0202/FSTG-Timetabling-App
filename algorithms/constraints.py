def calculate_f1_viability(schedule):
        """Calcule f1 : Somme des violations des contraintes strictes (H1-H14)."""
        violations = 0
        assignments = schedule.assignments

        for i in range(len(assignments)):
            a1 = assignments[i]
        
            # --- H4 : Capacité de la salle ---
            # On récupère l'effectif du groupe
            group_size = a1.module_part.get('group_size', 30) 
            if group_size > a1.room['capacity']:
                violations += 1

            # --- H11 : Spécificité Pédagogique (CM/TD/TP) ---
            room_type = a1.room['type'].upper()
            req_type = a1.module_part['type'].upper()
        
            if req_type == "CM" and "AMPHI" not in room_type:
                violations += 1
            elif req_type == "TP" and "TP" not in room_type:
                violations += 1
            
            # Comparaison avec les autres séances pour les conflits de ressources
            for j in range(i + 1, len(assignments)):
                a2 = assignments[j]

                if a1.timeslot['id'] == a2.timeslot['id']:
                    # --- H1 : Conflit Enseignant ---
                    if a1.module_part['teacher_id'] == a2.module_part['teacher_id']:
                        violations += 1
                
                    # --- H2 : Conflit de Salle ---
                    if a1.room['id'] == a2.room['id']:
                        violations += 1
                
                    # --- H3 : Conflit de Structure (Section vs Groupe TD) ---
                    # Si c'est la même section OU si l'un est le parent de l'autre
                        s1 = a1.module_part.get('section_id')
                        s2 = a2.module_part.get('section_id')
                        if s1 == s2:
                             violations += 1
        
        schedule.fitness = 1 / (1 + violations)
        return violations

if __name__ == "__main__":
    from models import Schedule
    from data_manager import DataManager
    
    dm = DataManager()
    if dm.fetch_all_data():
        sch = Schedule(dm)
        sch.initialize_random()
        v = calculate_f1_viability(sch)
        print(f"--- Test Viabilité ---")
        print(f"Nombre de violations (f1): {v}")
        print(f"Score Fitness: {sch.fitness}")