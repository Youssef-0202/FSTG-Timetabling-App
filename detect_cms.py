import requests
import json

a = requests.get('http://192.168.56.1:8000/assignments').json()
mps = requests.get('http://192.168.56.1:8000/module-parts').json()
cm_mps = {mp['id']:mp for mp in mps if mp['type']=='CM'}
cms = [x for x in a if x['module_part_id'] in cm_mps]
empty_cms = [x for x in cms if not x.get('td_groups')]

with open("empty_cms.json", "w", encoding="utf-8") as f:
    json.dump(empty_cms, f, indent=2)
