import json
import requests

d = json.load(open('backend/generated_timetable.json'))
mps = requests.get('http://192.168.56.1:8000/module-parts').json()
struc_mps = [mp for mp in mps if mp['module_id'] == 11 and mp['type'] == 'CM']

for mp in struc_mps:
    for a in d:
        if a['module_part_id'] == mp['id']:
            print("Structure de la matiere CM:", json.dumps(a, indent=2))
