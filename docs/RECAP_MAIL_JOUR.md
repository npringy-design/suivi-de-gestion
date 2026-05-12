# Recap mail journalier

Ce document garde la trace du bouton de preparation du recap chiffre du jour.

## Objectif

Le bouton `Recap mail`, visible dans la saisie journaliere, prepare un texte court a coller dans un mail de cloture.

## Donnees utilisees

Le recap reprend les valeurs calculees de la journee selectionnee :

- colonne 29 : total couverts ;
- colonne 21 : CA HT total jour ;
- colonne 30 : ticket moyen.

## Format copie

Le texte copie dans le presse-papiers suit ce format :

```text
Bonsoir,

Voici les chiffres de la journee :
Couverts : 36
CA : 852.47€ HT
TM : 26.00€
```

## Ligne de conduite

- Le bouton ne modifie aucune donnee metier.
- Il lit uniquement les valeurs deja presentes ou calculees dans le suivi quotidien.
- Si le presse-papiers navigateur refuse l'acces, l'application affiche un message d'erreur non bloquant.
