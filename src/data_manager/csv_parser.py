from typing import Dict, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Room, Teacher, StudentGroup, Module, Timeslot

class DataParser:
    """
    Simule la lecture d'une base de données ou de fichiers CSV/Excel fournis par la FSTM.
    À utiliser lorsque la FSTM vous fournira les vrais fichiers pour l'application Web.
    """
    
    def __init__(self, data_folder_path: str):
        self.data_folder = data_folder_path
        
    def load_all_data(self) -> Tuple[Dict[str, Module], Dict[str, Room], Dict[str, Teacher], Dict[str, StudentGroup], Dict[int, Timeslot]]:
        """
        Fonction maîtresse qui appellera le chargement de toutes les tables / fichiers.
        """
        rooms = self.parse_rooms("rooms.csv")
        teachers = self.parse_teachers("teachers.csv")
        groups = self.parse_groups("groups.csv")
        modules = self.parse_modules("modules.csv")
        slots = self._generate_standard_slots()  # Les créneaux universitaires (souvent fixes)
        
        return modules, rooms, teachers, groups, slots

    def parse_rooms(self, filename: str) -> Dict[str, Room]:
        # À implémenter : lire le fichier (ex: pd.read_csv) et instancier les objets Room
        # Exemple: yield Room(id=row['ID'], capacity=row['Capacite']...)
        return {}
        
    def parse_teachers(self, filename: str) -> Dict[str, Teacher]:
        # À implémenter : lire les dispos/préférences des professeurs
        return {}
        
    def parse_groups(self, filename: str) -> Dict[str, StudentGroup]:
        # À implémenter : lire les effectifs des groupes d'étudiants FSTM
        return {}
        
    def parse_modules(self, filename: str) -> Dict[str, Module]:
        # À implémenter : la liste complète des cours par semestre
        return {}
        
    def _generate_standard_slots(self) -> Dict[int, Timeslot]:
        # Généralement la FSTM fonctionne de 8h à 18h avec quelques variations.
        return {}
