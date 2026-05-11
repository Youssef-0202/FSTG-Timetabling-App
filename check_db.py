import requests

API_URL = "http://192.168.56.1:8000"

def list_and_check():
    try:
        resp = requests.get(f"{API_URL}/assignments")
        if resp.status_code == 200:
            assignments = resp.json()
            ids = sorted([a['id'] for a in assignments])
            print(f"Total assignments: {len(ids)}")
            print(f"Min ID: {min(ids) if ids else 'None'}, Max ID: {max(ids) if ids else 'None'}")
            print(f"First 50 IDs: {ids[:50]}")
            
            if 7938 in ids:
                print("FOUND: ID 7938 exists in DB.")
            else:
                print("NOT FOUND: ID 7938 does NOT exist in DB.")
        else:
            print(f"API Error: {resp.status_code}")
    except Exception as e:
        print(f"Connexion Error: {e}")

if __name__ == "__main__":
    list_and_check()
