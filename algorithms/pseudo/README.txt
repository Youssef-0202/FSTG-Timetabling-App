# 📐 Pseudo-Codes — Projet PFE Timetabling FSTG Marrakech

## Objectif
Ce dossier contient les descriptions algorithmiques formelles (niveau intermédiaire)
de chaque composant clé du système de génération d'emplois du temps.

## Fichiers

| Fichier | Algoritme décrit | Fichier Python source |
|---|---|---|
| `algo1_hybrid_ga_sa.md` | Solveur Hybride Principal GA + SA | `engine.py` |
| `algo2_fitness.md` | Fonction d'Évaluation (Hard + Soft) | `constraints.py` |
| `algo3_data_model.md` | Chargement et Modélisation des Données | `data_manager.py` + `models.py` |

## Convention de Notation

| Symbole | Signification |
|---|---|
| $\mathcal{A}$ | Ensemble de toutes les affectations (séances à placer) |
| $\mathcal{S}$ | Ensemble des sections |
| $\mathcal{T}$ | Ensemble des créneaux horaires (timeslots) |
| $\mathcal{R}$ | Ensemble des salles |
| $s$ | Une solution courante (dictionnaire affectation → créneau+salle) |
| $s^*$ | Meilleure solution trouvée globalement |
| $f_H(s)$ | Score des violations Hard (doit être = 0) |
| $f_S(s)$ | Score des violations Soft (à minimiser) |
| $f(s)$ | Fitness totale = $f_H(s) \times W_H + f_S(s)$ |
| $P$ | Population courante (liste de solutions) |
| $N_p$ | Taille de la population |
| $G_{max}$ | Nombre maximum de générations |
| $T_0$ | Température initiale du Recuit Simulé |
| $\alpha$ | Taux de refroidissement SA ($0 < \alpha < 1$) |
| $p_m$ | Probabilité de mutation |

## Prochaines étapes (après pseudo-codes)
- [ ] Identifier les goulots d'étranglement algorithmiques
- [ ] Proposer des améliorations (opérateurs de mutation, cooling schedule adaptatif...)
- [ ] Rédiger la section "Algorithme" du rapport PFE
