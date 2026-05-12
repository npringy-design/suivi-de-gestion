# Recap mail journalier

Ce document garde la trace du bouton de preparation du recap chiffre du jour.

## Objectif

Le bouton `Recap mail`, visible dans la saisie journaliere, ouvre une page de verification avant envoi. Cette page permet de relire le mail, de saisir le responsable midi, le responsable soir et un commentaire de journee. La validation copie le texte dans le presse-papiers puis ouvre la messagerie via un lien `mailto:` avec le sujet et le corps pre-remplis.

## Donnees utilisees

Le recap reprend les valeurs calculees de la journee selectionnee :

- colonne 21 : CA HT total jour ;
- colonne 29 : total couverts ;
- colonne 30 : ticket moyen jour ;
- colonnes 18, 25, 26 : realise midi ;
- colonnes 19, 27, 28 : realise soir ;
- colonnes 17, 20, 34, 35 : VAE et limonade ;
- colonnes 0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 14, 15 : budgets de comparaison ;
- colonnes 37 et 38 : evenements restaurant et national.

## Format du mail

Le mail contient :

- une salutation ;
- une synthese journee avec CA HT, couverts, ticket moyen et ecarts VS budget ;
- un detail par service : VAE, midi, soir, limonade ;
- les responsables midi et soir si renseignes ;
- les evenements s'ils sont renseignes, sinon une mention indiquant qu'aucun evenement n'est note.
- le commentaire journee si renseigne.

## Ligne de conduite

- Le bouton ne modifie aucune donnee metier.
- Il lit uniquement les valeurs deja presentes ou calculees dans le suivi quotidien.
- Les champs responsable et commentaire sont des ajouts manuels propres au mail et ne sont pas enregistres dans les donnees metier.
- Le texte est copie avant l'ouverture de la messagerie pour permettre un collage manuel si le client mail ne reprend pas le contenu.
- Si la messagerie ne s'ouvre pas, le message d'etat reste visible dans la page.
