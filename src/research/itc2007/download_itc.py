import os
import requests
import urllib3

# Désactiver les avertissements SSL car le certificat du site ITC est souvent expiré
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Chemin vers le dossier data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data", "itc2007")

# On crée le dossier s'il n'existe pas
os.makedirs(DATA_DIR, exist_ok=True)

file_path = os.path.join(DATA_DIR, "comp01.ctt")
url = "https://raw.githubusercontent.com/Docheinstein/itc2007-cct/master/datasets/comp01.ctt"

print(f"📡 Téléchargement du Dataset Officiel ITC-2007: {url}")

try:
    response = requests.get(url, verify=False, timeout=10)
    if response.status_code == 200:
        with open(file_path, "wb") as f:
            f.write(response.content)
        print(f"✅ SUCCÈS : Le fichier a été sauvegardé dans {file_path}")
    else:
        print(f"❌ ERREUR HTTP {response.status_code} : Fichier non trouvé.")
except Exception as e:
    print(f"❌ ERREUR DE CONNEXION : {e}")
