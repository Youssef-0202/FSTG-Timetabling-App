import json
import os
import requests
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

API = "http://localhost:8000"
BASE_DIR = r"c:\Users\HP\OneDrive\Bureau\pfe\_Project_PFE"
CACHE_PATH = os.path.join(BASE_DIR, "data_cache.json")
TIMETABLE_PATH = os.path.join(BASE_DIR, "backend", "generated_timetable.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "algorithms", "ga_sa_hybrid", "v2", "logs", "FSTG_PRO_FINAL.xlsx")

print("--- Final Formatting Pass (Premium Style - Bug Fixed) ---")

with open(CACHE_PATH, "r", encoding="utf-8") as f:
    cache = json.load(f)
with open(TIMETABLE_PATH, "r", encoding="utf-8") as f:
    timetable = json.load(f)

rooms_list = sorted(cache.get('rooms', []), key=lambda x: (0 if x['type']=='AMPHI' else 1, x['name']))
rooms_dict = {r['id']: r for r in rooms_list}
slots_dict = {s['id']: s for s in cache.get('timeslots', [])}
sections_dict = {s['id']: s['name'] for s in cache.get('sections', [])}
module_parts = {m['id']: m for m in cache.get('module-parts', [])}
try:
    _m = requests.get(f"{API}/modules", timeout=3).json()
    modules = {m['id']: m['name'] for m in _m}
except: modules = {}

FSTG_SLOTS  = ["08:30:00", "10:35:00", "12:30:00", "14:30:00", "16:35:00"]
FSTG_LABELS = ["08h30 - 10h25", "10h35 - 12h30", "12h30 - 14h25", "14h30 - 16h25", "16h35 - 18h30"]
ALL_DAYS    = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]

FILL_DAY = PatternFill("solid", start_color="2E4057", end_color="2E4057")
FILL_SEP = PatternFill("solid", start_color="E0E0E0", end_color="E0E0E0")
SALMON   = "F4B8A0"
WHITE    = "FFFFFF"

def fill(hex): return PatternFill("solid", start_color=hex, end_color=hex)
def make_border(style='thin', color='000000'):
    s = Side(style=style, color=color)
    return Border(left=s, right=s, top=s, bottom=s)
THIN_BORDER = make_border('thin', 'AAAAAA')

PASTELS = ["FFD6A5","CAFFBF","9BF6FF","BDB2FF","FFC6FF","FDFFB6","A8DADC","F4A261","E9C46A","ADE8F4"]
_mod_colors = {}
def get_color(name):
    nm = name or "Default"
    if nm not in _mod_colors: _mod_colors[nm] = PASTELS[len(_mod_colors)%len(PASTELS)]
    return _mod_colors[nm]

def get_slot_col(idx):
    if idx < 2: return idx + 2
    if idx == 2: return 5
    return idx + 4
SEP1_COL, SEP2_COL, LAST_COL = 4, 6, 8

wb = Workbook()
wb.remove(wb.active)

# 1. --- VUE GLOBALE SALLES ---
ws_g = wb.create_sheet("Vue_Globale_Salles")
ws_g.sheet_view.showGridLines = False
for i, r in enumerate(rooms_list, 2):
    ws_g.cell(1, i, value=r['name']).font = Font(bold=True, size=11, name='Arial')
    ws_g.cell(1, i).alignment = Alignment(horizontal='center')
    ws_g.cell(2, i, value=f"{r.get('type','')} ({r.get('capacity',0)} PL)").font = Font(size=8, italic=True)
    ws_g.cell(2, i).alignment = Alignment(horizontal='center')
    ws_g.column_dimensions[get_column_letter(i)].width = 24

curr_row = 3
for day in ALL_DAYS:
    ws_g.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=len(rooms_list)+1)
    d_c = ws_g.cell(curr_row, 1, value=day)
    d_c.font = Font(bold=True, color=WHITE, size=11); d_c.fill = FILL_DAY
    curr_row += 1
    for t_str in FSTG_SLOTS:
        ws_g.cell(curr_row, 1, value=t_str[:5]).font = Font(bold=True)
        for entry in timetable:
            s = slots_dict.get(entry.get('slot_id'), {})
            if s.get('day') == day and s.get('start_time') == t_str:
                rid = entry.get('room_id')
                if rid:
                    try:
                        ridx = [rm['id'] for rm in rooms_list].index(rid)
                        m_n = modules.get(module_parts.get(entry.get('module_part_id'),{}).get('module_id'), "Cours")
                        c = ws_g.cell(curr_row, ridx+2, value=f"{m_n}\n{sections_dict.get(entry.get('section_id'),'')}")
                        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
                        c.fill = fill(get_color(m_n)); c.font = Font(size=8, name='Arial'); c.border = THIN_BORDER
                    except: pass
        ws_g.row_dimensions[curr_row].height = 45
        curr_row += 1

