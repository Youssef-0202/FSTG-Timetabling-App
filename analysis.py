import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "algorithms"))
from commun.data_manager import DataManager

def run_analysis():
    dm = DataManager()
    if not dm.fetch_all_data():
        print("Failed to fetch")
        return
        
    slots_mon_fri = len([t for t in dm.timeslots if t.day != "SAMEDI"])
    amphis = [r for r in dm.rooms if r.type == "AMPHI"]
    cm_mps = [m for m in dm.module_parts if m.type == "CM"]
    
    with open("analysis_results.txt", "w", encoding="utf-8") as f:
        f.write(f"MON-FRI Slots: {slots_mon_fri}\n")
        f.write(f"Total AMPHI slots/week: {len(amphis) * slots_mon_fri}\n")
        f.write(f"Total CMs required: {len(cm_mps)}\n\n")
        
        group_loads = {g: 0 for g in dm.group_map.keys()}
        for mp in dm.module_parts:
            for g in mp.td_group_ids:
                group_loads[g] += 1
                
        f.write("-- Heaviest Groups --\n")
        for g, load in sorted(group_loads.items(), key=lambda x: -x[1])[:5]:
            f.write(f"Group {dm.group_map[g]} (ID {g}): {load} classes\n")
            
        # Count overlapping CMs for GEG / GB / etc (H13/H14 check)
        section_cms = {}
        for s in dm.sections:
            section_cms[s['id']] = 0
            
        for mp in cm_mps:
            if mp.section_id:
                section_cms[mp.section_id] += 1
                
        f.write("\n-- Section CM Counts --\n")
        for sid, count in sorted(section_cms.items(), key=lambda x: -x[1])[:5]:
            f.write(f"Section {dm.sec_id_to_name.get(sid, sid)}: {count} CMs\n")

if __name__ == "__main__":
    run_analysis()
