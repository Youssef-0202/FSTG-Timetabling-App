import os
import json

def search_in_json():
    target_id = 7938
    root_dir = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE"
    found_files = []

    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".json"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if str(target_id) in content:
                            found_files.append(path)
                except:
                    pass

    if found_files:
        print("Fichiers contenant l'ID 7938:")
        for f in found_files:
            print(f"- {f}")
    else:
        print("Aucun fichier JSON ne contient l'ID 7938.")

if __name__ == "__main__":
    search_in_json()
