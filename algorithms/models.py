import random

class Room:
    def __init__(self, id, name, capacity, type):
        self.id = id
        self.name = name
        self.capacity = capacity
        self.type = type

class Teacher:
    def __init__(self, id, name, email=None, forbidden_slots=None):
        self.id = id
        self.name = name
        self.forbidden_slots = forbidden_slots or []


class Timeslot:
    def __init__(self, id, day, start_time, end_time):
        self.id = id
        self.day = day
        self.start_time = start_time
        self.end_time = end_time

class Section:
    def __init__(self, id, name, student_count, parent_id=None):
        self.id = id
        self.name = name
        self.student_count = student_count
        self.parent_id = parent_id

class ModulePart:
    def __init__(self, id, module_id, teacher_id, section_id, type, group_size):
        self.id = id
        self.module_id = module_id
        self.teacher_id = teacher_id
        self.section_id = section_id
        self.type = type
        self.group_size = group_size


class Assignment:
    def __init__(self,module_part,room,timeslot) :
        self.module_part = module_part  # The session (links to teacher, section, etc.)
        self.room = room                # The chosen room
        self.timeslot= timeslot          # The chosen slot

class Schedule :
    def __init__(self, data_manager, assignments=None):
        self.data_manager = data_manager
        self.assignments = assignments or []
        self.fitness = 0.0
        
    def copy(self):
        """Crée une copie profonde manuelle pour éviter les conflits de mémoire"""
        new_assignments = []
        for a in self.assignments:
            # On crée un NOUVEL objet Assignment avec les mêmes attributs
            new_as = Assignment(a.module_part, a.room, a.timeslot)
            new_assignments.append(new_as)
            
        new_sched = Schedule(self.data_manager, new_assignments)
        new_sched.fitness = self.fitness
        return new_sched
    def __str__(self):
        return f"Schedule: {len(self.assignments)} assignments, Fitness: {self.fitness}"

