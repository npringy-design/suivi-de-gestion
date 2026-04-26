# Architecture du projet

## Vue d'ensemble

`suivi-de-gestion` est une application React + TypeScript construite avec Vite.
Elle fournit un tableau de bord métier pour le suivi des chiffres d'affaires, des salaires, des budgets et des dépenses.

## Principales couches

- `src/main.tsx` : point d'entrée de l'application.
- `src/App.tsx` : configuration globale du routage et du contexte.
- `src/router.tsx` : routes React Router v7 avec chargement paresseux (`lazy`) des pages.
- `src/contexts/DataContext.tsx` : fournisseur de données globales et hooks de mise à jour des états métier.
- `src/types.ts` : types de domaine centralisés pour les interfaces métier et les structures de données.
- `src/utils.ts` : utilitaires partagés pour les calculs et le formatage.

## Data flow

1. `DataContext` expose l’état global et les fonctions de mise à jour.
2. Les pages consomment ce contexte via le hook `useData`.
3. Les composants calculent les indicateurs clés dans `useMemo` pour limiter les rerenders.
4. Les actions utilisateur modifient l’état via les mises à jour de contexte.

## Routage

- `src/router.tsx` organise les routes principales et les wrappers de pages.
- Chaque page est chargée dynamiquement avec `lazy`, ce qui permet de réduire le bundle initial.
- Les routes utilisent des validateurs de paramètres simples pour les mois et années.

## Performance

- Le build Vite sépare les dépendances volumineuses dans des chunks manuels (`react-vendor`, `recharts-vendor`, `lucide-vendor`).
- Les calculs complexes sur les données sont mémoïsés dans les composants avec `useMemo`.
- Le routage paresseux permet de ne charger que les pages nécessaires à l’affichage.

## Typage

- `tsconfig.json` active le mode `strict` TypeScript.
- Le projet évite les `any` non typés et utilise des interfaces explicites pour les entités du domaine.
- Les types métier sont centralisés dans `src/types.ts` pour une meilleure cohérence.

## Tests

- La base de tests est située sous `src/test/`.
- Le projet utilise `vitest` avec l’environnement `happy-dom`.
- Les tests couvrent les utilitaires, les types et les helpers de contexte.

## Build et déploiement

- `npm run dev` : démarre le serveur de développement.
- `npm run build` : construit l’application pour la production.
- `npm run preview` : prévisualise le build de production.

## Bonnes pratiques

- Préférer les composants fonctionnels.
- Isoler les calculs coûteux dans `useMemo`.
- Garder les types domaine dans `src/types.ts`.
- Ajouter des tests unitaires pour les fonctions utilitaires importantes.
