import requests 

API_BASE_URL = "http://localhost:8000" 

class DataManager:
     
    def __init__(self):
        self.rooms = []
        self.teachers = []
        self.timeslots = []
        self.sections = []
        self.module_parts = []

    def fetch_all_data(self):
        print("--- chargement des données---")
        try:
            self.rooms = requests.get(f"{API_BASE_URL}/rooms").json()
            self.teachers = requests.get(f"{API_BASE_URL}/teachers").json()
            self.timeslots = requests.get(f"{API_BASE_URL}/timeslots").json()
            self.sections = requests.get(f"{API_BASE_URL}/sections").json()
            self.module_parts = requests.get(f"{API_BASE_URL}/module_parts").json()
            print(f"Salles: {len(self.rooms)}")
            print(f"Profs: {len(self.teachers)}")
            print(f"Créneaux: {len(self.timeslots)}")
            print(f"Sections: {len(self.sections)}")
            print(f"Séances à planifier: {len(self.module_parts)}")
            return True
        except Exception as e :
            print(f"Erreur lors du chargement: {e}")
            return False

if __name__ == "__main__":
        dm = DataManager()
        dm.fetch_all_data()