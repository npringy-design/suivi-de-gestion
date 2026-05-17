# Accueil - infobulle cout salarial

Statut : ajoute, a valider en visuel apres redeploiement.

Objectif : afficher sur la page d'accueil un indicateur compact du ratio cout salarial / CA realise.

Affichage :

- bouton compact `S/C Cout salarial` sur l'accueil ;
- valeur principale : semaine en cours si disponible, sinon mois ou veille ;
- au clic : detail veille, semaine en cours, semaines passees et mois en cours.

Calcul :

- ratio = cout salarial realise / CA realise ;
- CA realise lu dans le suivi quotidien : VAE, midi, soir, limonade ;
- cout salarial reconstruit depuis les heures realisees par statut/section et les taux horaires du snapshot salaires ;
- fallback sur les taux par defaut si aucun snapshot salaires n'est disponible ;
- lecture des nouvelles colonnes realisees et fallback sur les anciennes colonnes pour eviter de perdre les donnees deja saisies.

Fichiers :

- logique ajoutee via `scripts/homePayrollBubblePatch.ts` ;
- activation dans `vite.config.ts`.

Limite :

- le calcul depend des heures realisees saisies/importees dans le suivi quotidien. Si aucune heure ou aucun CA n'est saisi, l'indicateur affiche `-`.
