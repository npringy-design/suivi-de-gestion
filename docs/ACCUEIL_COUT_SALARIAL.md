# Accueil - tuile cout salarial

Statut : ajoute, a valider en visuel apres redeploiement.

Objectif : afficher sur la page d'accueil un indicateur visible du ratio cout salarial / CA realise, sans ouvrir une page supplementaire.

Affichage :

- vraie tuile visuelle dans le style des cartes de l'accueil ;
- zone gauche : `S/C Veille` et `S/C Mois` ;
- zone droite : detail `S/C Semaine` avec les semaines passees et la semaine en cours ;
- la valeur principale affiche en priorite la semaine en cours, sinon le mois ou la veille ;
- affichage des pourcentages en deux decimales, comme la version complete ;
- affichage des montants de l'accueil avec centimes pour eviter les arrondis non demandes.

Calcul :

- lecture directe du `dashboard` du suivi quotidien en memoire ;
- pas de lecture d'une ancienne ligne recap ou d'une sauvegarde parallele pour les tuiles et graphiques accueil ;
- la tuile `CA realise` additionne les jours depuis les colonnes realisees du suivi quotidien : VAE, midi, soir, limonade ;
- le graphique CA lit aussi les colonnes realisees et budget du suivi quotidien ;
- ratio = cout salarial realise / CA realise ;
- cout salarial = heures realisees personnel * taux horaire issu de la config salaire du mois ;
- aucun taux par defaut ne doit creer artificiellement un cout salarial si la config salaire est vide ;
- la vue accueil suit donc la meme logique de lecture croisee que les vues complete/analyse.

Fichiers :

- logique ajoutee via `scripts/homePayrollBubblePatch.ts` ;
- activation dans `vite.config.ts`.

Limite :

- le calcul depend des heures realisees saisies/importees dans le suivi quotidien. Si aucune heure, aucun taux config ou aucun CA n'est saisi, l'indicateur affiche `-`.
