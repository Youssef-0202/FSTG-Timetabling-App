import json
import requests

def run():
    mps = requests.get('http://192.168.56.1:8000/module-parts').json()
    circuits_mps = [mp for mp in mps if mp['module_id'] == 12]
    print("Module Parts for Circuits électriques:")
    for mp in circuits_mps:
        print(mp)
        
    print("\nAssignments in JSON for this module:")
    d = json.load(open('backend/generated_timetable.json'))
    cm_ids = [mp['id'] for mp in circuits_mps if mp['type'] == 'CM']
    td_ids = [mp['id'] for mp in circuits_mps if mp['type'] != 'CM']
    
    print("\nCM Assignments in JSON:")
    for a in d:
        if a['module_part_id'] in cm_ids:
            print(a)
            
    print("\nSome TD Assignments in JSON:")
    idx = 0
    for a in d:
        if a['module_part_id'] in td_ids:
            print(a)
            idx += 1
            if idx > 3:
                break

run()
