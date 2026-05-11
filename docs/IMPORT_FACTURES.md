# Import des factures fournisseurs

Ce document fixe les règles de fonctionnement pour l'import léger des factures fournisseurs.

## Objectif

L'import facture sert à accélérer la saisie des achats en lisant uniquement trois informations :

- le fournisseur ;
- la date de facture ;
- le montant HT.

La facture importée sert de source de lecture. Elle n'est pas conservée par l'application dans cette première version.

## Règles de sauvegarde

- Le fichier PDF importé ne doit pas être sauvegardé dans l'application.
- Le texte complet extrait du PDF ne doit pas être sauvegardé.
- Seules les données validées par l'utilisateur sont enregistrées dans les champs métier.
- La première version ne sauvegarde pas encore de snapshot d'audit facture.
- Si un snapshot facture est ajouté plus tard, il doit rester léger : date d'import, nom du fichier, date de facture, fournisseur, montant HT, colonne cible.

## Différence avec l'import caisse

L'import caisse peut transcrire directement les montants, car la feuille de caisse suit un format connu.

L'import facture doit passer par une validation humaine, car les factures fournisseurs peuvent avoir des formats différents.

Le flux retenu est donc :

1. lecture du fichier ;
2. détection du fournisseur, de la date de facture et du montant HT ;
3. affichage d'une prévisualisation ;
4. correction éventuelle par l'utilisateur ;
5. validation ;
6. ajout du montant dans la colonne fournisseur du jour de facture si cette date appartient au mois affiché, sinon dans le jour sélectionné.

## Ligne de conduite métier

- Ne jamais écraser silencieusement une saisie utilisateur.
- Si une colonne contient déjà un montant pour ce fournisseur, l'import ajoute le nouveau montant au total existant.
- L'utilisateur peut corriger le fournisseur, le montant HT et la colonne cible avant validation.
- L'utilisateur peut corriger la date de facture avant validation.
- Une facture non reconnue doit rester validable manuellement après correction.
- Les noms des fournisseurs d'achats peuvent être modifiés dans la vue Complet. Ces libellés servent à l'affichage et à la sélection de la colonne cible.
- Le fournisseur doit être détecté de façon générique depuis l'identité de l'émetteur de la facture, sans ajouter une exception par fournisseur.
- Pour distinguer l'émetteur du destinataire, la lecture compare d'abord la zone émetteur de la facture et les mentions légales aux noms de fournisseurs configurés dans les colonnes achats.
- Quand plusieurs fournisseurs partagent un mot, par exemple Café Richard et Richard Vins, le rapprochement privilégie le nom complet, le nom collé comme dans un site web/logo, puis seulement les mots isolés.
- Si la date de facture appartient à un autre mois de la même année, l'import écrit dans ce mois et bascule l'affichage sur ce jour.

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
- extraction fournisseur + date facture + montant HT uniquement ;
- prévisualisation avant validation ;
- absence de sauvegarde du fichier importé ;
- ajout du montant validé dans la journée sélectionnée.
