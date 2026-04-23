# ==============================================================================
# engine.py — Moteur Algorithmique Hybride GA + SA
# 
# Role        : Contient TOUTE la logique mathematique de l algorithme.
#               Il sait COMMENT faire evoluer une population.
#               Il ne decide NI quand s arreter NI comment charger les donnees.
# Dependances : models.py (Schedule, Assignment) | constraints.py (calculate_fitness_full)
# Appele par  : main_solver.py
# ==============================================================================

import random
import copy
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from commun.models import Schedule, Assignment
from commun.constraints import calculate_fitness_full


class HybridEngine:
    """
    Moteur principal de l algorithme Hybride GA+SA (Memetique).
    Chaque individu de la population est un emploi du temps complet (Schedule).
    """

    # SECTION A : INITIALISATION & PARAMETRES
    # ========================================

    def __init__(self, data_manager, 
                 pop_size=30, 
                 constraints_mask=None,
                 mutation_rate=0.15,
                 elitism=2,
                 sa_iterations=400,
                 sa_temp=50.0,
                 sa_cooling=0.95):
        """
        Initialise le moteur avec les donnees et les parametres de l algorithme.

        Params:
            data_manager      -- Objet DataManager contenant salles, profs, creneaux
            pop_size          -- Nombre d individus (chromosomes) dans la population
            constraints_mask  -- Dictionnaire pour activer/desactiver chaque contrainte
            mutation_rate     -- Probabilite de mutation (0.0 a 1.0)
            elitism           -- Nombre d individus a conserver intacts
            sa_iterations     -- Budget d iterations pour la recherche locale (L_max)
            sa_temp           -- Temperature de depart pour SA (T0)
            sa_cooling        -- Coefficient de refroidissement (Alpha)
        """
        # ── Donnees ──
        self.dm = data_manager

        # ── GA Parameters ──
        self.pop_size      = pop_size
        self.mutation_rate = mutation_rate
        self.elitism       = elitism

        # ── SA Parameters (Recuit Simule Local) ──
        self.sa_iterations = sa_iterations
        self.sa_temp       = sa_temp
        self.sa_cooling    = sa_cooling

        # ── Masque des contraintes actives ──
        self.constraints_mask = constraints_mask or {
            "H1": True, "H2": True, "H3": True, "H4": True,
            "S_MIXING": True, "S_CM_DISPERSION": True, "S_GAPS": True
        }

    
    # SECTION B : SCORING
    # ==========================================================================

    def get_score(self, schedule):
        """Calculates scalar score for comparison (Total Penalty)"""
        score, h, s, details = calculate_fitness_full(schedule, mask=self.constraints_mask)
        return score

    
    # SECTION C : INITIALISATION DE LA POPULATION
    # ==========================================================================

    def create_initial_population(self):
        """
        Cree la premiere generation d emplois du temps COMPLETEMENT ALEATOIRES.

        - self.population est REMIS A ZERO a chaque appel (permet les multi-runs).
        - Les seances "lockees" (is_locked=True) gardent leur salle/creneau fixes.
        - Toutes les autres seances recoivent une salle ET un creneau aleatoires.
        """
        self.population = []  # Reset : efface l ancienne population
        for _ in range(self.pop_size):
            assignments = []
            for mp in self.dm.module_parts:
                if mp.is_locked and mp.fixed_room_id and mp.fixed_slot_id:
                    # Seance fixe : prendre la salle et le creneau definis
                    room = next((r for r in self.dm.rooms if r.id == mp.fixed_room_id), random.choice(self.dm.rooms))
                    slot = next((s for s in self.dm.timeslots if s.id == mp.fixed_slot_id), random.choice(self.dm.timeslots))
                else:
                    # Seance libre : salle et creneau aleatoires
                    room = random.choice(self.dm.rooms)
                    slot = random.choice(self.dm.timeslots)
                assignments.append(Assignment(mp, room, slot))

            sch = Schedule(self.dm, assignments)
            self.population.append(sch)

   
    # SECTION D : EVOLUTION (UNE GENERATION GA COMPLETE)
    # ==========================================================================

    def evolve(self):
        """
        Execute UNE generation complete de l algorithme Genetique.

        Etapes :
            1. Trier la population par score 
            2. Copier les E meilleurs sans modification (Elitisme)
            3. Boucler jusqu a Pop_size individus :
               a. TournamentSelect x2  → choisir Parent_1 et Parent_2
               b. UniformCrossover     → creer un Enfant
               c. Mutate               → modifier aleatoirement un gene de l Enfant
               d. SA Local Search      → polir intensivement l Enfant (400 iterations SA)
               e. Ajouter l Enfant a la nouvelle generation
            4. Remplacer l ancienne population par la nouvelle
            5. Trier la nouvelle population -> population[0] = meilleur de la gen)
        """
        # 1. Trier par fitness (ascending : meilleur score en [0])
        self.population.sort(key=lambda x: self.get_score(x))

        # 2. Elitisme : conserver les E meilleurs directement
        new_gen = self.population[:self.elitism]

        # 3. Produire les (Pop_size - E) autres individus
        while len(new_gen) < self.pop_size:

            # a. Selection par Tournoi : choisir les 2 parents
            p1 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: self.get_score(x))
            p2 = min(random.sample(self.population, min(5, len(self.population))), key=lambda x: self.get_score(x))

            # b. Croisement Uniforme : creer un Enfant
            child = self.crossover(p1, p2)

            # c. Mutation (Exploration) : 15% de chance
            if random.random() < self.mutation_rate:
                self.mutate(child)

            # d. Recherche Locale SA : Exploitation intensive sur l Enfant
            child = self.simulated_annealing_search(child)

            new_gen.append(child)

        # 4 & 5. Remplacer et retrier la population
        self.population = new_gen
        self.population.sort(key=lambda x: self.get_score(x))


    # SECTION E : OPERATEURS GENETIQUES
    # ==========================================================================

    def crossover(self, p1, p2):
        """
        Croisement Uniforme (Uniform Crossover) entre deux parents.

        Pour chaque gene (seance) :
            - 50% de probabilite : prendre le gene de Parent_1
            - 50% de probabilite : prendre le gene de Parent_2

        Returns: Schedule -- un nouvel individu avec les genes melanges
        """
        new_assignments = []
        for i in range(len(p1.assignments)):
            parent = p1 if random.random() < 0.5 else p2
            orig = parent.assignments[i]
            new_assignments.append(Assignment(orig.module_part, orig.room, orig.timeslot))
        return Schedule(self.dm, new_assignments)

    def mutate(self, schedule):
        """
        Mutation : Modifier aleatoirement UN gene d un individu.

        Cible uniquement les seances NON-LOCKEES (is_locked = False).
        Assigne une salle ET un creneau completement aleatoires a la seance cible.

        But : Apporter de la diversite genetique et eviter les optima locaux.
        """
        if not schedule.assignments:
            return
        unlocked_indices = [i for i, a in enumerate(schedule.assignments) if not a.module_part.is_locked]
        if not unlocked_indices:
            return
        idx = random.choice(unlocked_indices)
        schedule.assignments[idx].room     = random.choice(self.dm.rooms)
        schedule.assignments[idx].timeslot = random.choice(self.dm.timeslots)

    
    # SECTION F : RECHERCHE LOCALE (RECUIT SIMULE LOCAL - SA)
    # ==========================================================================

    def simulated_annealing_search(self, schedule):
        """
        Recherche Locale par Recuit Simule (SA) sur un individu.

        Applique L_max=400 iterations de perturbations sur l individu recu.
        A chaque iteration, un des 3 mouvements de voisinage est choisi :
            MOVE 1 (r < 0.33) : ShiftBoth  — changer salle ET creneau d une seance
            MOVE 2 (r < 0.66) : SwapTime   — echanger les creneaux de 2 seances
            MOVE 3 (sinon)    : ShiftRoom  — changer seulement la salle d une seance
        une recherche locale par recuit simulé avec un schéma de refroidissement géométrique continu
        et un arrêt par budget d'itérations

        Critere d acceptation de Metropolis :
            - Accepter si Delta < 0   (le voisin est meilleur)
            - Accepter si Random < exp(-Delta / T)  (accepte parfois un moins bon)
            → Cette acceptation probabiliste permet d eviter les optima locaux.

        Returns: Schedule -- le meilleur individu trouve parmi toutes les iterations
        """
        current_sch = schedule
        current_fit = self.get_score(current_sch)
        best_sch    = current_sch
        best_fit    = current_fit
        temp        = self.sa_temp  # T = T0

        for _ in range(self.sa_iterations):
            neighbor = schedule.copy()
            r = random.random()

            unlocked_indices = [i for i, a in enumerate(neighbor.assignments) if not a.module_part.is_locked]
            if not unlocked_indices:
                break

            if r < 0.33:
                # MOVE 1 : Shift Both (salle + creneau)
                idx = random.choice(unlocked_indices)
                neighbor.assignments[idx].room     = random.choice(self.dm.rooms)
                neighbor.assignments[idx].timeslot = random.choice(self.dm.timeslots)

            elif r < 0.66:
                # MOVE 2 : Swap Timeslots (echanger 2 seances)
                if len(unlocked_indices) >= 2:
                    idx1, idx2 = random.sample(unlocked_indices, 2)
                    neighbor.assignments[idx1].timeslot, neighbor.assignments[idx2].timeslot = \
                        neighbor.assignments[idx2].timeslot, neighbor.assignments[idx1].timeslot

            else:
                # MOVE 3 : Shift Room Only (changer seulement la salle)
                idx = random.choice(unlocked_indices)
                neighbor.assignments[idx].room = random.choice(self.dm.rooms)

            neighbor_fit = self.get_score(neighbor)
            delta        = neighbor_fit - current_fit

            # Critere d acceptation de Metropolis
            if delta < 0 or (temp > 0 and random.random() < math.exp(-delta / temp)):
                current_sch = neighbor
                current_fit = neighbor_fit
                if current_fit < best_fit:
                    best_sch = neighbor
                    best_fit = neighbor_fit

            temp *= self.sa_cooling  # Refroidissement : T = T * Alpha | refroidissement géométrique continu

        return best_sch
