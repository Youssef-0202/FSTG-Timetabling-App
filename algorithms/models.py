import random

class Assignment:
    def __init__(self,module_part,room,timeslot) :
        self.module_part = module_part  # The session (links to teacher, section, etc.)
        self.room = room                # The chosen room
        self.timeslot= timeslot          # The chosen slot

class Schedule :
    def __init__(self,data_manager):
        self.data_manager = data_manager
        self.Assignments = []
        self.fitness =0.0

    def initialize_random(self):
        """Creates a random solution """
        self.assignments = []
        for mp in self.data_manager.module_parts:
            random_room = random.choice(self.data_manager.rooms)
            random_slot = random.choice(self.data_manager.timeslots)
            
            new_assignment = Assignment(mp, random_room, random_slot)
            self.assignments.append(new_assignment)
    
    def __str__(self):
        return f"Schedule: {len(self.assignments)} assignments, Fitness: {self.fitness}"

if __name__ == "__main__":
        from data_manager import DataManager
        dm = DataManager()
        if dm.fetch_all_data():
            sch = Schedule(dm)
            sch.initialize_random()
            print(sch)
