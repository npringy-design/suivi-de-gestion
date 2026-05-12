# Import des factures fournisseurs

Ce document fixe les regles de fonctionnement pour l'import leger des factures fournisseurs.

## Objectif

L'import facture sert a accelerer la saisie des achats en lisant uniquement trois informations :

- le fournisseur ;
- la date de facture ;
- le montant HT.

La facture importee sert de source de lecture. Elle n'est pas conservee par l'application dans cette version.

## Regles de sauvegarde

- Le fichier PDF importe ne doit pas etre sauvegarde dans l'application.
- Le texte complet extrait du PDF ne doit pas etre sauvegarde.
- Seules les donnees validees par l'utilisateur sont enregistrees dans les champs metier.
- La premiere version ne sauvegarde pas encore de snapshot d'audit facture.
- Si un snapshot facture est ajoute plus tard, il doit rester leger : date d'import, nom du fichier, date de facture, fournisseur, montant HT, colonne cible.

## Difference avec l'import caisse

L'import caisse peut transcrire directement les montants, car la feuille de caisse suit un format connu.

L'import facture doit passer par une validation humaine, car les factures fournisseurs peuvent avoir des formats differents.

Le flux retenu est donc :

1. lecture locale du ou des fichiers ;
2. extraction rapide du texte PDF quand il existe ;
3. detection du fournisseur, de la date de facture et du montant HT ;
4. affichage des factures sous forme de lignes ;
5. indicateur vert si les trois elements sont lus, indicateur orange si une verification humaine est necessaire ;
6. correction eventuelle par l'utilisateur ;
7. validation ligne par ligne ;
8. ajout du montant dans la colonne fournisseur du jour de facture si cette date appartient au mois affiche, sinon dans le jour selectionne.

L'OCR automatique est desactive pour les factures fournisseurs, car il ralentit trop l'import en lot et reste imparfait sur les scans froisses, tournes ou de mauvaise qualite. Quand le PDF ne contient pas assez de texte exploitable, l'application cree une ligne orange a verifier et essaie seulement de deduire la date ou le fournisseur depuis le nom du fichier.

## IA et securite

La lecture IA Gemini Vision est desactivee pour l'import facture. Le navigateur n'appelle plus `/api/invoice-vision`, afin d'eviter des couts pour une lecture qui n'est pas assez fiable sur les cas reels testes : scans DSAC, tickets Metro froisses et documents retournes.

La route serveur existe encore mais repond volontairement que la lecture IA est desactivee. Elle ne doit pas appeler Gemini tant que la decision metier n'est pas changee.

## Ligne de conduite metier

- Ne jamais ecraser silencieusement une saisie utilisateur.
- Si une colonne contient deja un montant pour ce fournisseur, l'import ajoute le nouveau montant au total existant.
- L'utilisateur peut corriger le fournisseur, le montant HT, la date de facture et la colonne cible avant validation.
- Une facture non reconnue doit rester validable manuellement apres correction.
- Les noms des fournisseurs d'achats peuvent etre modifies dans la vue Complet. Ces libelles servent a l'affichage et a la selection de la colonne cible.
- Le fournisseur doit etre detecte de facon generique depuis l'identite de l'emetteur de la facture, sans ajouter une exception par fournisseur.
- Pour distinguer l'emetteur du destinataire, la lecture compare d'abord la zone emetteur de la facture et les mentions legales aux noms de fournisseurs configures dans les colonnes achats.
- Quand plusieurs fournisseurs partagent un mot, par exemple Cafe Richard et Richard Vins, le rapprochement privilegie le nom complet, le nom colle comme dans un site web/logo, puis seulement les mots isoles.
- Les fournisseurs a un seul mot, par exemple Brake, Storia ou Martel, doivent pouvoir matcher avec un seul token complet. Aucun fournisseur ne doit etre choisi silencieusement par defaut si aucune preuve n'est trouvee.
- Si la date de facture appartient a un autre mois de la meme annee, l'import ecrit dans ce mois et bascule l'affichage sur ce jour.

## Fournisseurs cibles dans la saisie journaliere

La premiere version cible les colonnes d'achats de la saisie journaliere :

- C10 ;
- Richard Vins ;
- Cafe Richard ;
- Storia ;
- Brake ;
- Pomona F&L ;
- Socopa ;
- Episaveur ;
- Mammafiore ;
- Compagnie des Desserts ;
- Distripate ;
- Metro / Depannage ;
- Domafrais ;
- Martel.

## Decision actuelle

Pour les factures fournisseurs, la regle retenue est :

- lecture locale du PDF a la demande ;
- import possible de plusieurs factures en une fois ;
- extraction fournisseur + date facture + montant HT uniquement ;
- affichage en lignes avec statut vert ou orange ;
- validation individuelle de chaque facture ;
- absence de sauvegarde du fichier importe ;
- ajout du montant valide dans la journee de la facture.
