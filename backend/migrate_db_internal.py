from sqlalchemy import create_engine, text
import os

# Dans le conteneur, l'host est 'db'
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@db:5432/fstm_timetable"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE timetable_results ADD COLUMN name VARCHAR;"))
        conn.commit()
        print("Success: Column 'name' added to 'timetable_results'.")
    except Exception as e:
        if "already exists" in str(e):
            print("Notice: Column 'name' already exists.")
        else:
            print(f"Error: {e}")
