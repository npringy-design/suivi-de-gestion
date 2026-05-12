# Recap mail journalier

Ce document garde la trace du bouton de preparation du recap chiffre du jour.

## Objectif

Le bouton `Recap mail`, visible dans la saisie journaliere, ouvre une page de verification avant envoi. Cette page permet de relire le mail, de saisir le responsable midi, le responsable soir, un commentaire midi, un commentaire soir et les notes Google du jour. La validation genere une image PNG propre via canvas, copie cette image dans le presse-papiers puis ouvre Outlook web avec le sujet pre-rempli.

## Donnees utilisees

Le recap reprend les valeurs calculees de la journee selectionnee :

- colonne 21 : CA HT total jour ;
- colonne 29 : total couverts ;
- colonne 30 : ticket moyen jour ;
- colonnes 18, 25, 26 : realise midi ;
- colonnes 19, 27, 28 : realise soir ;
- colonnes 17, 20, 34, 35 : VAE et limonade ;
- colonnes 0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 14, 15 : budgets de comparaison ;
- colonnes 37 et 38 : evenements restaurant et national ;
- saisie manuelle : responsable midi, responsable soir, commentaires midi/soir et notes Google 1 a 5 etoiles.

## Format du mail

Le mail contient :

- une salutation ;
- une section `Midi` avec les chiffres realises, les ecarts vs budget et le commentaire midi si renseigne ;
- une section `Soir` avec les chiffres realises, les ecarts vs budget et le commentaire soir si renseigne ;
- une section `Journee` avec CA HT, couverts, ticket moyen, VAE et limonade si ces elements existent ;
- les ecarts VS budget avec pourcentage sur le CA, les couverts et le ticket moyen ;
- les notes Google uniquement si au moins une case contient un nombre.

## Ligne de conduite

- Le bouton ne modifie aucune donnee metier.
- Il lit uniquement les valeurs deja presentes ou calculees dans le suivi quotidien.
- Les champs responsable et commentaire sont des ajouts manuels propres au mail et ne sont pas enregistres dans les donnees metier.
- Les lignes dont la valeur est a zero, comme limonade ou VAE, ne doivent pas etre ajoutees au mail.
- Outlook web est utilise en priorite via son lien de composition, avec le sujet encode via `encodeURIComponent` pour eviter les `+` visibles.
- Le corps Outlook reste vide volontairement : l'utilisateur colle directement l'image avec `Ctrl+V`, sans devoir faire `Ctrl+A`.
- Le rendu principal est une image PNG generee en canvas, pour eviter les deformations de capture HTML et les bordures parasites.
- L'image est volontairement generee en largeur reduite pour rester proportionnee dans Outlook et contient une marge basse de securite pour eviter les coupes.
- Cette solution preserve les couleurs et les blocs, meme si le texte n'est plus selectionnable dans le mail.
- Si la generation image echoue, l'application copie la version HTML dans le presse-papiers et ouvre Outlook pour collage manuel.
- Si la copie riche echoue aussi, l'application revient au `mailto:` en texte brut pour ne pas bloquer l'envoi.
