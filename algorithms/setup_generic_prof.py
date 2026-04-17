import requests

API_URL = "http://localhost:8000/teachers"
teachers = requests.get(API_URL).json()

prof_generic = next((t for t in teachers if t['name'] == "PROF"), None)

if not prof_generic:
    print("Création du prof générique PROF...")
    resp = requests.post(API_URL, json={
        "name": "PROF",
        "email": "prof@fstg-marrakech.ac.ma",
        "availabilities": {"unavailable_slots": []}
    })
    print(f"Créé avec succès : {resp.json()}")
else:
    print(f"Le prof générique PROF existe déjà avec l'ID : {prof_generic['id']}")
