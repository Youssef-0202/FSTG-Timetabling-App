from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text('SELECT name FROM filieres')).fetchall()
    for row in res:
        print(row[0])
