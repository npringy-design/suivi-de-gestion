# Suivi de Gestion

Application React + TypeScript pour le suivi financier et opérationnel d'un restaurant.

## Objectif

Ce projet fournit un tableau de bord métier pour suivre les ventes, les budgets, les salaires, les dépenses et les indicateurs de performance.

## Structure du projet

- `src/main.tsx` : point d'entrée
- `src/App.tsx` : logique de navigation interne et fournisseur de contexte
- `src/contexts/DataContext.tsx` : état global de l'application
- `src/router.tsx` : configuration des routes et chargement paresseux des pages
- `src/types.ts` : définition des types métier
- `src/utils.ts` : fonctions utilitaires partagées
- `src/test/` : tests unitaires et d'intégration

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
npm run test
npm run test:coverage
```

## Qualité

- `tsc --noEmit` : vérifie le typage TypeScript
- `eslint . --ext .ts,.tsx` : vérifie les règles de code React/TypeScript
- `vitest` : exécute les tests unitaires

## Tests

Le projet utilise `vitest` avec l'environnement `happy-dom`.

### Exécuter les tests

```bash
npm run test
```

### Couverture

```bash
npm run test:coverage
```

## CI

Le workflow GitHub Actions exécute automatiquement :
- `npm ci`
- `npm run lint`
- `npm run build`
- `npm run test -- --run`

## Architecture

Voir `ARCHITECTURE.md` pour une description détaillée de l'architecture, du flux de données et des optimisations.

## Documentation métier

- `docs/IMPORT_CAISSE.md` : règles de fonctionnement pour l'import des feuilles de caisse, la sauvegarde des montants et le snapshot d'audit.
- `docs/IMPORT_FACTURES.md` : règles de fonctionnement pour l'import léger des factures fournisseurs.
