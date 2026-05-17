# Accueil - tuile cout salarial

Statut : ajoute, a valider en visuel apres redeploiement.

Objectif : afficher sur la page d'accueil un indicateur visible du ratio cout salarial / CA realise, sans ouvrir une page supplementaire.

Affichage :

- vraie tuile visuelle dans le style des cartes de l'accueil ;
- zone gauche : `S/C Veille` et `S/C Mois` ;
- zone droite : detail `S/C Semaine` avec les semaines passees et la semaine en cours ;
- la valeur principale affiche en priorite la semaine en cours, sinon le mois ou la veille.

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
