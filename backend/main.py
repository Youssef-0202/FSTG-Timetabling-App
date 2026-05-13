from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FST Marrakech Timetabling API",
    version="2.0.0",
    description="API de gestion des emplois du temps — FST de Marrakech (Gueliz)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.56.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ROOT & STATUS

@app.get("/")
def read_root():
    return {"message": "FSTM Timetabling API v2.0", "status": "running"}

@app.get("/status")
def get_status():
    return {"status": "ok", "db": "connected"}

@app.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    return schemas.DashboardStats(
        total_teachers=db.query(models.Teacher).count(),
        total_rooms=db.query(models.Room).count(),
        total_sections=db.query(models.Section).count(),
        total_modules=db.query(models.Module).count(),
        total_assignments=db.query(models.Assignment).count(),
        hard_violations=0  
    )


# TEACHERS  /teachers

@app.get("/teachers", response_model=List[schemas.Teacher])
def list_teachers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Teacher).offset(skip).limit(limit).all()

@app.get("/teachers/{teacher_id}", response_model=schemas.Teacher)
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")
    return t

@app.post("/teachers", response_model=schemas.Teacher, status_code=201)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Teacher).filter(models.Teacher.email == teacher.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    db_t = models.Teacher(**teacher.model_dump())
    db.add(db_t); db.commit(); db.refresh(db_t)
    return db_t

@app.put("/teachers/{teacher_id}", response_model=schemas.Teacher)
def update_teacher(teacher_id: int, data: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit(); db.refresh(t)
    return t

@app.delete("/teachers/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Enseignant introuvable")
    db.delete(t); db.commit()


# ROOMS  /rooms

@app.get("/rooms", response_model=List[schemas.Room])
def list_rooms(type: str = None, db: Session = Depends(get_db)):
    q = db.query(models.Room)
    if type:
        q = q.filter(models.Room.type == type)
    return q.all()

@app.get("/rooms/{room_id}", response_model=schemas.Room)
def get_room(room_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Salle introuvable")
    return r

@app.post("/rooms", response_model=schemas.Room, status_code=201)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db)):
    db_r = models.Room(**room.model_dump())
    db.add(db_r); db.commit(); db.refresh(db_r)
    return db_r

@app.put("/rooms/{room_id}", response_model=schemas.Room)
def update_room(room_id: int, data: schemas.RoomUpdate, db: Session = Depends(get_db)):
    r = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Salle introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return r

@app.delete("/rooms/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Salle introuvable")
    db.delete(r); db.commit()


# GROUPE FILIERES  /groupe-filieres

@app.get("/groupe-filieres", response_model=List[schemas.GroupeFiliere])
def list_groupe_filieres(db: Session = Depends(get_db)):
    return db.query(models.GroupeFiliere).all()

@app.post("/groupe-filieres", response_model=schemas.GroupeFiliere, status_code=201)
def create_groupe_filiere(group: schemas.GroupeFiliereCreate, db: Session = Depends(get_db)):
    db_g = models.GroupeFiliere(**group.model_dump())
    db.add(db_g); db.commit(); db.refresh(db_g)
    return db_g

@app.delete("/groupe-filieres/{group_id}", status_code=204)
def delete_groupe_filiere(group_id: int, db: Session = Depends(get_db)):
    g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    db.delete(g); db.commit()

@app.put("/groupe-filieres/{group_id}", response_model=schemas.GroupeFiliere)
def update_groupe_filiere(group_id: int, data: schemas.GroupeFiliereCreate, db: Session = Depends(get_db)):
    g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    db.commit(); db.refresh(g)
    return g


# SECTIONS  /sections

@app.get("/sections", response_model=List[schemas.Section])
def list_sections(db: Session = Depends(get_db)):
    return db.query(models.Section).all()

@app.post("/sections", response_model=schemas.Section, status_code=201)
def create_section(data: schemas.SectionCreate, db: Session = Depends(get_db)):
    new_s = models.Section(
        name=data.name,
        semestre=data.semestre,
        total_capacity=data.total_capacity
    )
    for g_id in data.groupe_ids:
        g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == g_id).first()
        if g:
            new_s.groupes.append(g)
    db.add(new_s); db.commit(); db.refresh(new_s)
    return new_s

