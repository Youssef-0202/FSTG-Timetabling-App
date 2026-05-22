import sys
import os
import json
import traceback
import pandas as pd
from sqlalchemy import text
from database import engine, SessionLocal
from models import Teacher, Assignment, TDGroup, Section, ModulePart

def parse_and_update_maquette(filepath: str):
    db = SessionLocal()
    stats = {
        "success": False,
        "rows_processed": 0,
        "rows_ignored": 0,
        "assignments_created": 0,
        "assignments_deleted": 0,
        "teachers_created": [],
        "errors": []
    }
    
    try:
        try:
            df = pd.read_excel(filepath, engine='openpyxl', header=None, skiprows=4)
        except Exception as e:
            stats["errors"].append(f"Impossible de lire le fichier: {str(e)}")
            return stats
            
        if df.empty or df.shape[1] < 5:
            stats["errors"].append("Le fichier Excel ne respecte pas le template officiel (colonnes manquantes).")
            return stats
            
        teacher_cache = {t.name: t.id for t in db.query(Teacher).all()}
        found_keys = set()
        
        # Identifier toutes les sections présentes dans le fichier
        sections_in_file = set(df[1].dropna().astype(str).str.strip().unique())
        if 'SECTION' in sections_in_file:  # Retirer l'en-tête éventuel si resté
            sections_in_file.remove('SECTION')
            
        for idx, row in df.iterrows():
            stats["rows_processed"] += 1
            internal_id = str(row[0]).strip()
            teacher_names_str = str(row[4]).strip()
            
            if not internal_id or internal_id == "nan":
                stats["rows_ignored"] += 1
                continue
                
            if internal_id.startswith("NEW_"):
                from models import Module
                sec_name = str(row[1]).strip()
                mod_name_full = str(row[2]).strip()
                
                target_section = db.query(Section).filter(Section.name.ilike(f"%{sec_name}%")).first()
                if not target_section:
                    stats["rows_ignored"] += 1
                    stats["errors"].append(f"Ligne {idx+5}: Section '{sec_name}' introuvable.")
                    continue
                    
                m_type = "CM"
                if "(TD)" in mod_name_full.upper(): m_type = "TD"
                elif "(TP)" in mod_name_full.upper(): m_type = "TP"
                
                clean_mod_name = mod_name_full.replace("(CM)", "").replace("(TD)", "").replace("(TP)", "").replace("()", "").strip()
                
                vh_str = str(row[3]).upper().replace("H", "").strip()
                vh_val = int(vh_str) if vh_str.isdigit() else 24
                
                module = db.query(Module).filter(Module.name.ilike(f"%{clean_mod_name}%")).first()
                if not module:
                    module = Module(name=clean_mod_name, vh=vh_val)
                    db.add(module)
                    db.flush()
                    
                mpart = db.query(ModulePart).filter(ModulePart.module_id == module.id, ModulePart.type == m_type).first()
                if not mpart:
                    mpart = ModulePart(module_id=module.id, type=m_type)
                    db.add(mpart)
                    db.flush()
                    
                part_id = mpart.id
                section_id = target_section.id
                if m_type == "CM":
                    tdgroup_id = None
                else:
                    target_td = db.query(TDGroup).filter(TDGroup.section_id == section_id).first()
                    tdgroup_id = target_td.id if target_td else None
                    
            else:
                parts = internal_id.split('_')
                if len(parts) != 3:
                    stats["rows_ignored"] += 1
                    stats["errors"].append(f"Ligne {idx+5}: Format ID incorrect ({internal_id})")
                    continue
                    
                try:
                    part_id = int(parts[0])
                    section_id = int(parts[1])
                    tdgroup_id = int(parts[2]) if parts[2] else None
                except:
                    stats["rows_ignored"] += 1
                    stats["errors"].append(f"Ligne {idx+5}: ID interne corrompu")
                    continue
                
                mpart = db.query(ModulePart).filter(ModulePart.id == part_id).first()
                if not mpart:
                    stats["rows_ignored"] += 1
                    stats["errors"].append(f"Ligne {idx+5}: Le module part_id={part_id} n'existe plus en base.")
                    continue
            
            # Check existant
            if tdgroup_id is None:
                existing_query = text("""
                    SELECT string_agg(DISTINCT t.name, ', ')
                    FROM public.assignments a
                    JOIN public.teachers t ON a.teacher_id = t.id
                    LEFT JOIN public.assignment_tdgroups atd ON a.id = atd.assignment_id
                    WHERE a.module_part_id = :part_id
                      AND (a.section_id = :sec_id OR atd.tdgroup_id IN (SELECT id FROM public.td_groups WHERE section_id = :sec_id))
                """)
                res = db.execute(existing_query, {"part_id": part_id, "sec_id": section_id}).fetchone()
            else:
                existing_query = text("""
                    SELECT string_agg(DISTINCT t.name, ', ')
                    FROM public.assignments a
                    JOIN public.teachers t ON a.teacher_id = t.id
                    LEFT JOIN public.assignment_tdgroups atd ON a.id = atd.assignment_id
                    WHERE a.module_part_id = :part_id AND atd.tdgroup_id = :td_id
                """)
                res = db.execute(existing_query, {"part_id": part_id, "td_id": tdgroup_id}).fetchone()
            
            current_teacher_str = res[0] if res and res[0] else ""
            clean_current = ", ".join(sorted([t.strip() for t in current_teacher_str.split(',') if t.strip() and t.strip() != "PROF"]))
            
            if teacher_names_str == "------- (unknown)" or teacher_names_str == "nan":
                new_teachers = []
            else:
                new_teachers = [t.strip() for t in teacher_names_str.split(',') if t.strip() and t.strip() != "PROF"]
                
            clean_new = ", ".join(sorted(new_teachers))
            
            if clean_current == clean_new:
                stats["rows_ignored"] += 1
                continue
                
            # DELETION / CLEANUP
            if tdgroup_id is None:
                old_assignments = db.query(Assignment).filter(
                    Assignment.module_part_id == part_id,
                    Assignment.section_id == section_id
                ).all()
                mutualized = db.query(Assignment).join(Assignment.td_groups).filter(
                    Assignment.module_part_id == part_id,
                    TDGroup.section_id == section_id
                ).all()
                for ma in mutualized:
                    ma.td_groups = [g for g in ma.td_groups if g.section_id != section_id]
                for oa in old_assignments:
                    db.delete(oa)
                    stats["assignments_deleted"] += 1
            else:
                old_assignments = db.query(Assignment).filter(
                    Assignment.module_part_id == part_id
                ).filter(Assignment.td_groups.any(id=tdgroup_id)).all()
                for oa in old_assignments:
                    oa.td_groups = [g for g in oa.td_groups if g.id != tdgroup_id]
                    if len(oa.td_groups) == 0 and oa.section_id is None:
                        db.delete(oa)
                        stats["assignments_deleted"] += 1
                        
            db.flush()
            
            # CREATION
            for t_name in new_teachers:
                t_id = teacher_cache.get(t_name)
                if not t_id:
                    new_teacher = Teacher(name=t_name, email=f"{t_name.replace(' ', '.').lower()}@fstg.ma")
                    db.add(new_teacher)
                    db.flush()
                    teacher_cache[t_name] = new_teacher.id
                    t_id = new_teacher.id
                    stats["teachers_created"].append(t_name)
                    
                existing_assignment = db.query(Assignment).filter(
                    Assignment.module_part_id == part_id,
                    Assignment.teacher_id == t_id
                ).first()
                
                if existing_assignment:
                    if tdgroup_id is not None:
                        tg = db.query(TDGroup).filter(TDGroup.id == tdgroup_id).first()
                        if tg and tg not in existing_assignment.td_groups:
                            existing_assignment.td_groups.append(tg)
                    else:
                        tgs = db.query(TDGroup).filter(TDGroup.section_id == section_id).all()
                        for tg in tgs:
                            if tg not in existing_assignment.td_groups:
                                existing_assignment.td_groups.append(tg)
                else:
                    new_a = Assignment(
                        module_part_id=part_id,
                        teacher_id=t_id,
                        section_id=section_id if tdgroup_id is None else None,
                        is_locked=True 
                    )
                    if tdgroup_id is not None:
                        tg = db.query(TDGroup).filter(TDGroup.id == tdgroup_id).first()
                        if tg:
                            new_a.td_groups.append(tg)
                    db.add(new_a)
                    stats["assignments_created"] += 1
                    
            # Enregistrer les clés trouvées pour la suppression des orphelins
            if tdgroup_id is None:
                found_keys.add(f"{part_id}_{section_id}_None")
            else:
                found_keys.add(f"{part_id}_None_{tdgroup_id}")
                
        # DELETION OF ORPHANS (Rows deleted in Excel)
        if sections_in_file and len(found_keys) > 0:
            all_sections_db = db.query(Section).filter(Section.name.in_(list(sections_in_file))).all()
            for s in all_sections_db:
                # Obtenir tous les assignments CM de cette section
                cm_assignments = db.query(Assignment).filter(Assignment.section_id == s.id).all()
                for a in cm_assignments:
                    key = f"{a.module_part_id}_{s.id}_None"
                    if key not in found_keys:
                        db.delete(a)
                        stats["assignments_deleted"] += 1
                
                # Obtenir tous les assignments TD de cette section
                td_assign_query = db.query(Assignment).join(Assignment.td_groups).filter(TDGroup.section_id == s.id).all()
                for a in td_assign_query:
                    # Un assignment peut avoir plusieurs groupes, on purge ceux manquant
                    groups_to_keep = []
                    for tg in a.td_groups:
                        if tg.section_id == s.id:
                            key = f"{a.module_part_id}_None_{tg.id}"
                            if key in found_keys:
                                groups_to_keep.append(tg)
                            else:
                                stats["assignments_deleted"] += 1
                        else:
                            groups_to_keep.append(tg) # Ne pas toucher aux groupes des autres sections
                    
                    a.td_groups = groups_to_keep
                    if len(a.td_groups) == 0 and a.section_id is None:
                        db.delete(a)
        
        db.commit()
        stats["success"] = True
        stats["teachers_created"] = list(set(stats["teachers_created"]))
        return stats
    except Exception as e:
        db.rollback()
        stats["errors"].append(str(e))
        return stats
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "errors": ["Aucun fichier fourni"]}))
        sys.exit(1)
        
    result = parse_and_update_maquette(sys.argv[1])
    print(json.dumps(result))
