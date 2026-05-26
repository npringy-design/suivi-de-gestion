# Accueil

Ce document fixe les regles actuelles de la page d'accueil.

## Objectif

La page d'accueil sert de porte d'entree rapide vers les modules principaux et affiche les indicateurs de pilotage du mois selectionne.

## Entete

L'entete doit afficher l'identite du site courant :

- titre principal : `Hippopotamus` ;
- localisation : `Thillois`.

Le visuel general de la banderole est conserve. Les modifications doivent rester ciblees pour ne pas casser le rendu valide de l'accueil.

## Selection de periode

Les anciennes listes deroulantes mois / annee de l'accueil ont ete retirees, car elles n'etaient pas une selection claire pour l'utilisateur.

La selection passe maintenant par la tuile date du jour. Un clic sur cette tuile ouvre une fenetre de selection permettant :

- un jour precis ;
- une periode personnalisee avec date de debut et date de fin ;
- un mois entier ;
- une annee entiere.

Quand une periode est appliquee, le mois et l'annee actifs de l'application sont recalcules depuis la date de debut de la periode. Cela permet de garder les liens existants vers le suivi quotidien, l'EdG mensuel et les autres pages mensuelles sans modifier leur mecanique.

## Meteo

La meteo de l'accueil est libellee `Meteo Thillois` et utilise les coordonnees de Thillois pour l'appel Open-Meteo.

## Ligne de conduite technique

- La modification est appliquee via `scripts/homeHeaderPeriodPatch.ts`, active dans `vite.config.ts`.
- Ce choix est volontairement cible : la page `src/Home.tsx` possede deja plusieurs ajustements au build et une reecriture directe complete serait plus risquee.
- Ne pas recreer de listes deroulantes mois / annee dans l'entete d'accueil sans besoin metier clair.
- Si les KPI doivent un jour calculer une vraie periode personnalisee multi-mois ou annuelle, le faire comme une evolution dediee, sans melanger cette selection visuelle avec les calculs existants.

## Fichiers concernes

- `src/Home.tsx` : page source modifiee au build ;
- `scripts/homeHeaderPeriodPatch.ts` : patch de l'entete et de la selection de periode ;
- `vite.config.ts` : activation du patch.