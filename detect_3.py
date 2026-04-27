import json
d=json.load(open('backend/generated_timetable.json'))
a=[x for x in d if x['id']==1266]
print(json.dumps(a, indent=2))
