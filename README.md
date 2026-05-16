# Suivi de Gestion

Application React + TypeScript pour le suivi financier et opérationnel d'un restaurant.

## Objectif

Ce projet fournit un tableau de bord métier pour suivre les ventes, les budgets, les salaires, les dépenses et les indicateurs de performance.

## Point de reprise

Avant toute modification, lire d'abord :

- `docs/POINT_AVANCEMENT.md`

Ce document indique ce qui est validé, provisoire ou en cours. Il sert de fil conducteur pour reprendre le projet sans casser une partie validée.

## Structure du projet

- `src/main.tsx` : point d'entrée React.
- `src/App.tsx` : enveloppe applicative globale (`DataProvider`, `RouterProvider`, fallback de chargement).
- `src/router.tsx` : configuration des routes React Router v7 et chargement paresseux des pages.
- `src/contexts/DataContext.tsx` : état global de l'application et persistance locale temporaire.
- `src/types.ts` : définition des types métier.
- `src/utils.ts` : fonctions utilitaires partagées.
- `src/test/` : tests unitaires et d'intégration.

## Documentation métier

- `docs/POINT_AVANCEMENT.md` : état d'avancement global et ordre de reprise.
- `docs/IMPORT_CAISSE.md` : règles de fonctionnement pour l'import des feuilles de caisse.
- `docs/IMPORT_FACTURES.md` : règles de fonctionnement pour l'import léger des factures fournisseurs.
- `docs/RECAP_MAIL_JOUR.md` : règles du récap mail journalier validé.
- `docs/RAZ_LOCALE_PROVISOIRE.md` : bouton temporaire de remise à zéro locale pendant les tests.
- `docs/HEURES_PERSONNEL.md` : saisie des heures, référentiel personnel et import PDF salaires.

## Installation

```bash
npm install
```

## Scripts utiles

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:ts
npm run test
npm run test:coverage
```

## Qualité

- `npm run lint:ts` : vérifie le typage TypeScript.
- `npm run lint:eslint` : vérifie les règles de code React/TypeScript.
- `npm run build` : vérifie le build de production.
- `npm run test -- --run` : exécute les tests en mode non interactif.

Avant livraison d'un changement code, vérifier au minimum :

```bash
npm.cmd run lint:ts
npm.cmd run build
```

## CI

Le workflow GitHub Actions exécute automatiquement :

- `npm ci`
- `npm run lint`
- `npm run build`
- `npm run test -- --run`

## Notes de reprise

- Le récap mail journalier est validé : ne pas modifier sa mise en forme sans nouvelle demande.
- La RAZ locale est provisoire et sert uniquement pendant la phase de création/test.
- La persistance est volontairement locale pour le moment.
- La suite active du travail est la partie personnel, salaires, heures et coût horaire.

## Architecture

Voir `ARCHITECTURE.md` pour une description détaillée de l'architecture, du flux de données et des optimisations.
