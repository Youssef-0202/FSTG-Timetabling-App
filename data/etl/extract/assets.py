import sys
import os
import polars as pl
from dagster import asset, AssetExecutionContext
from sqlalchemy import create_engine

# Configuration
DB_URL = "postgresql://user_pfe:password_pfe@localhost:5432/fstm_timetable"

def get_extract_path():
    """Retourne le chemin vers le dossier actuel (data/Etl/extract)."""
    return os.path.dirname(os.path.abspath(__file__))

def get_base_project_path():
    """Retourne la racine du projet (_Project_PFE)."""
    # On remonte de 3 niveaux : extract -> Etl -> data -> _Project_PFE
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

@asset(group_name="extraction")
def database_raw_export(context: AssetExecutionContext):
    """EXTRACTION : Donnees manuelles de PostgreSQL."""
    engine = create_engine(DB_URL)
    save_dir = get_extract_path()
    
    tables = ["professors", "modules", "sections", "departments"]
    for table in tables:
        try:
            df = pl.read_database(f"SELECT * FROM {table}", connection=engine)
            df.write_csv(os.path.join(save_dir, f"manual_{table}.csv"))
            context.log.info(f"Table {table} extraite avec succes.")
        except Exception as e:
            context.log.warning(f"Erreur extraction {table}: {e}")
    return save_dir

@asset(group_name="extraction")
def raw_excel_assignments(context: AssetExecutionContext):
    """EXTRACTION : Excel officiel des affectations."""
    base_dir = get_base_project_path()
    excel_path = os.path.join(base_dir, "data", "Modules-Enseignants_Emploi.xlsx")
    
    df = pl.read_excel(excel_path)
    filiere_cols = ['GP', 'GI', 'MSD', 'GES', 'GC', 'GB', 'GEG']
    results = []
    for row in df.to_dicts():
        mod = row.get('INTITULE DES MODULES')
        if mod and row.get('Nom'):
            active_filieres = [col for col in filiere_cols if str(row.get(col, '')).upper() == 'X']
            for fil in active_filieres:
                results.append({
                    "section": fil, 
                    "semester": str(row.get('SEMESTRE', 'S2')),
                    "module": str(mod), 
                    "teacher": f"{row.get('Nom')} {row.get('Prénom')}"
                })
    return results

@asset(group_name="extraction")
def master_assignments_file(context: AssetExecutionContext, raw_excel_assignments: list):
    """Fichier CSV final des affectations extraites."""
    save_dir = get_extract_path()
    path = os.path.join(save_dir, "master_assignments.csv")
    pl.DataFrame(raw_excel_assignments).write_csv(path)
    return path

@asset(group_name="extraction")
def master_rooms_file(context: AssetExecutionContext):
    """EXTRACTION : Fusion et nettoyage des salles (Excel + CSV)."""
    base_dir = get_base_project_path()
    ex_path = os.path.join(base_dir, "data", "occupation_locaux_printemps_25-26.xlsx")
    csv_path = os.path.join(base_dir, "data", "salles.csv")

    df_ex = pl.read_excel(ex_path).rename({
        pl.read_excel(ex_path).columns[4]: "name", 
        pl.read_excel(ex_path).columns[5]: "capacity"
    }).select(["name", "capacity"]).with_columns(pl.col("name").str.replace_all(" ", "").alias("jk"))

    df_csv = pl.read_csv(csv_path, separator=';', encoding='latin1').rename({
        pl.read_csv(csv_path, separator=';', encoding='latin1').columns[0]: "sc", 
        pl.read_csv(csv_path, separator=';', encoding='latin1').columns[3]: "tr",
        pl.read_csv(csv_path, separator=';', encoding='latin1').columns[2]: "cap"
    }).with_columns(pl.col("sc").str.replace_all(" ", "").alias("jk"))

    res = df_ex.join(df_csv, on="jk", how="outer").with_columns([
        pl.col("name").fill_null(pl.col("sc")),
        pl.col("capacity").fill_null(pl.col("cap")),
        pl.when(pl.col("tr").str.to_lowercase().str.contains("amphi")).then(pl.lit("AMPHI")).otherwise(pl.lit("SALLE")).alias("type")
    ]).filter(pl.col("name").is_not_null()).select(["name", "capacity", "type"])
    
    save_dir = get_extract_path()
    path = os.path.join(save_dir, "master_rooms.csv")
    res.write_csv(path)
    return path
