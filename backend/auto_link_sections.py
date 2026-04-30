import requests

BASE_URL = "http://localhost:8000"

def fix_sections():
    print("Récupération des données depuis l'API...")
    try:
        sections = requests.get(f"{BASE_URL}/sections").json()
        groupes = requests.get(f"{BASE_URL}/groupe-filieres").json()
        filieres = requests.get(f"{BASE_URL}/filieres").json()
    except Exception as e:
        print("Erreur de connexion à l'API:", e)
        return

    # Création du dictionnaire filiere_id -> filiere_name
    filiere_map = {f['id']: f['name'] for f in filieres}
    
    print("-" * 60)
    print("ANALYSE ET MISE À JOUR DES SECTIONS")
    print("-" * 60)
    
    for s in sections:
        name = s['name']  # ex: "GP-GI S2"
        s_id = s['id']
        current_gids = [g['id'] for g in s.get('groupes', [])]
        
        # On va parser le nom de manière intelligente !
        parts = name.split(" ")
        if len(parts) >= 2:
            f_part = parts[0]    # ex: "GP-GI"
            sem_part = parts[1]  # ex: "S2"
            
            f_names = f_part.split("-") # ["GP", "GI"]
            
            # On cherche les objets 'GroupeFiliere' correspondants
            matching_gids = []
            for g in groupes:
                gid = g['id']
                sem = g['semestre']
                f_id = g['filiere_id']
                g_f_name = filiere_map.get(f_id, "")
                
                # Si le semestre correspond ET que la filière fait partie du nom de la section (ex: GP ou GI correspond au semestre S2)
                if sem == sem_part and g_f_name in f_names:
                    matching_gids.append(gid)
            
            # Si on a trouvé des groupes et qu'ils sont différents de ce qui est déjà en base
            if matching_gids:
                if sorted(matching_gids) == sorted(current_gids):
                    print(f"Section {s_id:2} ({name:15}) -> Déjà à jour : Groupes {matching_gids}")
                else:
                    print(f"Section {s_id:2} ({name:15}) -> Nouveaux groupes à lier : {matching_gids}")
                    payload = {
                        "name": name,
                        "semestre": s['semestre'],
                        "total_capacity": s['total_capacity'] or 0,
                        "groupe_ids": matching_gids
                    }
                    res = requests.put(f"{BASE_URL}/sections/{s_id}", json=payload)
                    if res.status_code == 200:
                        print("  [SUCCESS] Base de données mise à jour.")
                    else:
                        print(f"  [ERREUR] {res.text}")
            else:
                print(f"Section {s_id:2} ({name:15}) -> ERREUR: Impossible de déduire les groupes :(")

if __name__ == '__main__':
    fix_sections()
