import json

d=json.load(open('backend/generated_timetable.json'))
res = [x for x in d if x['slot_id']==18]
with open('cm_at_18.json', 'w') as f:
    json.dump([r for r in res if r['teacher_id'] is not None], f, indent=2)
