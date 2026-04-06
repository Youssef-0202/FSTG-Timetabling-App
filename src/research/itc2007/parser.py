import os
from models import Course, Room, Curriculum, Timeslot

class ITC2007Parser:
    """Parser exact pour les fichiers .ctt de Track 3 (Curriculum-based Course Timetabling)"""
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.name = ""
        self.days = 5
        self.periods_per_day = 6
        
        self.courses = {}    # Dict[str, Course]
        self.rooms = {}      # Dict[str, Room]
        self.curricula = {}  # Dict[str, Curriculum]
        self.slots = []      # List[Timeslot]
        self.unavailabilities = [] # List[(course_id, day, period)]

    def parse(self):
        with open(self.filepath, 'r') as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]
            
        current_section = None
        
        for line in lines:
            if line.startswith("Name:"): self.name = line.split(":")[1].strip()
            elif line.startswith("Courses:"): pass
            elif line.startswith("Rooms:"): pass
            elif line.startswith("Days:"): self.days = int(line.split(":")[1].strip())
            elif line.startswith("Periods_per_day:"): self.periods_per_day = int(line.split(":")[1].strip())
            elif line.startswith("Curricula:"): pass
            elif line.startswith("Constraints:"): pass
            
            elif line == "COURSES:": current_section = "COURSES"
            elif line == "ROOMS:": current_section = "ROOMS"
            elif line == "CURRICULA:": current_section = "CURRICULA"
            elif line == "UNAVAILABILITY_CONSTRAINTS:": current_section = "UNAVAILABILITY"
            elif line == "END.": break
            else:
                if current_section == "COURSES":
                    parts = line.split()
                    if len(parts) >= 5:
                        c_id, t_id, lectures, mwd, stud = parts[0], parts[1], int(parts[2]), int(parts[3]), int(parts[4])
                        self.courses[c_id] = Course(c_id, t_id, lectures, mwd, stud)
                elif current_section == "ROOMS":
                    parts = line.split()
                    if len(parts) >= 2:
                        self.rooms[parts[0]] = Room(parts[0], int(parts[1]))
                elif current_section == "CURRICULA":
                    parts = line.split()
                    if len(parts) >= 3:
                        c_id = parts[0]
                        c_courses = parts[2:]
                        self.curricula[c_id] = Curriculum(c_id, c_courses)
                        # Assigner au cours à quel cursus il appartient
                        for c in c_courses:
                            if c in self.courses:
                                self.courses[c].curriculum_ids.append(c_id)
                elif current_section == "UNAVAILABILITY":
                    parts = line.split()
                    if len(parts) >= 3:
                        self.unavailabilities.append((parts[0], int(parts[1]), int(parts[2])))

        # Création des TimeSlots contigus
        slot_id = 0
        for d in range(self.days):
            for p in range(self.periods_per_day):
                self.slots.append(Timeslot(d, p, slot_id))
                slot_id += 1

        print(f"✅ ITC-2007 [{self.name}] Parsed: {len(self.courses)} Courses | {len(self.rooms)} Rooms | {len(self.curricula)} Curricula | {len(self.slots)} Timeslots")
        
        return self.courses, self.rooms, self.curricula, self.slots, self.unavailabilities
