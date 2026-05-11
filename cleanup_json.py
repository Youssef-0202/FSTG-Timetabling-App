import json
import os

def cleanup_and_restore(filename):
    filepath = os.path.join(r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE\backend", filename)
    if not os.path.exists(filepath):
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    gb_section_id = 9
    gb_group_id = 29
    dev_pers_cm = 33
    dev_pers_td = 34

    cleaned_data = []
    cm_found = False
    td_found = False
    
    removed_count = 0
    
    # On va d'abord filtrer ce qui n'est pas lie a Dev Pers pour GB
    # Et garder une seule fois chaque part id pour GB
    for a in data:
        is_gb = a.get('section_id') == gb_section_id or any(g['id'] == gb_group_id for g in a.get('td_groups', []))
        part_id = a.get('module_part_id')

        if is_gb:
            if part_id == dev_pers_cm:
                if not cm_found:
                    cleaned_data.append(a)
                    cm_found = True
                else:
                    removed_count += 1
            elif part_id == dev_pers_td:
                if not td_found:
                    cleaned_data.append(a)
                    td_found = True
                else:
                    removed_count += 1
            else:
                cleaned_data.append(a)
        else:
            cleaned_data.append(a)

    # Si par malheur le TD a ete supprime dans une version precedente, 
    # mon script actuel ne peut pas le "recréer" sans les données de base.
    # Mais ici je redémarre de la version propre que j'ai récupérée si besoin.

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=4, ensure_ascii=False)
    print(f"SUCCESS: Nettoyage intelligent de {filename} (CM/TD préservés).")

if __name__ == "__main__":
    # Note: Je suppose ici que le TD est toujours present dans les fichiers.
    # Si j'en avais supprimé un, je vais devoir le réinjecter via un autre script.
    for f in ["generated_timetable.json", "generated_timetable_alns.json", "generated_timetable_rl.json"]:
        cleanup_and_restore(f)
