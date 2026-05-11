# Import des factures fournisseurs

Ce document fixe les règles de fonctionnement pour l'import léger des factures fournisseurs.

## Objectif

L'import facture sert à accélérer la saisie des achats en lisant uniquement deux informations :

- le fournisseur ;
- le montant HT.

La facture importée sert de source de lecture. Elle n'est pas conservée par l'application dans cette première version.

## Règles de sauvegarde

- Le fichier PDF importé ne doit pas être sauvegardé dans l'application.
- Le texte complet extrait du PDF ne doit pas être sauvegardé.
- Seules les données validées par l'utilisateur sont enregistrées dans les champs métier.
- La première version ne sauvegarde pas encore de snapshot d'audit facture.
- Si un snapshot facture est ajouté plus tard, il doit rester léger : date d'import, nom du fichier, fournisseur, montant HT, colonne cible.

## Différence avec l'import caisse

L'import caisse peut transcrire directement les montants, car la feuille de caisse suit un format connu.

L'import facture doit passer par une validation humaine, car les factures fournisseurs peuvent avoir des formats différents.

Le flux retenu est donc :

1. lecture du fichier ;
2. détection du fournisseur et du montant HT ;
3. affichage d'une prévisualisation ;
4. correction éventuelle par l'utilisateur ;
5. validation ;
6. ajout du montant dans la colonne fournisseur du jour sélectionné.

## Ligne de conduite métier

- Ne jamais écraser silencieusement une saisie utilisateur.
- Si une colonne contient déjà un montant pour ce fournisseur, l'import ajoute le nouveau montant au total existant.
- L'utilisateur peut corriger le fournisseur, le montant HT et la colonne cible avant validation.
- Une facture non reconnue doit rester validable manuellement après correction.
- Les noms des fournisseurs d'achats peuvent être modifiés dans la vue Complet. Ces libellés servent à l'affichage et à la sélection de la colonne cible.

## Fournisseurs ciblés dans la saisie journalière

La première version cible les colonnes d'achats de la saisie journalière :

- C10 ;
- Richard Vins ;
- Café Richard ;
- Storia ;
- Brake ;
- Pomona F&L ;
- Socopa ;
- Episaveur ;
- Mammafiore ;
- Compagnie des Desserts ;
- Distripate ;
- Metro / Dépannage ;
- Domafrais ;
- Martel.

## Décision actuelle

Pour les factures fournisseurs, la règle retenue est :

- lecture du PDF à la demande ;
- extraction fournisseur + montant HT uniquement ;
- prévisualisation avant validation ;
- absence de sauvegarde du fichier importé ;
- ajout du montant validé dans la journée sélectionnée.
