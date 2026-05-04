import json
import os
import pandas as pd
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

BASE_DIR = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE"
CACHE_PATH = os.path.join(BASE_DIR, "data_cache.json")
TIMETABLE_PATH = os.path.join(BASE_DIR, "backend", "generated_timetable.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "algorithms", "ga_sa_hybrid", "v2", "logs", "Emploi_Du_Temps_Master.xlsx")

print("--- Génération de l'Excel PFE ---")

# Chargement du dictionnaire des données (Noms réels)
with open(CACHE_PATH, "r", encoding="utf-8") as f:
    cache = json.load(f)

# Chargement des résultats de l'algorithme
with open(TIMETABLE_PATH, "r", encoding="utf-8") as f:
    timetable = json.load(f)

rooms = {r['id']: r['name'] for r in cache.get('rooms', [])}
teachers = {t['id']: t['name'] for t in cache.get('teachers', [])}
slots = {s['id']: s for s in cache.get('timeslots', [])}
sections = {s['id']: s['name'] for s in cache.get('sections', [])}
# Fetch module parts to get name or module_id
module_parts = {m['id']: m for m in cache.get('module-parts', [])}
modules = {m['id']: m for m in cache.get('modules', [])} if 'modules' in cache else {}

global_data = []
section_data = {s_id: [] for s_id in sections.keys()}

for entry in timetable:
    mp_id = entry.get('module_part_id')
    mp = module_parts.get(mp_id, {})
    
    # Resolution du nom du module
    module_name = mp.get('name')
    if not module_name and 'module_id' in mp and modules:
        parent_mod = modules.get(mp['module_id'], {})
        module_name = parent_mod.get('name', f"Module {mp_id}")
    elif not module_name:
        module_name = f"Module_Part_{mp_id}"
        
    m_type = mp.get('type', 'TD') 
    if not isinstance(m_type, str): m_type = "TD"
    
    t_id = entry.get('teacher_id')
    teacher_name = teachers.get(t_id, f"Prof {t_id}")
    
    r_id = entry.get('room_id')
    room_name = rooms.get(r_id, "SANS SALLE")
    
    s_id = entry.get('slot_id')
    slot = slots.get(s_id, {})
    day = slot.get('day', '-') if slot else '-'
    start_time = slot.get('start_time', '') if slot else ''
    
    sec_id = entry.get('section_id')
    section_name = sections.get(sec_id, f"Section {sec_id}")
    
    groups = [str(g.get('id', '')) for g in entry.get('td_groups', [])]
    groups_str = ",".join(groups) if groups else "Tous"
    
    # Texte de la case dans la grille
    cell_text = f"[{m_type.upper()}] {module_name}\n👤 {teacher_name}\n📍 {room_name}"
    
    row = {
        "Section": section_name,
        "Module": module_name,
        "Type": m_type.upper(),
        "Groupes": groups_str,
        "Enseignant": teacher_name,
        "Jour": day,
        "Horaire": start_time,
        "Salle": room_name
    }
    global_data.append(row)
    
    if sec_id in section_data:
        section_data[sec_id].append({
            "day": day,
            "start_time": start_time,
            "text": cell_text,
            "type": m_type.upper()
        })

print(f"Total des cours mappés: {len(global_data)}")

# --- Export Excel ---
with pd.ExcelWriter(OUTPUT_PATH, engine='openpyxl') as writer:
    # 1. Onglet Global (Liste administrative)
    df_global = pd.DataFrame(global_data)
    if not df_global.empty:
        df_global.sort_values(by=["Section", "Jour", "Horaire"], inplace=True)
    df_global.to_excel(writer, sheet_name="Vue_Globale", index=False)
    
    # Definitions de la grille (6 Jours, Créneaux uniques)
    all_days = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]
    start_times = sorted(list(set(s.get('start_time') for s in cache.get('timeslots', []) if s.get('start_time'))))
    
    for sec_id, name in sections.items():
        if not section_data[sec_id]: continue # Skip empty sections
        
        # Initialisation de la Grille (DataFrame vide)
        grid = pd.DataFrame(index=start_times, columns=all_days)
        grid = grid.fillna("")
        
        # Remplissage
        for assignment in section_data[sec_id]:
            d = assignment['day']
            t = assignment['start_time']
            if d in grid.columns and t in grid.index:
                old_val = grid.at[t, d]
                new_val = assignment['text']
                # Gérer les collisions (ex: 2 TD en même temps dans 2 salles)
                if old_val:
                    grid.at[t, d] = str(old_val) + "\n---\n" + new_val
                else:
                    grid.at[t, d] = new_val
                    
        # Ecriture dans un onglet (Max 31 caracteres)
        safe_sheet_name = f"{name}"[:31].replace(":", "_").replace("/", "_")
        grid.to_excel(writer, sheet_name=safe_sheet_name)
        
        # 🖌️ Stylisation de l'onglet
        worksheet = writer.sheets[safe_sheet_name]
        thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        
        # Palette de couleurs professionnelles FSTG
        fill_cm = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid") # Jaune pastel (CM)
        fill_td = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid") # Vert pastel (TD)
        fill_tp = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid") # Bleu pastel (TP)
        fill_header = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid") # Bleu foncé entête
        
        for row in worksheet.iter_rows():
            for cell in row:
                cell.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
                cell.border = thin_border
                
                # Style Entêtes
                if cell.row == 1 or cell.column == 1:
                    cell.font = Font(bold=True, color="FFFFFF" if cell.row == 1 else "000000")
                    if cell.row == 1:
                        cell.fill = fill_header
                # Style Cellules de cours
                else:
                    if cell.value:
                        val_str = str(cell.value)
                        if "[CM]" in val_str: cell.fill = fill_cm
                        elif "[TD]" in val_str: cell.fill = fill_td
                        elif "[TP]" in val_str: cell.fill = fill_tp
        
        # Ajustement de la taille
        worksheet.column_dimensions['A'].width = 15 # Colonne horaires
        for col in range(2, len(all_days) + 2):
            worksheet.column_dimensions[get_column_letter(col)].width = 25 # Colonnes jours
            
        for row in range(2, len(start_times) + 2):
            worksheet.row_dimensions[row].height = 70 # Hauteur des cases pour bien voir

print(f"✅ Fichier Excel Master généré avec succès dans : {OUTPUT_PATH}")
