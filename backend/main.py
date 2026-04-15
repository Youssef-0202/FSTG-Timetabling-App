from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
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
def update_assignment(assignment_id: int, data: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    db_a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not db_a:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    
    db_a.module_part_id = data.module_part_id
    db_a.teacher_id = data.teacher_id
    db_a.section_id = data.section_id
    db_a.is_locked = data.is_locked
    db_a.room_id = data.room_id
    db_a.slot_id = data.slot_id

    # Mise à jour des groupes TD
    db_a.td_groups = []
    for g_id in data.tdgroup_ids:
        g = db.query(models.TDGroup).filter(models.TDGroup.id == g_id).first()
        if g:
            db_a.td_groups.append(g)

    db.commit()
    db.refresh(db_a)
    return db_a


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
    db.query(models.Assignment).delete() # On écrase l'ancien planning
    for a in assignments:
        new_a = models.Assignment(
            module_part_id=a.module_part_id,
            teacher_id=a.teacher_id,
            room_id=a.room_id,
            slot_id=a.slot_id
        )
        db.add(new_a)
    db.commit()
    return {"message": "Planning sauvegardé en base de données."}

import os
import json

@app.get("/preview-schedule")
def get_preview_schedule():
    """
    Renvoie le dernier emploi du temps généré par l'IA stocké dans le fichier JSON,
    sans toucher à la base de données SQL.
    """
    file_path = os.path.join(os.path.dirname(__file__), "generated_timetable.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

