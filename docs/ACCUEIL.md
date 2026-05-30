# Accueil

Ce document fixe les regles actuelles de la page d'accueil.

## Objectif

La page d'accueil sert de porte d'entree rapide vers les modules principaux et affiche les indicateurs de pilotage de la periode selectionnee.

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

## Tuiles et graphiques lies a la periode

Correction du 30/05/2026 : les tuiles principales de l'accueil doivent maintenant suivre la periode selectionnee dans le calendrier.

Regles :

- `CA realise` = cumul du CA realise sur la periode selectionnee ;
- `CA selection` = CA du jour selectionne, ou moyenne journaliere si la periode contient plusieurs jours ;
- `TM selection` = ticket moyen du jour selectionne, ou ticket moyen cumule sur la periode ;
- `Realisation Budget` = CA realise de la periode / budget de la periode ;
- le graphique `Evolution du CA` affiche les jours de la periode selectionnee ;
- la tuile `S/C` suit aussi la periode selectionnee : pour une periode multi-jours, elle affiche le ratio S/C de la periode et un detail debut/fin ; pour un jour seul, elle conserve le recap veille/semaine/mois autour du jour selectionne.

Point important : l'accueil lit les donnees du suivi quotidien deja chargees en memoire. Le mois de debut de periode est charge via la selection active. Si une periode traverse plusieurs mois, les autres mois doivent avoir deja ete charges au moins une fois pour etre totalement pris en compte.

## Meteo

La meteo de l'accueil est libellee `Meteo Thillois` et utilise les coordonnees de Thillois pour l'appel Open-Meteo.

## Ligne de conduite technique

- La selection de periode est appliquee via `scripts/homeHeaderPeriodPatch.ts`, active dans `vite.config.ts`.
- Les KPI, le graphique CA et la tuile S/C lies a la periode sont appliques via `scripts/homePeriodKpiPatch.ts`.
- Ce choix est volontairement cible : la page `src/Home.tsx` possede deja plusieurs ajustements au build et une reecriture directe complete serait plus risquee.
- Ne pas recreer de listes deroulantes mois / annee dans l'entete d'accueil sans besoin metier clair.
- Si les KPI doivent calculer des periodes multi-mois avec chargement automatique de chaque mois Supabase, le faire comme une evolution dediee du DataContext.

## Fichiers concernes

- `src/Home.tsx` : page source modifiee au build ;
- `scripts/homeHeaderPeriodPatch.ts` : patch de l'entete et de la selection de periode ;
- `scripts/homePayrollBubblePatch.ts` : tuile cout salarial de base ;
- `scripts/homePeriodKpiPatch.ts` : recalcul des tuiles et graphiques selon la periode ;
- `vite.config.ts` : activation des patchs.
