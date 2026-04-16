import requests 
from models import Room, Teacher, Timeslot, Section, ModulePart

API_BASE_URL = "http://localhost:8000" 

class DataManager:
     
    def __init__(self):
        self.rooms = []
        self.teachers = []
        self.timeslots = []
        self.sections = []
        self.module_parts = []

    def fetch_all_data(self):
        print("--- Chargement des données  ---")
        try:
            # 1. Rooms
            r_data = requests.get(f"{API_BASE_URL}/rooms").json()
            if isinstance(r_data, list):
                self.rooms = [Room(id=r['id'], name=r['name'], capacity=r.get('capacity', 0), type=r.get('type', 'TD')) for r in r_data]
            
            # 1. Teachers
            resp_t = requests.get(f"{API_BASE_URL}/teachers")
            for t in resp_t.json():
                # Extraire les indisponibilités depuis le JSONB
                avail = t.get("availabilities") or {}
                un_slots = avail.get("unavailable_slots", [])
                self.teachers.append(Teacher(
                    t['id'], 
                    t['name'], 
                    t['email'], 
                    unavailable_slots=un_slots
                ))

            # 3. Timeslots
            ts_data = requests.get(f"{API_BASE_URL}/timeslots").json()
            if isinstance(ts_data, list):
                self.timeslots = [Timeslot(id=s['id'], day=s['day'], start_time=s['start_time'], end_time=s['end_time']) for s in ts_data]

            # 4. Sections
            sec_data = requests.get(f"{API_BASE_URL}/sections").json()
            section_caps = {}  # Pour calculer les contraintes de la capacité de  salles 
            if isinstance(sec_data, list):
                def get_cap(s):
                    return s.get('total_capacity')  or 0
                section_caps = {s['id']: get_cap(s) for s in sec_data}

            # 5. TD Groups (needed for group-to-section mapping)
            tdg_data = requests.get(f"{API_BASE_URL}/td-groups").json()
            group_to_section = {}
            if isinstance(tdg_data, list):
                group_to_section = {g['id']: g['section_id'] for g in tdg_data}
            self.group_to_section = group_to_section 

            # 6. Module Parts
            mp_data = requests.get(f"{API_BASE_URL}/module-parts").json()
            mp_lookup = {} # un dictionnaire d'indexation (lookup table) pour que l'accès aux données des modules se fasse en temps constant O(1)
            if isinstance(mp_data, list):
                for p in mp_data:
                    # On enregistre : p['id'] -> l'objet complet p
                    mp_lookup[p['id']] = p

            # 7. Assignments
            a_data = requests.get(f"{API_BASE_URL}/assignments").json()
            if isinstance(a_data, list):
                self.module_parts = []
                for a in a_data:
                    mp_id = a.get('module_part_id')
                    mp_info = mp_lookup.get(mp_id, {})
                    m_type = mp_info.get('type', 'TD').upper()
                    
                    # Logic for Teacher identification
                    t_id = a['teacher_id'] if m_type == "CM" else None
                    
                    # Determine real size for capacity constraint
                    sid = a.get('section_id')
                    
                    # Target real groups for TD conflict logic
                    td_group_ids = [g['id'] for g in a.get('td_groups', [])]
                    
                    # If it's a TD and has no section_id but has groups, find parent section
                    if m_type != "CM" and not sid and td_group_ids:
                        sid = group_to_section.get(td_group_ids[0])
                    
                    real_size = 30 # Default
                    
                    if m_type == "CM":
                        real_size = section_caps.get(sid, 90)
                        if real_size == 0: real_size = 90
                    elif a.get('td_groups'):
                        real_size = sum(g.get('size', 0) for g in a['td_groups'])
                        if real_size == 0: real_size = 30
                    
                    mp = ModulePart(
                        id=a['id'],
                        module_id=mp_id,
                        teacher_id=t_id,
                        section_id=sid,
                        type=m_type,
                        group_size=real_size,
                        td_group_ids=td_group_ids,
                        is_locked=a.get('is_locked', False),
                        fixed_room_id=a.get('room_id'),
                        fixed_slot_id=a.get('slot_id')
                    )
                    self.module_parts.append(mp)

            print("-" * 50)
            print("STATISTIQUES DU CHARGEMENT DES DONNÉES")
            print("-" * 50)
            print(f"Salles répertoriées      : {len(self.rooms)}")
            print(f"Sections identifiées     : {len(section_caps)}")
            print(f"Séances à planifier      : {len(self.module_parts)}")
            print("-" * 50)            
            return True
        except Exception as e:
            print(f"Erreur fatale: {e}")
            return False

if __name__ == "__main__":
        dm = DataManager()
        dm.fetch_all_data()