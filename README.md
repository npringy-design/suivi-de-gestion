# Suivi de Gestion

Application React + TypeScript pour le suivi financier et operationnel du restaurant Hippopotamus Thillois.

## Objectif

Ce projet fournit un tableau de bord metier pour suivre les ventes, les budgets, les salaires, les depenses, les imports caisse/factures et les indicateurs de performance.

## Point de reprise

Avant toute modification, lire d'abord :

- `docs/POINT_AVANCEMENT.md`

Ce document indique ce qui est valide, provisoire ou en cours. Il sert de fil conducteur pour reprendre le projet sans casser une partie validee.

## Structure du projet

- `src/main.tsx` : point d'entree React.
- `src/App.tsx` : enveloppe applicative globale.
- `src/router.tsx` : routes React Router v7.
- `src/contexts/DataContext.tsx` : etat global de l'application, cache local et sauvegarde.
- `src/services/supabaseAppState.ts` : sauvegarde centrale Supabase.
- `src/services/supabaseAuth.ts` : authentification et verification des acces Suivi.
- `src/types.ts` : types metier.
- `src/utils.ts` : fonctions utilitaires partagees.
- `src/test/` : tests unitaires et d'integration.

## Variables d'environnement

Variables navigateur actives :

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SITE_ID=hippo_thillois
```

`VITE_SITE_ID` est optionnel et vaut `hippo_thillois` par defaut.

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, l'application reste utilisable avec le cache local, mais affiche une alerte de sauvegarde Supabase non configuree.

Il n'y a pas de cle Gemini/AI Studio injectee cote navigateur.

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

## Qualite

- `npm run lint:ts` : verifie le typage TypeScript.
- `npm run lint:eslint` : verifie les erreurs ESLint React/TypeScript.
- `npm run build` : verifie le build de production.
- `npm run test -- --run` : execute les tests en mode non interactif.

## CI

Le workflow GitHub Actions execute automatiquement :

- `npm ci`
- `npm run lint`
- `npm run build`
- `npm run test -- --run`

## Documentation

- `docs/POINT_AVANCEMENT.md` : etat d'avancement global et ordre de reprise.
- `docs/AUDIT_ET_ROADMAP.md` : roadmap active du refactoring post-audit.
- `docs/ROADMAP_REFACTORING.md` : historique de l'ancienne roadmap de consolidation.
- `docs/SUPABASE_SYNC.md` : sauvegarde Supabase.
- `docs/AUTHENTIFICATION.md` : authentification et gestion utilisateurs.

## Notes de reprise

- Supabase est la sauvegarde centrale ; le localStorage reste un cache technique.
- Le recap mail journalier est valide : ne pas modifier sa mise en forme sans nouvelle demande.
- La RAZ locale est provisoire et sert uniquement pendant la phase de creation/test.
- La roadmap active est `docs/AUDIT_ET_ROADMAP.md`.
