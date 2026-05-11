import requests

API_URL = "http://192.168.56.1:8000"

def find_by_name():
    try:
        resp = requests.get(f"{API_URL}/assignments")
        teachers_resp = requests.get(f"{API_URL}/teachers")
        modules_resp = requests.get(f"{API_URL}/modules")
        parts_resp = requests.get(f"{API_URL}/module-parts")
        
        if resp.status_code == 200:
            assignments = resp.json()
            teachers = {t['id']: t['name'] for t in teachers_resp.json()}
            modules = {m['id']: m['name'] for m in modules_resp.json()}
            # module_parts -> module_id
            parts = {p['id']: p['module_id'] for p in parts_resp.json()}
            
            print("--- Recherche du cours de Developpment Personnel ---")
            found = []
            for a in assignments:
                mid = parts.get(a['module_part_id'])
                mname = modules.get(mid, "Inconnu")
                tname = teachers.get(a['teacher_id'], "Inconnu")
                
                if "Personnel" in mname and "KOURAD" in tname.upper():
                    # check section if possible
                    found.append(a)
                    print(f"ID: {a['id']} | Module: {mname} | Prof: {tname} | SectionID: {a.get('section_id')}")
            
            if not found:
                print("Aucun cours correspondant trouve dans la base active.")
        else:
            print(f"Erreur API: {resp.status_code}")
    except Exception as e:
        print(f"Erreur: {e}")

if __name__ == "__main__":
    find_by_name()
