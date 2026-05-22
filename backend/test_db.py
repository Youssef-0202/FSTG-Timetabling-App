import pandas as pd
from sqlalchemy import create_engine
engine = create_engine('postgresql://user_pfe:password_pfe@127.0.0.1:5432/fstm_timetable')
try:
    print(pd.read_sql("SELECT s.name as s_name, t.name as t_name FROM td_groups t JOIN sections s ON t.section_id = s.id WHERE s.name LIKE '%MSD%'", engine))
except Exception as e:
    print(e)
