import requests
import json

mps = requests.get('http://192.168.56.1:8000/module-parts').json()
circuits_mps = [mp for mp in mps if mp['module_id'] == 12]
with open('circuits_mps.json', 'w') as f:
    json.dump(circuits_mps, f, indent=2)