@app.delete("/sections/{section_id}", status_code=204)
def delete_section(section_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Section introuvable")
    db.delete(s); db.commit()

@app.put("/sections/{section_id}", response_model=schemas.Section)
def update_section(section_id: int, data: schemas.SectionCreate, db: Session = Depends(get_db)):
    s = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Section introuvable")
    
    s.name = data.name
    s.semestre = data.semestre
    s.total_capacity = data.total_capacity
    
    # Mise à jour des groupes associés (pour les sections c'est souvent les cohortes parentes)
    s.groupes = []
    for g_id in data.groupe_ids:
        g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == g_id).first()
        if g:
            s.groupes.append(g)
            
    db.commit(); db.refresh(s)
    return s


# TD GROUPS  /td-groups

@app.get("/td-groups", response_model=List[schemas.TDGroup])
def list_td_groups(db: Session = Depends(get_db)):
    return db.query(models.TDGroup).all()

@app.post("/td-groups", response_model=schemas.TDGroup, status_code=201)
def create_td_group(group: schemas.TDGroupCreate, db: Session = Depends(get_db)):
    db_g = models.TDGroup(**group.model_dump())
    db.add(db_g); db.commit(); db.refresh(db_g)
    return db_g

@app.delete("/td-groups/{tdgroup_id}", status_code=204)
def delete_td_group(tdgroup_id: int, db: Session = Depends(get_db)):
    g = db.query(models.TDGroup).filter(models.TDGroup.id == tdgroup_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="TDGroup introuvable")
    db.delete(g); db.commit()

