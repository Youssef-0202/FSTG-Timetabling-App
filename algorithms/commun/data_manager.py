import requests 
import json
import os
from .models import Room, Teacher, Timeslot, Section, ModulePart

API_BASE_URL = "http://localhost:8000" 

class DataManager:
     
    def __init__(self):
        self.rooms = []
        self.teachers = []
        self.teacher_map = {} # Direct access for performance
        self.timeslots = []
        self.slot_map = {}    # Required for time-based constraints
        self.sections = []
        self.sec_id_to_name = {} # Map ID -> Nom de section
        self.module_parts = []
        self.group_to_section = {}
        self.group_map = {}      # Map ID -> Nom de groupe (ex: GP-GI S2 Gr 6)

    def fetch_all_data(self):
        print("--- Chargement des données ---")
        CACHE_FILE = os.path.join(os.path.dirname(__file__), "data_cache.json")
        
        try:
            if os.path.exists(CACHE_FILE):
                print(" [CACHE] Chargement depuis data_cache.json...")
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                r_data = cache_data.get("rooms", [])
                t_data = cache_data.get("teachers", [])
                ts_data = cache_data.get("timeslots", [])
                sec_data = cache_data.get("sections", [])
                tdg_data = cache_data.get("td-groups", [])
                mp_lookup = {p['id']: p for p in cache_data.get("module-parts", [])}
                a_data = cache_data.get("assignments", [])
            else:
                print(" [API] Récupération en direct sur " + API_BASE_URL + "...")
                r_data = requests.get(f"{API_BASE_URL}/rooms").json()
                t_data = requests.get(f"{API_BASE_URL}/teachers").json()
                ts_data = requests.get(f"{API_BASE_URL}/timeslots").json()
                sec_data = requests.get(f"{API_BASE_URL}/sections").json()
                tdg_data = requests.get(f"{API_BASE_URL}/td-groups").json()
                mp_data = requests.get(f"{API_BASE_URL}/module-parts").json()
                mp_lookup = {p['id']: p for p in mp_data}
                a_data = requests.get(f"{API_BASE_URL}/assignments").json()

            # 1. Rooms
            self.rooms = [Room(id=r['id'], name=r['name'], capacity=r.get('capacity', 0), type=r.get('type', 'TD')) for r in r_data]
            
            # 2. Teachers
            for t in t_data:
                # Extraire les indisponibilités depuis le JSONB
                avail = t.get("availabilities") or {}
                un_slots = avail.get("unavailable_slots", [])
                prof = Teacher(
                    t['id'], 
                    t['name'], 
                    t['email'], 
                    unavailable_slots=un_slots
                )
                self.teachers.append(prof)
                self.teacher_map[t['id']] = prof

            # 3. Timeslots
            ts_data = requests.get(f"{API_BASE_URL}/timeslots").json()
            if isinstance(ts_data, list):
                for s in ts_data:
                    ts = Timeslot(id=s['id'], day=s['day'], start_time=s['start_time'], end_time=s['end_time'])
                    self.timeslots.append(ts)
                    self.slot_map[s['id']] = ts

            # 4. Sections
            sec_data = requests.get(f"{API_BASE_URL}/sections").json()
            section_caps = {}  # Pour calculer les contraintes de la capacité de  salles 
            if isinstance(sec_data, list):
                self.sections = sec_data
                self.sec_id_to_name = {s['id']: s['name'] for s in sec_data}
                def get_cap(s):
                    return s.get('total_capacity')  or 0
                section_caps = {s['id']: get_cap(s) for s in sec_data}

            # 5. TD Groups (needed for group-to-section mapping)
            tdg_data = requests.get(f"{API_BASE_URL}/td-groups").json()
            group_to_section = {}
            section_to_groups = {} # Pour bloquer tous les groupes d'une section lors d'un CM
            if isinstance(tdg_data, list):
                for g in tdg_data:
                    group_to_section[g['id']] = g['section_id']
                    self.group_map[g['id']] = g.get('name', '')
                    if g['section_id'] not in section_to_groups:
                        section_to_groups[g['section_id']] = []
                        
                    section_to_groups[g['section_id']].append(g['id'])
            self.group_to_section = group_to_section 

            # 6. Module Parts
            mp_data = requests.get(f"{API_BASE_URL}/module-parts").json()
            mp_lookup = {}
            if isinstance(mp_data, list):
                for p in mp_data:
                    mp_lookup[p['id']] = p

            # 7. Assignments
            a_data = requests.get(f"{API_BASE_URL}/assignments").json()
            if isinstance(a_data, list):
                self.module_parts = []
                for a in a_data:
                    mp_id = a.get('module_part_id')
                    mp_info = mp_lookup.get(mp_id, {})
                    m_type = mp_info.get('type', 'TD').upper()
                    t_id = a.get('teacher_id') # Prise en compte du prof pour TOUS les types (CM/TD/TP)
                    req_room_type = mp_info.get('required_room_type', 'SALLE_TD').upper()
                    sid = a.get('section_id')
                    
                    # Target real groups for TD conflict logic
                    td_group_ids = [g['id'] for g in a.get('td_groups', [])]
                    
                    # If it's a TD and has no section_id but has groups, find parent section
                    if m_type != "CM" and not sid and td_group_ids:
                        sid = group_to_section.get(td_group_ids[0])
                    
                    # FIX: Un CM bloque toute la section (tous ses groupes)
                    if m_type == "CM" and sid and not td_group_ids:
                        td_group_ids = section_to_groups.get(sid, [])
                    
                    # Pour toutes les séances (CM fusionnés ou TD regroupés), 
                    # l'effectif réel est la somme des tailles des groupes rattachés.
                    real_size = sum(g.get('size', 0) for g in a.get('td_groups', []))
                    
                    if real_size == 0:
                        if m_type == "CM":
                            real_size = section_caps.get(sid, 200)
                            if real_size == 0: real_size = 200
                        else:
                            real_size = 40 # Fallback TD
                    
                    mp = ModulePart(
                        id=a['id'],
                        module_id=mp_id,
                        teacher_id=t_id,
                        section_id=sid,
                        type=m_type,
                        required_room_type=req_room_type,
                        group_size=real_size,
                        td_group_ids=td_group_ids,
                        is_locked=a.get('is_locked', False),
                        fixed_room_id=a.get('room_id'),
                        fixed_slot_id=a.get('slot_id')
                    )
                    self.module_parts.append(mp)

            # --- INDEX DE RECHERCHE RAPIDE (V3.5) ---
            self.room_id_to_idx = {r.id: i for i, r in enumerate(self.rooms)}
            self.slot_id_to_idx = {s.id: i for i, s in enumerate(self.timeslots)}
            
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