# 2. --- SECTIONS ---
section_data = {sid: {} for sid in sections_dict}
for entry in timetable:
    s = slots_dict.get(entry.get('slot_id'), {})
    d, t = s.get('day','').upper(), s.get('start_time','')
    if d in ALL_DAYS and t in FSTG_SLOTS:
        idx = FSTG_SLOTS.index(t)
        sid = entry.get('section_id')
        if sid:
            mp = module_parts.get(entry.get('module_part_id'), {})
            mn = modules.get(mp.get('module_id'), "Module")
            section_data[sid].setdefault((d, FSTG_LABELS[idx]), []).append({
                "module": mn, "type": mp.get('type','TD'), 
                "room": rooms_dict.get(entry.get('room_id'),{}).get('name','')
            })

ROWS_PER_DAY = 12
for sid, sname in sections_dict.items():
    data = section_data[sid] # <--- CORRIGE ICI
    if not data: continue
    ws = wb.create_sheet(sname[:30].replace("/","_"))
    ws.sheet_view.showGridLines = False
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=LAST_COL)
    ws.cell(1, 1, f"Emploi du temps - {sname}").font = Font(bold=True, size=15, name='Arial')
    for i, lbl in enumerate(FSTG_LABELS):
        col = get_slot_col(i)
        c = ws.cell(3, col, value=lbl)
        c.fill = fill(SALMON); c.font = Font(bold=True, size=9); c.alignment = Alignment(horizontal='center'); c.border = THIN_BORDER
    
    for di, day in enumerate(ALL_DAYS):
        r_start = 4 + (di * ROWS_PER_DAY)
        r_end   = r_start + ROWS_PER_DAY - 1
        ws.merge_cells(start_row=r_start, start_column=1, end_row=r_end, end_column=1)
        dj = ws.cell(r_start, 1, value=day)
        dj.fill = fill(SALMON); dj.font = Font(bold=True, size=10); dj.alignment = Alignment(horizontal='center', vertical='center', text_rotation=90); dj.border = THIN_BORDER
        for i, lbl in enumerate(FSTG_LABELS):
            col = get_slot_col(i)
            assigns = data.get((day, lbl), [])
            if not assigns:
                ws.merge_cells(start_row=r_start, start_column=col, end_row=r_end, end_column=col)
                ws.cell(r_start, col).border = THIN_BORDER
            else:
                bk = ROWS_PER_DAY // len(assigns)
                for ai, a in enumerate(assigns):
                    r1, r2 = r_start + ai*bk, r_start + (ai+1)*bk - 1 if ai < len(assigns)-1 else r_end
                    ws.merge_cells(start_row=r1, start_column=col, end_row=r2, end_column=col)
                    cell = ws.cell(r1, col, value=f"{a['type']} {a['module']}\n{a['room']}")
                    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
                    cell.fill = fill(get_color(a['module'])); cell.font = Font(bold=True, size=8, name='Arial')
                    for ri in range(r1, r2+1): ws.cell(ri, col).border = THIN_BORDER
        
        for ri in range(r_start, r_end+1):
            for sc in [SEP1_COL, SEP2_COL]:
                ws.cell(ri, sc).fill = FILL_SEP
                ws.cell(ri, sc).border = Border(left=Side(style='medium'), right=Side(style='medium'))

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions[get_column_letter(SEP1_COL)].width = 2
    ws.column_dimensions[get_column_letter(SEP2_COL)].width = 2
    for i in range(len(FSTG_LABELS)): ws.column_dimensions[get_column_letter(get_slot_col(i))].width = 30

wb.save(OUTPUT_PATH)
print(f"✅ FINAL PREMIUM Excel Generated : {OUTPUT_PATH}")