@app.put("/td-groups/{tdgroup_id}", response_model=schemas.TDGroup)
def update_td_group(tdgroup_id: int, data: schemas.TDGroupCreate, db: Session = Depends(get_db)):
    g = db.query(models.TDGroup).filter(models.TDGroup.id == tdgroup_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="TDGroup introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    db.commit(); db.refresh(g)
    return g


# MODULES  /modules

@app.get("/modules", response_model=List[schemas.Module])
def list_modules(db: Session = Depends(get_db)):
    return db.query(models.Module).all()

@app.post("/modules", response_model=schemas.Module, status_code=201)
def create_module(module: schemas.ModuleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Module).filter(models.Module.code == module.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Code module déjà utilisé")
    db_m = models.Module(**module.model_dump())
    db.add(db_m); db.commit(); db.refresh(db_m)
    return db_m

@app.put("/modules/{module_id}", response_model=schemas.Module)
def update_module(module_id: int, data: schemas.ModuleUpdate, db: Session = Depends(get_db)):
    m = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m

@app.delete("/modules/{module_id}", status_code=204)
def delete_module(module_id: int, db: Session = Depends(get_db)):
    m = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module introuvable")
    db.delete(m); db.commit()


# GROUPE MODULES  /groupe-modules

@app.get("/groupe-modules", response_model=List[schemas.GroupeModule])
def list_groupe_modules(db: Session = Depends(get_db)):
    return db.query(models.GroupeModule).all()

@app.post("/groupe-modules", response_model=schemas.GroupeModule, status_code=201)
def create_groupe_module(data: schemas.GroupeModuleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.GroupeModule).filter(models.GroupeModule.module_id == data.module_id).first()
    if existing: raise HTTPException(400, "Ce module a déjà un groupe d'effectif assigné.")
    db_gm = models.GroupeModule(module_id=data.module_id, effectif=data.effectif)
    for gid in data.groupe_ids:
        g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == gid).first()
        if g: db_gm.groupes.append(g)
    db.add(db_gm); db.commit(); db.refresh(db_gm)
    return db_gm

@app.put("/groupe-modules/{gm_id}", response_model=schemas.GroupeModule)
def update_groupe_module(gm_id: int, data: schemas.GroupeModuleUpdate, db: Session = Depends(get_db)):
    db_gm = db.query(models.GroupeModule).filter(models.GroupeModule.id == gm_id).first()
    if not db_gm: raise HTTPException(404, "GroupeModule introuvable")
    if data.effectif is not None: db_gm.effectif = data.effectif
    if data.groupe_ids is not None:
        db_gm.groupes = []
        for gid in data.groupe_ids:
            g = db.query(models.GroupeFiliere).filter(models.GroupeFiliere.id == gid).first()
            if g: db_gm.groupes.append(g)
    db.commit(); db.refresh(db_gm)
    return db_gm

@app.delete("/groupe-modules/{gm_id}", status_code=204)
def delete_groupe_module(gm_id: int, db: Session = Depends(get_db)):
    db_gm = db.query(models.GroupeModule).filter(models.GroupeModule.id == gm_id).first()
    if not db_gm: raise HTTPException(404, "GroupeModule introuvable")
    db.delete(db_gm); db.commit()


# MODULE PARTS  /module-parts

@app.get("/module-parts", response_model=List[schemas.ModulePart])
def list_module_parts(db: Session = Depends(get_db)):
    return db.query(models.ModulePart).all()

@app.post("/module-parts", response_model=schemas.ModulePart, status_code=201)
def create_module_part(part: schemas.ModulePartCreate, db: Session = Depends(get_db)):
    db_p = models.ModulePart(**part.model_dump())
    db.add(db_p); db.commit(); db.refresh(db_p)
    return db_p

@app.put("/module-parts/{part_id}", response_model=schemas.ModulePart)
def update_module_part(part_id: int, part: schemas.ModulePartUpdate, db: Session = Depends(get_db)):
    db_p = db.query(models.ModulePart).filter(models.ModulePart.id == part_id).first()
    if not db_p: raise HTTPException(404, "Partie de module introuvable")
    data = part.model_dump(exclude_unset=True)
    for k,v in data.items(): setattr(db_p, k, v)
    db.commit(); db.refresh(db_p)
    return db_p

@app.delete("/module-parts/{part_id}", status_code=204)
def delete_module_part(part_id: int, db: Session = Depends(get_db)):
    db_p = db.query(models.ModulePart).filter(models.ModulePart.id == part_id).first()
    if not db_p: raise HTTPException(404, "Partie de module introuvable")
    db.delete(db_p); db.commit()


# FILIERES  /filieres

@app.get("/filieres", response_model=List[schemas.Filiere])
def list_filieres(db: Session = Depends(get_db)):
    return db.query(models.Filiere).all()


# DEPARTMENTS  /departments

@app.get("/departments", response_model=List[schemas.Department])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()


# TIMESLOTS  /timeslots

@app.get("/timeslots", response_model=List[schemas.Timeslot])
def list_timeslots(db: Session = Depends(get_db)):
    return db.query(models.Timeslot).all()

@app.post("/timeslots", response_model=schemas.Timeslot, status_code=201)
def create_timeslot(slot: schemas.TimeslotCreate, db: Session = Depends(get_db)):
    db_s = models.Timeslot(**slot.model_dump())
    db.add(db_s); db.commit(); db.refresh(db_s)
    return db_s

@app.put("/timeslots/{slot_id}", response_model=schemas.Timeslot)
def update_timeslot(slot_id: int, data: schemas.TimeslotUpdate, db: Session = Depends(get_db)):
    s = db.query(models.Timeslot).filter(models.Timeslot.id == slot_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit(); db.refresh(s)
    return s

@app.delete("/timeslots/{slot_id}", status_code=204)
def delete_timeslot(slot_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Timeslot).filter(models.Timeslot.id == slot_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    db.delete(s); db.commit()


# ASSIGNMENTS  /assignments

@app.get("/assignments", response_model=List[schemas.Assignment])
def list_assignments(db: Session = Depends(get_db)):
    return db.query(models.Assignment).all()

@app.post("/assignments", response_model=schemas.Assignment, status_code=201)
def create_assignment(data: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    new_a = models.Assignment(
        module_part_id=data.module_part_id,
        teacher_id=data.teacher_id,
        room_id=data.room_id,
        slot_id=data.slot_id,
        section_id=data.section_id,
        is_locked=data.is_locked
    )
    # Ajout des groupes TD si c'est un TD/TP
    for g_id in data.tdgroup_ids:
        g = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
        if g:
            new_a.td_groups.append(g)
    
    db.add(new_a); db.commit(); db.refresh(new_a)
    return new_a

@app.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    db.delete(a); db.commit()

@app.put("/assignments/{assignment_id}", response_model=schemas.Assignment)
def update_assignment(assignment_id: int, data: schemas.AssignmentUpdate, db: Session = Depends(get_db)):
    db_a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not db_a:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    
    # Mise à jour sélective
    update_data = data.model_dump(exclude_unset=True)
    
    if "module_part_id" in update_data: db_a.module_part_id = update_data["module_part_id"]
    if "teacher_id" in update_data: db_a.teacher_id = update_data["teacher_id"]
    if "section_id" in update_data: db_a.section_id = update_data["section_id"]
    if "is_locked" in update_data: db_a.is_locked = update_data["is_locked"]
    if "room_id" in update_data: db_a.room_id = update_data["room_id"]
    if "slot_id" in update_data: db_a.slot_id = update_data["slot_id"]

    # Mise à jour des groupes TD si spécifiés
    if "tdgroup_ids" in update_data:
        db_a.td_groups = []
        for g_id in update_data["tdgroup_ids"]:
            g = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
            if g:
                db_a.td_groups.append(g)

    db.commit()
    db.refresh(db_a)
    return db_a



# --- DISPONIBILITÉS EN TEMPS RÉEL (EDITION MANUELLE) ---

@app.get("/available-resources")
def get_available_resources(slot_id: int, assignment_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Renvoie les listes filtrées de professeurs et de salles disponibles pour un créneau donné.
    Si assignment_id est fourni, on ignore l'occupation par cette affectation elle-même.
    """
    # 1. Trouver les occupations actuelles sur ce créneau
    occupied_query = db.query(models.Assignment).filter(models.Assignment.slot_id == slot_id)
    if assignment_id:
        occupied_query = occupied_query.filter(models.Assignment.id != assignment_id)
    
    occupations = occupied_query.all()
    occupied_room_ids = {a.room_id for a in occupations if a.room_id}
    occupied_teacher_ids = {a.teacher_id for a in occupations if a.teacher_id}

    # 2. Chambres Libres
    all_rooms = db.query(models.Room).all()
    available_rooms = [r for r in all_rooms if r.id not in occupied_room_ids]

    # 3. Professeurs Libres et Disponibles
    all_teachers = db.query(models.Teacher).all()
    slot = db.query(models.Timeslot).filter(models.Timeslot.id == slot_id).first()
    
    available_teachers = []
    if slot:
        day_name = slot.day.capitalize() # ex: "Lundi"
        slot_str = f"{slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}"
        
        for t in all_teachers:
            # Ne doit pas être occupé ailleurs
            if t.id in occupied_teacher_ids:
                continue
            
            # Vérification des préférences (Optionnel : si renseigné)
            if t.availabilities:
                # Format attendu : {"Lundi": ["08:30-10:25", ...]}
                day_slots = t.availabilities.get(day_name, [])
                if day_slots and slot_str not in day_slots:
                    # Si le prof a renseigné des créneaux mais que celui-ci n'y est pas
                    # Note: on peut être plus souple si availabilities est vide
                    continue
            
            available_teachers.append(t)
    else:
        # Fallback si slot non trouvé
        available_teachers = [t for t in all_teachers if t.id not in occupied_teacher_ids]

    return {
        "available_rooms": available_rooms,
        "available_teachers": available_teachers
    }


# --- API POUR L'ALGORITHME LOCAL ---

@app.get("/data-for-solver")
def get_data_for_solver(db: Session = Depends(get_db)):
    """
    Exporte toutes les données de la base SQL en JSON 
    pour que l'algorithme local sur Windows puisse les traiter.
    """
    return {
        "rooms": db.query(models.Room).all(),
        "sections": db.query(models.Section).all(),
        "td_groups": db.query(models.TDGroup).all(),
        "timeslots": db.query(models.Timeslot).all(),
        "modules": db.query(models.Module).all(),
        # On peut ajouter ici d'autres ressources si besoin
    }

@app.post("/save-assignments", status_code=201)
def save_assignments(assignments: List[schemas.AssignmentCreate], db: Session = Depends(get_db)):
    """
    Reçoit le résultat de l'IA (le planning) et l'enregistre dans la base.
    """
    try:
        # 1. On vide proprement l'ancien planning
        # On utilise une boucle pour être sûr que les relations M:M sont nettoyées
        old_assignments = db.query(models.Assignment).all()
        for old in old_assignments:
            old.td_groups = [] # Nettoyer la table d'association
            db.delete(old)
        db.flush() 

        # 2. On enregistre le nouveau planning
        for a in assignments:
            new_a = models.Assignment(
                module_part_id=a.module_part_id,
                teacher_id=a.teacher_id,
                room_id=a.room_id,
                slot_id=a.slot_id,
                section_id=a.section_id,
                is_locked=a.is_locked
            )
            # Ajout des groupes TD si présents
            if a.tdgroup_ids:
                for g_id in a.tdgroup_ids:
                    g = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
                    if g:
                        new_a.td_groups.append(g)
            
            db.add(new_a)
        
        db.commit()
        return {"message": "Planning sauvegardé en base de données avec tous les détails."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {str(e)}")

import os
import json

@app.get("/preview-schedule")
def get_preview_schedule(mode: str = "alns", db: Session = Depends(get_db)):
    """Récupère le dernier résultat généré pour un mode donné depuis la DB."""
    result = db.query(models.TimetableResult)\
               .filter(models.TimetableResult.algo_type == mode)\
               .order_by(models.TimetableResult.id.desc())\
               .first()
    
    if not result:
        return []
        
    return result.data

@app.post("/commit-preview", status_code=201)
def commit_preview(mode: str = "alns", db: Session = Depends(get_db)):
    """
    1. Marque le dernier résultat de ce mode comme 'validé' (Archive).
    2. Copie les données du JSON vers la table 'assignments' pour édition manuelle.
    """
    try:
        # 1. On cherche le dernier résultat pour ce mode
        res = db.query(models.TimetableResult)\
                .filter(models.TimetableResult.algo_type == mode)\
                .order_by(models.TimetableResult.id.desc())\
                .first()
        
        if not res:
            raise HTTPException(status_code=404, detail="Aucun résultat trouvé pour ce mode")

        # 2. On dévalide les autres pour ce mode
        db.query(models.TimetableResult)\
          .filter(models.TimetableResult.algo_type == mode)\
          .update({models.TimetableResult.is_validated: False})
        
        res.is_validated = True

        # 3. RÉINITIALISATION ET MISE À JOUR DE LA TABLE DE TRAVAIL (assignments)
        # Étape A : On "vide" le planning actuel et les groupes associés
        all_assignments = db.query(models.Assignment).all()
        for a in all_assignments:
            a.slot_id = None
            a.room_id = None
            a.td_groups = [] # On vide les groupes pour les ré-associer proprement
        db.flush()

        # Étape B : On applique les nouvelles positions et on relie les groupes
        for item in res.data:
            assignment_id = item.get('id')
            if not assignment_id: continue

            db_a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
            
            if not db_a:
                # Si par hasard l'affectation n'existe pas en base, on la crée
                db_a = models.Assignment(id=assignment_id, module_part_id=item['module_part_id'])
                db.add(db_a)

            # Mise à jour des données de base
            db_a.room_id = item.get('room_id')
            db_a.slot_id = item.get('slot_id')
            db_a.teacher_id = item.get('teacher_id')
            db_a.is_locked = item.get('is_locked', False)
            db_a.section_id = item.get('section_id')

            # --- RESTAURATION DES GROUPES TD (CRUCIAL POUR LE SCORE) ---
            group_data = item.get('td_groups', [])
            for g_item in group_data:
                # Le JSON peut contenir soit l'ID directement, soit l'objet groupe
                g_id = g_item['id'] if isinstance(g_item, dict) else g_item
                g_obj = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
                if g_obj:
                    db_a.td_groups.append(g_obj)

        db.commit()


        return {"status": "success", "message": f"Résultat {mode} activé et copié dans l'éditeur interactif."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors du commit : {str(e)}")


# --- GESTION DES RÉSULTATS D'OPTIMISATION ---

@app.get("/timetable-results", response_model=List[schemas.TimetableResult])
def list_timetable_results(db: Session = Depends(get_db)):
    """Liste tous les emplois du temps générés par ordre chronologique inverse."""
    return db.query(models.TimetableResult).order_by(models.TimetableResult.id.desc()).all()

@app.post("/timetable-results", response_model=schemas.TimetableResult, status_code=201)
def create_timetable_result(result: schemas.TimetableResultCreate, db: Session = Depends(get_db)):
    """Sauvegarde un nouveau résultat de génération (appelé par le solveur)."""
    db_res = models.TimetableResult(**result.model_dump())
    db.add(db_res); db.commit(); db.refresh(db_res)
    return db_res

@app.put("/timetable-results/{res_id}/validate", response_model=schemas.TimetableResult)
def validate_timetable_result(res_id: int, db: Session = Depends(get_db)):
    """Valide officiellement un emploi du temps et dé-valide les précédents."""
    # Optionnel : On peut décider de n'avoir qu'un seul EDT validé à la fois
    db.query(models.TimetableResult).update({models.TimetableResult.is_validated: False})
    
    res = db.query(models.TimetableResult).filter(models.TimetableResult.id == res_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    
    res.is_validated = True
    db.commit(); db.refresh(res)
    return res

@app.delete("/timetable-results/{res_id}", status_code=204)
def delete_timetable_result(res_id: int, db: Session = Depends(get_db)):
    """Supprime un ancien résultat de l'historique."""
    res = db.query(models.TimetableResult).filter(models.TimetableResult.id == res_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    db.delete(res); db.commit()

@app.get("/audit/section/{section_id}")
def audit_section(section_id: int, mode: str = "interactive", db: Session = Depends(get_db)):
    """
    Analyse la qualité de l'emploi du temps pour une section.
    - Si mode == 'interactive', on lit la table de travail SQL (assignments).
    - Sinon, on lit le dernier résultat de l'IA (ALNS, RL...) dans timetable_results.
    """
    try:
        if mode == "interactive":
            # ON AUDITE LA TABLE DE TRAVAIL (Celle modifiée par le Drag & Drop)
            # On récupère toutes les affectations de la DB
            all_db_assignments = db.query(models.Assignment).all()
            
            # On convertit en format compatible avec la logique d'audit
            all_assignments = []
            for a in all_db_assignments:
                all_assignments.append({
                    "id": a.id,
                    "module_part_id": a.module_part_id,
                    "teacher_id": a.teacher_id,
                    "room_id": a.room_id,
                    "slot_id": a.slot_id,
                    "section_id": a.section_id,
                    "td_groups": [{"id": g.id} for g in a.td_groups]
                })
        else:
            # ON AUDITE LA SOLUTION ORIGINALE DE L'IA
            result = db.query(models.TimetableResult)\
                       .filter(models.TimetableResult.algo_type == mode)\
                       .order_by(models.TimetableResult.id.desc())\
                       .first()
            
            if not result:
                return {"section": "N/A", "score": 0, "status": "Aucun résultat IA en base"}
                
            all_assignments = result.data

            
        timeslots = {t.id: t for t in db.query(models.Timeslot).all()}
        module_parts = {mp.id: mp for mp in db.query(models.ModulePart).all()}
        section = db.query(models.Section).filter(models.Section.id == section_id).first()
        if not section: return {"section": f"ID {section_id}", "score": 0, "status": "Section non trouvée en base"}
        
        td_groups = db.query(models.TDGroup).filter(models.TDGroup.section_id == section_id).all()
        td_group_ids = [g.id for g in td_groups]
        
        cm_assigns = []
        group_assigns = {gid: [] for gid in td_group_ids}
        
        count_found = 0
        for a in all_assignments:
            mp_id = a.get('module_part_id')
            mp_obj = module_parts.get(mp_id)
            is_really_cm = mp_obj.type.upper() == "CM" if mp_obj else False
            
            a_sid = int(a.get('section_id', -1))
            a_groups = [int(g['id']) for g in a.get('td_groups', [])]
            matched_groups = [gid for gid in td_group_ids if gid in a_groups]
            
            if is_really_cm and a_sid == section_id:
                cm_assigns.append(a)
                count_found += 1
            elif matched_groups: 
                for gid in matched_groups:
                    group_assigns[gid].append(a)
                    count_found += 1

        if count_found == 0:
            return {"section": section.name, "score": 0, "status": "Aucune séance trouvée dans le JSON"}

        # Indices de satisfaction par groupe
        group_details = {
            "compacite": [],
            "pause_dejeuner": [],
            "rythme_fatigue": [],
            "pedagogie_cm": [],
            "path_late_hits_raw": []
        }
        group_satisfaction = []
        
        # Ordre fixe des débuts de cours pour détecter les trous
        time_order = ["08:30", "10:35", "12:30", "14:30", "16:35"]
        
        for gid in td_group_ids:
            my_path = cm_assigns + group_assigns[gid]
            if not my_path: continue
            
            path_gaps = 0
            path_lunch_hits = 0
            path_late_hits = 0
            day_map = {}
            for a in my_path:
                sid = a.get('slot_id')
                if sid is not None:
                    ts = timeslots.get(int(sid))
                    if ts: day_map.setdefault(ts.day.upper(), []).append(ts)
            
            for day, day_slots in day_map.items():
                day_slots.sort(key=lambda x: x.start_time)
                
                # GAPS calculation (Excluding natural 12:30 lunch break)
                if len(day_slots) > 1:
                    indices = []
                    for ts in day_slots:
                        t_str = ts.start_time.strftime("%H:%M")
                        if t_str in time_order:
                            indices.append(time_order.index(t_str))
                    if len(indices) > 1:
                        # Gaps are missing slots between classes
                        # But we ignore index 2 (12:30) as it's a standard lunch break
                        should_be = set(range(min(indices), max(indices) + 1))
                        missing = should_be - set(indices)
                        true_gaps = len([m for m in missing if m != 2])
                        path_gaps += true_gaps
                
                # LUNCH & FATIGUE calculation
                for ts in day_slots:
                    start_str = ts.start_time.strftime("%H:%M")
                    if "12:30" in start_str: path_lunch_hits += 1
                    if "16:35" in start_str: path_late_hits += 1
            
            # --- NOUVELLE LOGIQUE DE CALCUL ---
            
            # 1. Lunch Analysis (Détection de Tunnel)
            day_tunnels = 0
            for day, day_slots in day_map.items():
                start_times = [ts.start_time.strftime("%H:%M") for ts in day_slots]
                # Tunnel : 10:35 ET 12:30 ET 14:30 (Pénalité forte mais un peu moins radicale)
                if all(t in start_times for t in ["10:35", "12:30", "14:30"]):
                    day_tunnels += 1
            
            # Réduction des pénalités (10 pts par cours à midi, 20 pts par tunnel)
            l_score = max(0, 100 - (path_lunch_hits * 10) - (day_tunnels * 20))

            # 2. Gaps (Compactness) - PASSAGE À 10 POINTS DE PÉNALITÉ AU LIEU DE 20
            g_score = max(0, 100 - (path_gaps * 10))

            # 3. Fatigue (Late & Saturday)
            f_score = max(0, 100 - (path_late_hits * 10))
            if "SAMEDI" in [d.upper() for d in day_map.keys()]:
                sat_slots = day_map.get("SAMEDI", day_map.get("Samedi", []))
                sat_hours = len(sat_slots)
                f_score = max(0, f_score - (20 + sat_hours * 10))
            
            # 4. Stability (Pedagogy: CM in morning)
            cm_slots = [timeslots.get(int(a['slot_id'])) for a in cm_assigns if a.get('slot_id') is not None]
            total_cms = len(cm_assigns)
            
            total_weighted_stability = 0
            for ts in cm_slots:
                if not ts: continue
                # On normalise l'heure pour éviter les problèmes de secondes
                time_str = ts.start_time.strftime("%H:%M")
                
                if time_str in ["08:30", "10:35"]:
                    total_weighted_stability += 100
                elif time_str in ["12:30", "14:30"]:
                    total_weighted_stability += 60  # Pénalité plus forte (40% de perte)
                else: 
                    # Créneau de 16:35 ou plus tard (Inacceptable pour un CM)
                    total_weighted_stability += 0
            
            s_score = round(total_weighted_stability / total_cms, 1) if total_cms > 0 else 100.0

            group_details["compacite"].append(g_score)
            group_details["pause_dejeuner"].append(l_score)
            group_details["rythme_fatigue"].append(f_score)
            group_details["pedagogie_cm"].append(s_score)
            group_details["path_late_hits_raw"].append(path_late_hits)
            
            # Weighted average: Lunch (35%), Gaps (35%), Fatigue (20%), Stability (10%)
            group_satisfaction.append((g_score * 0.35 + l_score * 0.35 + f_score * 0.2 + s_score * 0.1))

        if not group_satisfaction:
            return {"section": section.name, "score": 0, "status": "Pas de données"}
            
        # Calcul des moyennes par indicateur
        avg_gaps = sum(group_details["compacite"]) / len(group_details["compacite"])
        avg_lunch = sum(group_details["pause_dejeuner"]) / len(group_details["pause_dejeuner"])
        avg_fatigue = sum(group_details["rythme_fatigue"]) / len(group_details["rythme_fatigue"])
        avg_stability = sum(group_details["pedagogie_cm"]) / len(group_details["pedagogie_cm"])
        
        # Le seuil s'applique au score de Pédagogie (Stability)
        total_late_sessions = sum(group_details.get("path_late_hits_raw", [0])) / len(td_group_ids)
        if 30 <= avg_stability < 55 and total_late_sessions <= 3:
            avg_stability = 55.0
            
        # Recalcul du score global pondéré : Lunch (35%), Gaps (35%), Fatigue (20%), Stability (10%)
        avg_score = (avg_gaps * 0.35 + avg_lunch * 0.35 + avg_fatigue * 0.2 + avg_stability * 0.1)

        return {
            "section": section.name,
            "score":  round(avg_score, 1),
            "details": {
                "compacite": round(avg_gaps, 1),
                "pause_dejeuner": round(avg_lunch, 1),
                "rythme_fatigue": round(avg_fatigue, 1),
                "pedagogie_cm": round(avg_stability, 1)
            },
            "status": "Excellent" if avg_score > 85 else "Bon" if avg_score > 70 else "Moyen" if avg_score >= 50 else "Médiocre"
        }
    except Exception as e:
        return {"section": "Erreur", "score": 0, "status": str(e), "details": {}}

@app.post("/assignments/reset")
def reset_assignments(mode: str = None, db: Session = Depends(get_db)):
    """
    Restaure le dernier résultat validé de l'IA dans la table de travail assignments.
    Si 'mode' est fourni (ex: 'ga_sa', 'alns', 'rl'), on restaure ce mode précisément.
    Sinon, on prend le dernier résultat validé (tous modes confondus).
    """
    try:
        query = db.query(models.TimetableResult).filter(models.TimetableResult.is_validated == True)
        
        if mode:
            mode = mode.lower()  # Normalisation : 'GA_SA' -> 'ga_sa'
            res = query.filter(models.TimetableResult.algo_type == mode).order_by(models.TimetableResult.id.desc()).first()
        else:
            res = query.order_by(models.TimetableResult.id.desc()).first()

        if not res:
            raise HTTPException(status_code=404, detail=f"Aucun résultat validé trouvé{' pour le mode ' + mode if mode else ''}.")

        # Réinitialise les affectations actuelles
        all_assignments = db.query(models.Assignment).all()
        for a in all_assignments:
            a.slot_id = None
            a.room_id = None
            a.td_groups = []
        db.flush()

        # Ré-applique les données du résultat IA
        for item in res.data:
            assignment_id = item.get('id')
            if not assignment_id: continue
            db_a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
            if not db_a: continue
            db_a.room_id = item.get('room_id')
            db_a.slot_id = item.get('slot_id')
            db_a.teacher_id = item.get('teacher_id')
            db_a.is_locked = item.get('is_locked', False)
            db_a.section_id = item.get('section_id')
            for g_item in item.get('td_groups', []):
                g_id = g_item['id'] if isinstance(g_item, dict) else g_item
                g_obj = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
                if g_obj:
                    db_a.td_groups.append(g_obj)

        db.commit()
        return {"message": f"Planning '{res.algo_type}' restauré avec succès."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la restauration : {str(e)}")

import subprocess
import os
import sys

@app.post("/run-algorithm/{algo}")
def run_algorithm(algo: str):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    algo = algo.lower()
    
    scripts = {
        "ga_sa": os.path.join(base_dir, "algorithms", "ga_sa_hybrid", "v2", "main_solver.py"),
        "alns": os.path.join(base_dir, "algorithms", "ILS-ALNS", "main_alns.py"),
        "rl": os.path.join(base_dir, "algorithms", "rl_controller", "main_rl.py")
    }
    
    script_path = scripts.get(algo)
    if not script_path or not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail=f"Script introuvable pour {algo}. Cherché à: {script_path}")
        
    try:
        # Lance le script dans un terminal séparé (Visible sous Windows !)
        if os.name == 'nt':
            # Sous Windows, CREATE_NEW_CONSOLE va faire poper (ouvrir) une fenêtre CMD indépendante
            CREATE_NEW_CONSOLE = 0x00000010
            subprocess.Popen([sys.executable, script_path], creationflags=CREATE_NEW_CONSOLE)
            return {"message": f"Terminal Python ouvert pour l'algorithme {algo}.", "logs": "Lancement dans un nouveau terminal en cours..."}
        else:
            subprocess.Popen([sys.executable, script_path])
            return {"message": f"Processus {algo} lancé en arrière-plan.", "logs": "Voir les logs du serveur"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de lancement : {str(e)}")
