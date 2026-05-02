import requests
try:
    rooms = requests.get("http://localhost:8000/rooms").json()
    for r in rooms:
        if r.get('type') == 'AMPHI':
            print(f"{r['name']}: capacity {r['capacity']}")
except Exception as e:
    print(f"Error: {e}")
