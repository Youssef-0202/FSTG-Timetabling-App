import sys
import os
# Add path to 'commun'
sys.path.append(os.path.join(os.getcwd(), "algorithms"))
from commun.reporting import HistoryLogger
from commun.models import Schedule
from commun.data_manager import DataManager

print("Testing HistoryLogger...")
dm = DataManager()
dm.fetch_all_data()
dummy_schedule = Schedule(dm, [])
logger = HistoryLogger("test_evolution.csv")
logger.log(1, dummy_schedule, 0.5)
print(f"Log path: {logger.filepath}")
if os.path.exists(logger.filepath):
    print("CSV created successfully!")
else:
    print("CSV NOT created.")
