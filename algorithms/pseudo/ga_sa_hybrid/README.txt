================================================================================
DOSSIER : ga_sa_hybrid
Description : Documentation et reformatage clair de l'algorithme Hybride GA+SA
================================================================================

Ce dossier contient la version documentee et reformatee des deux fichiers
complementaires qui forment ensemble l'algorithme GA+SA :

FICHIER 1 : main_solver_doc.txt
   Role    : "Le Chef d'Orchestre"
   Source  : algorithms/main_solver.py
   Contenu : - Definition de tous les parametres de configuration
             - Flux general de l'algorithme (etape par etape)
             - Critere d'arret (Early Stopping)
             - Export du resultat final en JSON

FICHIER 2 : engine_doc.txt
   Role    : "Le Moteur Algorithmique"
   Source  : algorithms/engine.py
   Contenu : - Definition de toutes les methodes GA et SA
             - Croisement (Crossover)
             - Mutation
             - Recuit Simule local (SA Local Search)
             - Scoring et evaluation

SEPARATION DES RESPONSABILITES :
   main_solver.py  --[APPELLE]-->  engine.py
      (QUAND et COMBIEN)           (COMMENT)

================================================================================
