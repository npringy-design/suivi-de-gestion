# Synthese CA

Ce document fixe la mecanique actuelle de la page d'accueil `Synthese CA Comptable`.

## Objectif

La page Synthese CA sert de menu d'entree vers les pages de saisie et de controle liees au chiffre d'affaires comptable :

- saisie du theorique feuille de caisse ;
- CB Nepting ;
- especes ;
- Conecs ;
- ANCV ;
- tickets restaurants ;
- Sunday ;
- Uber ;
- Deliveroo ;
- click and collect ;
- bilan synthese ;
- depenses petite caisse.

## Selection du mois

Le comportement valide est le suivant :

- quand l'utilisateur arrive sur `/synthese` depuis une autre zone de l'application, la liste se positionne sur le mois courant ;
- quand l'utilisateur choisit un autre mois dans la liste deroulante, la route devient `/synthese/:month` ;
- tant que l'utilisateur navigue entre Synthese CA et ses sous-pages, le mois selectionne doit etre conserve ;
- le retour depuis une sous-page comme `Especes`, `CB`, `Bilan Synthese`, etc. doit revenir vers `/synthese/:month` avec le meme mois ;
- quitter totalement la zone Synthese CA puis revenir par `/synthese` remet le mois courant.

## Ligne de conduite technique

- Ne pas remettre de valeur par defaut fixe a mars.
- La source du maintien temporaire du mois est l'URL `/synthese/:month`, pas un localStorage.
- Les sous-pages continuent de recevoir le mois via leur parametre de route existant.

## Fichiers concernes

- `src/router.tsx` : fallback mois courant et maintien du mois via `/synthese/:month` ;
- `src/SyntheseCA.tsx` : selection controlee par `initialMonth` et notification du changement via `onMonthChange`.