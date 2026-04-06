"""
populate_from_pdf.py
====================
Source unique de vérité : SQUELETTE DE DONNÉES (S2 + S4 - TOTAL COMPLET)
Inclut les 3 sections S2 et les 7 sections S4 (GB, GEG, MSD, GC, GESE, GI, GP).
"""
import models
from database import SessionLocal, engine
from datetime import time
from sqlalchemy.orm import Session

def run_import():
    models.Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    print("🧹 Reset total...")
    db.query(models.GroupeModule).delete()
    db.execute(models.assignment_tdgroups.delete())
    db.query(models.Assignment).delete()
    db.execute(models.section_groupes.delete())
    db.execute(models.groupe_module_groupes.delete())
    db.query(models.TDGroup).delete()
    db.query(models.Section).delete()
    db.query(models.ModulePart).delete()
    db.query(models.Module).delete()
    db.query(models.GroupeFiliere).delete()
    db.query(models.Filiere).delete()
    db.query(models.Department).delete()
    db.query(models.Teacher).delete()
    db.query(models.Room).delete()
    db.query(models.Timeslot).delete()
    db.commit()

    prof = models.Teacher(name="PROFESSEUR À DÉFINIR", email="inconnu@fstm.ac.ma", availabilities={})
    db.add(prof); db.flush()

    days = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]
    periods = [(time(8, 30), time(10, 25)), (time(10, 35), time(12, 30)), (time(14, 30), time(16, 25)), (time(16, 35), time(18, 30))]
    for day in days:
        for start, end in periods:
            db.add(models.Timeslot(day=day, start_time=start, end_time=end))

    # Salles (S2 + S4)
    rooms_list = ["Amphi 1", "Amphi 2", "Amphi 3", "Amphi 4", "Salle 16", "Salle 19", "Salle 23", "Salle 24", "Salle 25", "Salle 26", "Salle 27", "Salle 28", "Salle 29", "Salle 30", "Salle multimédia", "S6"]
    for r_name in rooms_list:
        db.add(models.Room(name=r_name, capacity=0, type="AMPHI" if "Amphi" in r_name else "SALLE_TD"))

    depts = {n: models.Department(name=n) for n in ["Biologie", "Géologie", "Informatique", "Physique", "Chimie", "Langues", "Mathématiques"]}
    for d in depts.values(): db.add(d); db.flush()

    fil_names = ["GB", "GEG", "MSD", "GC", "GESE", "GI", "GP"]
    fil_objs = {}
    for fn in fil_names:
        d = depts["Biologie"] if fn=="GB" else depts["Géologie"] if fn in ["GEG","GC"] else depts["Mathématiques"] if fn=="MSD" else depts["Physique"] if fn in ["GP","GESE"] else depts["Informatique"]
        f = models.Filiere(name=fn, type="TC", dept_id=d.id)
        db.add(f); db.flush(); fil_objs[fn] = f

    cohortes_s2 = {fn: models.GroupeFiliere(filiere_id=fil_objs[fn].id, semestre="S2", academic_year="2025-2026", total_students=0) for fn in fil_names}
    cohortes_s4 = {fn: models.GroupeFiliere(filiere_id=fil_objs[fn].id, semestre="S4", academic_year="2025-2026", total_students=0) for fn in fil_names}
    for c in list(cohortes_s2.values()) + list(cohortes_s4.values()): db.add(c); db.flush()

    # Sections S2 et S4 (Désormais 10 sections au total)
    sections_def = [
        ("GB-GEG S2", "S2", ["GB", "GEG"]), ("MSD-GC-GESE S2", "S2", ["MSD", "GC", "GESE"]), ("GP-GI S2", "S2", ["GP", "GI"]),
        ("GI S4", "S4", ["GI"]), ("GP S4", "S4", ["GP"]), ("GC S4", "S4", ["GC"]), ("GESE S4", "S4", ["GESE"]), 
        ("MSD S4", "S4", ["MSD"]), ("GB S4", "S4", ["GB"]), ("GEG S4", "S4", ["GEG"])
    ]
    for sname, sem, flist in sections_def:
        sec = models.Section(name=sname, semestre=sem, total_capacity=0)
        db.add(sec); db.flush()
        c_dict = cohortes_s2 if sem=="S2" else cohortes_s4
        sec.groupes = [c_dict[f] for f in flist]
        for i in range(1, 7 if sem=="S2" else 3):
            db.add(models.TDGroup(name=f"{sname} Gr {i}", section_id=sec.id, size=0))

    # Modules Catalogue Total (S2 + S4)
    mod_list = [
        # S2
        "Biologie Animale et Végétale", "Thermodynamique & Mec. du Fluide", "Géodynamique externe", "Réactivité Chimique",
        "Langue Etrangère 2", "Culture digitale", "Bases de Données", "Analyse 2", "Algèbre 2",
        "Mecanique du point / Optique", "Structure de la matière", "Circuits électriques et électronique", "Electricité",
        # S4 Commun
        "Analyse Numérique", "Structure des Données", "LTC2 Français", "Développement Personnel", 
        "Systèmes d'Information et Bases de Données", "Analyse 4", "Analyse de Données",
        # S4 Spécifique
        "Recherche Opérationnelle", "Programmation Web", "Optique Physique", "Mécanique des Fluides et Transfert Thermique",
        "Chimie Minérale 2", "Thermodynamique Chimique et Cinétique", "Chimie Organique 2", "Éléments de Génie Chimique",
        "Electrotechnique", "Automatique", "Métrologie Capteurs", "Inférence Statistique et Applications", "Modèles de Régression Linéaire",
        "Biologie Moléculaire et Génétique", "Méthodes d'analyse", "Biochimie Métabolique et Enzymologie", "Physiologie Animale et Végétale",
        "Géologie Structurale", "Méthodes d'analyse chimique et biologique", "Géomatique", "Pétrographie et Minéralogie"
    ]
    
    for i, name in enumerate(mod_list):
        d = depts["Biologie"] if any(k in name for k in ["Biologie", "Physiologie", "Biochimie"]) else depts["Géologie"] if any(k in name for k in ["Géologie", "Géodynamique", "Minéralogie", "Géomatique"]) else depts["Mathématiques"] if any(k in name for k in ["Analyse", "Algèbre", "Statistique", "Régression"]) else depts["Informatique"] if any(k in name for k in ["Données", "Données", "Web", "Culture", "Bases"]) else depts["Physique"] if any(k in name for k in ["Physique", "Electricité", "Fluides", "Métrologie", "Electrotechnique", "Automatique"]) else depts["Chimie"] if any(k in name for k in ["Chimie", "Réactivité", "Chimique"]) else depts["Langues"]
        m = models.Module(name=name, code=f"MOD-{i+1:03d}", dept_id=d.id)
        db.add(m); db.flush()
        for t in ["CM", "TD"]:
            db.add(models.ModulePart(module_id=m.id, type=t, weekly_hours=0, required_room_type="AMPHI" if t=="CM" else "SALLE_TD"))
        db.add(models.GroupeModule(module_id=m.id, effectif=0))

    db.commit(); db.close()
    print("✅ BASE COMPLÈTE (S2 + S4 - 10 SECTIONS) IMPORTÉE. Tout est à 0.")

if __name__ == "__main__":
    run_import()
