import json

d=json.load(open('backend/generated_timetable.json'))
res = [x for x in d if x['slot_id']==18]
for r in res:
    if r['teacher_id'] is not None:
        print("CM AT 18:", r)
