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
                self.sections = [Section(id=s['id'], name=s['name'], student_count=s.get('student_count', 0), parent_id=s.get('parent_id')) for s in sec_data]

            # 5. Assignments (Les 245 "Affectations" de votre écran)
            a_data = requests.get(f"{API_BASE_URL}/assignments").json()
            if isinstance(a_data, list):
                self.module_parts = []
                for a in a_data:
                    m_type = a.get('module_part', {}).get('type', 'TD').upper()
                    
                    # ASTUCE POUR LA RÉUNION : On ne garde le prof que si c'est un CM
                    # Les TD/TP auront un prof "vide" (None) pour ne plus surcharger H1 artificiellement.
                    t_id = a['teacher_id'] if m_type == "CM" else None
                    
                    # On crée l'objet que l'algorithme va manipuler
                    mp = ModulePart(
                        id=a['id'],
                        module_id=a['module_part_id'],
                        teacher_id=t_id,
                        section_id=a.get('section_id'),
                        type=m_type,
                        group_size=30 # Valeur par défaut
                    )
                    self.module_parts.append(mp)

            print(f"Salles: {len(self.rooms)} | Profs: {len(self.teachers)} | Créneaux: {len(self.timeslots)} | Affectations à placer: {len(self.module_parts)}")
            return True
        except Exception as e:
            print(f"Erreur fatale: {e}")
            return False

if __name__ == "__main__":
        dm = DataManager()
        dm.fetch_all_data()