# Recap mail journalier

Ce document garde la trace du bouton de preparation du recap chiffre du jour.

## Objectif

Le bouton `Recap mail`, visible dans la saisie journaliere, ouvre une page de verification avant envoi. Cette page permet de relire le mail, de saisir le responsable midi, le responsable soir, un commentaire midi, un commentaire soir et les notes Google du jour. La validation copie une version HTML dans le presse-papiers puis ouvre Outlook web avec le sujet et le corps HTML pre-remplis.

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
- saisie manuelle : responsable midi, responsable soir, commentaires midi/soir et notes Google 1 a 5 etoiles.

## Format du mail

Le mail contient :

- une salutation ;
- une section `Midi` avec un bloc `Realise`, un bloc `Ecart vs budget`, puis le commentaire midi si renseigne ;
- une section `Soir` avec un bloc `Realise`, un bloc `Ecart vs budget`, puis le commentaire soir si renseigne ;
- une section `Journee` avec un bloc `Synthese`, un bloc `Ecart vs budget`, VAE et limonade si ces elements existent ;
- les ecarts VS budget quand un budget existe, avec pourcentage sur le CA, les couverts et le ticket moyen, affiches en vert si positif et rouge si negatif dans la version HTML ;
- les evenements uniquement s'ils sont renseignes ;
- les notes Google uniquement si au moins une case contient un nombre.

## Ligne de conduite

- Le bouton ne modifie aucune donnee metier.
- Il lit uniquement les valeurs deja presentes ou calculees dans le suivi quotidien.
- Les champs responsable et commentaire sont des ajouts manuels propres au mail et ne sont pas enregistres dans les donnees metier.
- Les lignes dont la valeur est a zero, comme limonade ou VAE, ne doivent pas etre ajoutees au mail.
- Le recap HTML est copie avant l'ouverture de la messagerie pour permettre un collage manuel avec les couleurs si le client mail ne reprend pas le contenu.
- Outlook web est utilise en priorite via son lien de composition afin de conserver la mise en forme HTML dans le corps du mail.
- Si le lien Outlook web devient trop long, l'application revient au `mailto:` en texte brut pour ne jamais ouvrir un mail vide.
- La version HTML reste copiee dans le presse-papiers : elle peut etre collee dans Outlook pour remplacer le texte brut si le fallback est utilise.
- La version texte doit rester lisible dans Outlook meme si la mise en forme HTML n'est pas reprise : titres de sections, valeurs alignees, et sous-blocs separes.
- Si la messagerie ne s'ouvre pas, le message d'etat reste visible dans la page.
