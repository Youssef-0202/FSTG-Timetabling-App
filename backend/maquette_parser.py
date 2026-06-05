import pandas as pd
import os
import sys
import json
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from models import Assignment, Module, ModulePart, Teacher, Section, TDGroup

def parse_and_update_maquette(filepath: str, preview: bool = False, filiere_id: int = None):
    db = SessionLocal()
    DEBUG_FILE = os.path.join(os.path.dirname(__file__), "temp_uploads", "debug_log.txt")
    
    def log_debug(msg):
        with open(DEBUG_FILE, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
        sys.stderr.write(msg + "\n") # Visible dans les logs Docker exec

    log_debug(f"\n--- DEBUG START (Filiere: {filiere_id}, Preview: {preview}) ---")
    
    stats = {
        "success": True,
        "rows_processed": 0,
        "rows_ignored": 0,
        "assignments_created": 0,
        "assignments_deleted": 0,
        "teachers_created": [],
        "details": [],
        "errors": []
    }

    try:
        # 0. VALIDATION DE LA FILIERE (Titre en ligne 1)
        # On lit la toute première cellule du fichier
        df_title = pd.read_excel(filepath, header=None, nrows=1)
        excel_title = str(df_title.iloc[0, 0]).upper()
        
        if filiere_id:
            from models import Filiere
            filiere_obj = db.query(Filiere).filter(Filiere.id == filiere_id).first()
            if filiere_obj:
                f_name = filiere_obj.name.upper()
                # Extraction du nom court de la filière depuis le titre (ex: 'GI' depuis '... - GI')
                excel_filiere = excel_title.split('-')[-1].strip() if '-' in excel_title else excel_title
                
                if f_name not in excel_title:
                    stats["success"] = False
                    stats["errors"].append(f"Fichier Incorrect : Vous tentez d'importer une maquette '{excel_filiere}' alors que vous êtes sur la filière '{f_name}'.")
                    db.close()
                    return stats

        # L'Excel exporté a 3 lignes de titre avant les vraies colonnes
        # On lit avec header=3 pour atterrir sur la bonne ligne
        df = pd.read_excel(filepath, header=3)
        
        # Vérification de sécurité : si les colonnes attendues ne sont pas là, on essaye header=0
        expected_cols = {'NOM DU MODULE', 'SECTION', 'ENSEIGNANT'}
        if not expected_cols.issubset(set(df.columns)):
            df = pd.read_excel(filepath, header=0)
        
        if 'ID' not in df.columns: df.insert(0, 'ID', '')
        
        teacher_cache = {t.name: t.id for t in db.query(Teacher).all()}
        touched_cm = set() # (part_id, section_id)
        touched_td = set() # (part_id, tdgroup_id)
        seen_sections = set()
        
        # 1. ANALYSE DES LIGNES EXCEL
        for index, row in df.iterrows():
            internal_id = str(row.get('ID', '')).strip()
            full_mod_name = str(row.get('NOM DU MODULE', '')).strip()
            sec_display_name = str(row.get('SECTION', '')).strip()
            teacher_names_str = str(row.get('ENSEIGNANT', '')).strip()
            
            if not full_mod_name or full_mod_name == 'nan': continue
            stats["rows_processed"] += 1
            
            # --- Parsing du Type et Nom ---
            m_type = "CM"
            if "(TD)" in full_mod_name: m_type = "TD"
            elif "(TP)" in full_mod_name: m_type = "TD" # On traite les TP comme des TD
            
            pure_mod_name = full_mod_name.replace("(CM)","").replace("(TD)","").replace("(TP)","").split("-")[0].strip()
            gr_num = None
            if "Gr" in full_mod_name:
                try: gr_num = full_mod_name.split("Gr")[-1].strip()
                except: pass

            log_debug(f"[ROW {index}] Analysing: {full_mod_name} | Type: {m_type} | Section: {sec_display_name} | ID: {internal_id}")

            # --- RESOLUTION DES ID ---
            part_id, section_id, tdgroup_id = None, None, None
            
            # Essai 1: ID Masqué
            if "_" in internal_id:
                try:
                    p_tmp, s_tmp, t_tmp = internal_id.split('_')
                    pid_tmp = int(p_tmp)
                    
                    # Vérifier le type de cette Part — IGNORER LES TP
                    p_check = db.query(ModulePart).filter(ModulePart.id == pid_tmp).first()
                    if p_check and p_check.type == 'TP':
                        log_debug(f"  -> SKIP (Part {pid_tmp} is TP, not managed)")
                        continue
                    
                    part_id = pid_tmp
                    section_id = int(s_tmp)
                    tdgroup_id = int(t_tmp) if t_tmp != 'None' and t_tmp else None
                    log_debug(f"  -> Match via ID: Part {part_id}, Sec {section_id}, Gr {tdgroup_id}")
                except:
                    log_debug(f"  -> ID corrupt: {internal_id}")

            # Essai 2: Texte (Fuzzy Match) si ID a échoué
            if not part_id:
                log_debug(f"  -> Attempting Text Match...")
                # Trouver la section par nom
                sec_row = db.execute(text("SELECT id FROM sections WHERE name ILIKE :n LIMIT 1"), {"n": f"%{sec_display_name}%"}).fetchone()
                if sec_row:
                    section_id = sec_row[0]
                    # Trouver le module et la partie
                    mod_row = db.execute(text("SELECT mp.id FROM module_parts mp JOIN modules m ON mp.module_id = m.id WHERE m.name ILIKE :n AND mp.type = :t LIMIT 1"), {"n": f"%{pure_mod_name}%", "t": m_type}).fetchone()
                    if mod_row:
                        part_id = mod_row[0]
                        # Trouver le groupe
                        if m_type == "TD" and gr_num:
                            tg_row = db.execute(text("SELECT id FROM td_groups WHERE section_id = :s AND name ILIKE :n LIMIT 1"), {"s": section_id, "n": f"%Gr%{gr_num}%"}).fetchone()
                            if tg_row: tdgroup_id = tg_row[0]
                        log_debug(f"  -> Text Match found: Part {part_id}, Sec {section_id}, Gr {tdgroup_id}")
                    else:
                        log_debug(f"  -> Module/Part not found for {pure_mod_name} ({m_type})")
                else:
                    log_debug(f"  -> Section not found for {sec_display_name}")

            if not part_id or not section_id:
                log_debug(f"  -> !!! CRITICAL: Row IGNORED (No match found) !!!")
                continue

            # Marquer comme vu
            seen_sections.add(section_id)
            if m_type == "CM": touched_cm.add((part_id, section_id))
            else: touched_td.add((part_id, tdgroup_id))

            # --- VERIFICATION EXISTENCE ---
            current_exists = False
            current_prof = "VIDE"
            assign_id = None
            if m_type == "CM":
                res = db.execute(text("SELECT a.id, t.name FROM assignments a LEFT JOIN teachers t ON a.teacher_id = t.id WHERE a.module_part_id = :p AND a.section_id = :s LIMIT 1"), {"p": part_id, "s": section_id}).fetchone()
            else:
                res = db.execute(text("SELECT a.id, t.name FROM assignments a JOIN assignment_tdgroups atd ON a.id = atd.assignment_id LEFT JOIN teachers t ON a.teacher_id = t.id WHERE a.module_part_id = :p AND atd.tdgroup_id = :t LIMIT 1"), {"p": part_id, "t": tdgroup_id}).fetchone() if tdgroup_id else None
            
            if res:
                current_exists = True
                assign_id = res[0]
                current_prof = (res[1] if res[1] else "PROF").strip()
                log_debug(f"  -> Found in DB: Assignment {assign_id} with Prof '{current_prof}'")

            # Comparaison profs
            new_profs = [t.strip() for t in teacher_names_str.split(',') if t.strip() and t.strip() not in ["nan", "------- (unknown)", "A DETERMINER"]]
            clean_new = ", ".join(sorted(new_profs)) if new_profs else "PROF"
            
            log_debug(f"  -> Compare: [DB: '{current_prof}'] vs [Excel: '{clean_new}']")
            if clean_new != current_prof or not current_exists:
                log_debug(f"  -> !!! CHANGE DETECTED !!!")
                stats["details"].append({
                    "module": full_mod_name,
                    "section": sec_display_name,
                    "old": current_prof if current_exists else "NON EXISTANT",
                    "new": clean_new
                })
                
                if not preview:
                    log_debug(f"  -> APPLYING UPDATE for {full_mod_name}")
                    # Supprimer l'ancienne affectation si elle existe
                    if current_exists and res:
                        old_a = db.query(Assignment).filter(Assignment.id == res[0]).first()
                        if old_a:
                            db.delete(old_a)
                            db.flush()
                            stats["assignments_deleted"] += 1
                    
                    # Créer la ou les nouvelles affectations
                    profs_list = new_profs if new_profs else ["PROF"]
                    for prof_name in profs_list:
                        t_id = teacher_cache.get(prof_name)
                        if not t_id:
                            # Créer le prof s'il n'existe pas (concerne les nouveaux noms ou 'PROF' s'il manquait)
                            new_t = Teacher(name=prof_name, email=f"{prof_name.lower().replace(' ', '.')}@fstg.ma")
                            db.add(new_t)
                            db.flush()
                            t_id = new_t.id
                            teacher_cache[prof_name] = t_id
                            stats["teachers_created"].append(prof_name)
                        
                        new_a = Assignment(
                            module_part_id=part_id,
                            teacher_id=t_id,
                            section_id=section_id if m_type == "CM" else None,
                            is_locked=False
                        )
                        if m_type != "CM" and tdgroup_id:
                            tg_obj = db.query(TDGroup).filter(TDGroup.id == tdgroup_id).first()
                            if tg_obj:
                                new_a.td_groups.append(tg_obj)
                        db.add(new_a)
                        stats["assignments_created"] += 1
                    
                    db.commit()
                    log_debug(f"  -> DB UPDATED: {full_mod_name} => {clean_new}")
            else:
                stats["rows_ignored"] += 1

        # 2. ANALYSE DES SUPPRESSIONS (Sync au niveau des sections vues dans l'Excel)
        if seen_sections:
            log_debug(f"\n--- Checking for Deletions in {len(seen_sections)} section(s): {seen_sections} ---")
            sections_list = list(seen_sections)

            # CM orphelins : affectations CM en base qui ne sont PAS dans le fichier Excel
            db_cms = db.query(Assignment).join(Assignment.module_part).filter(
                Assignment.section_id.in_(sections_list),
                ModulePart.type == 'CM'
            ).all()
            for a in db_cms:
                if (a.module_part_id, a.section_id) not in touched_cm:
                    m_name = a.module_part.module.name
                    s_obj = db.query(Section).get(a.section_id)
                    s_name = s_obj.name if s_obj else str(a.section_id)
                    prof_name = a.teacher.name if a.teacher else "PROF"
                    log_debug(f"  -> Orphan CM: {m_name} in {s_name}")
                    stats["details"].append({
                        "module": f"{m_name} (CM)",
                        "section": s_name,
                        "old": prof_name,
                        "new": "SUPPRIMÉ (LIGNE RETIRÉE)"
                    })
                    if not preview:
                        db.delete(a)
                        stats["assignments_deleted"] += 1

            # TD orphelins : UNIQUEMENT le type TD (pas TP, qui n'est pas géré par cet import)
            db_tds = db.query(Assignment).join(Assignment.td_groups).join(Assignment.module_part).filter(
                TDGroup.section_id.in_(sections_list),
                ModulePart.type == "TD"
            ).all()
            seen_assignment_ids = set()
            for a in db_tds:
                if a.id in seen_assignment_ids:
                    continue
                seen_assignment_ids.add(a.id)
                for tg in a.td_groups:
                    if (a.module_part_id, tg.id) not in touched_td:
                        m_name = a.module_part.module.name
                        prof_name = a.teacher.name if a.teacher else "PROF"
                        log_debug(f"  -> Orphan TD: {m_name} ({a.module_part.type}) - {tg.name}")
                        stats["details"].append({
                            "module": f"{m_name} ({a.module_part.type}) - {tg.name}",
                            "section": tg.section.name if tg.section else "?",
                            "old": prof_name,
                            "new": "SUPPRIMÉ (LIGNE RETIRÉE)"
                        })
                        if not preview:
                            db.delete(a)
                            stats["assignments_deleted"] += 1
            
            if not preview:
                db.commit()

    except Exception as e:
        stats["success"] = False
        stats["errors"].append(str(e))
        log_debug(f"CRITICAL ERROR: {str(e)}")
    finally:
        db.close()
    
    return stats

if __name__ == "__main__":
    import sys, json
    args = sys.argv[1:]
    preview = "--preview" in args
    filiere_id = None
    if "--filiere_id" in args:
        filiere_id = int(args[args.index("--filiere_id") + 1])
    filepath = args[-1]
    res = parse_and_update_maquette(filepath, preview, filiere_id)
    print(json.dumps(res, indent=4, ensure_ascii=False))
