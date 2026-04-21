================================================================================
Pseudo-Codes -- Projet PFE Timetabling FSTG Marrakech
================================================================================

Objectif:
Ce dossier contient la description algorithmique formelle de notre moteur hybride 
(niveau intermediaire, ideal pour le rapport PFE). 

Fichiers Actuels:
- algo1_hybrid_ga_sa.txt : Solveur Hybride Principal GA + SA (basé sur engine.py)

--------------------------------------------------------------------------------
Conventions de Notation (Texte Simple)
--------------------------------------------------------------------------------

Symboles principaux:
- A_set        : Ensemble de toutes les affectations (seances a placer)
- Sections     : Ensemble des sections/groupes d'etudiants
- Timeslots    : Ensemble des creneaux horaires
- Rooms        : Ensemble des salles
- Sch          : Un emploi du temps courant (un individu)
- Best_Sch     : Le meilleur emploi du temps trouve globalement
- f_H          : Score des violations Hard (doit etre = 0)
- f_S          : Score des violations Soft (confort, a minimiser)
- Fitness      : Fonction d'evaluation globale calculable par (M * f_H) + f_S
- Population   : Liste des emplois du temps courants
- Pop_size     : Taille maximale de la population
- Max_Gen      : Nombre de generations (iterations du GA)
- T0           : Temperature initiale pour le Recuit Simule
- Alpha        : Taux de refroidissement SA (entre 0 et 1)
- p_mut        : Probabilite de mutation (entre 0 et 1)

--------------------------------------------------------------------------------
Focus du Jour
--------------------------------------------------------------------------------
Comprendre, etudier et eventuellement ameliorer "algo1_hybrid_ga_sa.txt".
