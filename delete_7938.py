import requests
import sys

API_URL = "http://192.168.56.1:8000"

def delete_assignment(aid):
    print(f"--- Tentative de suppression de l'ID {aid} via API ---")
    try:
        resp = requests.delete(f"{API_URL}/assignments/{aid}")
        if resp.status_code == 204:
            print(f"SUCCESS: L'assignation {aid} a été supprimée de la base de données.")
        elif resp.status_code == 404:
            print(f"INFO: L'assignation {aid} n'a pas été trouvée (déjà supprimée ?).")
        else:
            print(f"ERROR API: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"ERROR CONNEXION: Impossible de joindre le backend sur {API_URL}. {e}")

if __name__ == "__main__":
    delete_assignment(8389)
