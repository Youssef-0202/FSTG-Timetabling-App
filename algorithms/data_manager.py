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
            
            # 2. Teachers
            t_data = requests.get(f"{API_BASE_URL}/teachers").json()
            if isinstance(t_data, list):
                self.teachers = [Teacher(id=t['id'], name=t['name']) for t in t_data]

            # 3. Timeslots
            ts_data = requests.get(f"{API_BASE_URL}/timeslots").json()
            if isinstance(ts_data, list):
                self.timeslots = [Timeslot(id=s['id'], day=s['day'], start_time=s['start_time'], end_time=s['end_time']) for s in ts_data]

            # 4. Sections
            sec_data = requests.get(f"{API_BASE_URL}/sections").json()
            if isinstance(sec_data, list):
                self.sections = [Section(id=s['id'], name=s['name'], student_count=s.get('total_capacity', 0), parent_id=s.get('parent_id')) for s in sec_data]
            
            # Create a lookup map for section capacities
            section_caps = {s.id: s.student_count for s in self.sections}

            # 5. Assignments
            a_data = requests.get(f"{API_BASE_URL}/assignments").json()
            if isinstance(a_data, list):
                self.module_parts = []
                for a in a_data:
                    m_type = a.get('module_part', {}).get('type', 'TD').upper()
                    
                    # Logic for Teacher identification
                    t_id = a['teacher_id'] if m_type == "CM" else None
                    
                    # Determine real size for capacity constraint
                    # If it's a CM, use section capacity. If TD/TP, use group size.
                    sid = a.get('section_id')
                    real_size = 30 # Default
                    if m_type == "CM" and sid in section_caps:
                        real_size = section_caps[sid]
                    elif a.get('td_groups'):
                        # Summer of group sizes for TD
                        real_size = sum(g.get('size', 0) for g in a['td_groups'])
                    
                    mp = ModulePart(
                        id=a['id'],
                        module_id=a['module_part_id'],
                        teacher_id=t_id,
                        section_id=sid,
                        type=m_type,
                        group_size=real_size
                    )
                    self.module_parts.append(mp)

            print(f"Salles: {len(self.rooms)} | Profs: {len(self.teachers)} | Créneaux: {len(self.timeslots)} | Affectations: {len(self.module_parts)}")
            return True
        except Exception as e:
            print(f"Erreur fatale: {e}")
            return False

if __name__ == "__main__":
        dm = DataManager()
        dm.fetch_all_data()