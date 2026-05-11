# RAZ locale provisoire

Ce document garde la trace du bouton temporaire de remise à zéro ajouté sur le suivi quotidien.

## Objectif

Pendant les tests d'import caisse et facture, des données peuvent être sauvegardées dans le navigateur. Le bouton RAZ permet de repartir sur une base propre sans intervention manuelle dans les outils développeur.

## Fonctionnement

Le bouton est visible dans l'en-tête du suivi quotidien, à côté des actions Importer, PDF et Excel.

Avant toute suppression, une confirmation navigateur est demandée.

La RAZ efface :

- les données métier locales de l'application ;
- l'ancien format de données locales si présent ;
- la configuration 2025 locale ;
- les événements personnalisés locaux ;
- les noms de fournisseurs d'achats modifiés dans la vue Complet.

## Limite

Ce bouton est provisoire. Il sert uniquement pendant la phase de test et devra être retiré ou remplacé par une fonctionnalité d'administration plus encadrée avant usage normal.
