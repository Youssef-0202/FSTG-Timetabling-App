import requests
import json

a = requests.get('http://192.168.56.1:8000/assignments').json()
el_cms = [x for x in a if x['teacher_id']==187]
print(json.dumps(el_cms, indent=2))
