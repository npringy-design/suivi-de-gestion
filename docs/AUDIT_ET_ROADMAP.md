# Audit technique et roadmap refactoring â€” suivi-de-gestion

**Date audit** : 07 juin 2026  
**Commit auditÃ©** : `c86ed14`  
**Base auditÃ©e** : 81 fichiers TS/TSX â€” 20 199 lignes de code

Ce document est la roadmap active du chantier de refactoring structurel.

## RÃ¨gle obligatoire de suivi

Ce fichier est temporaire et doit rester une liste d'Ã©tapes restantes, pas un historique.

Ã€ chaque Ã©tape terminÃ©e :

1. retirer l'Ã©tape terminÃ©e de la section **Roadmap active** de ce fichier ;
2. documenter ce qui a rÃ©ellement Ã©tÃ© fait dans `docs/POINT_AVANCEMENT.md` ;
3. crÃ©er ou mettre Ã  jour un document dÃ©diÃ© si l'Ã©tape touche une zone mÃ©tier ou technique sensible ;
4. garder uniquement les Ã©tapes restantes dans ce fichier ;
5. quand toutes les Ã©tapes sont terminÃ©es et documentÃ©es, supprimer `docs/AUDIT_ET_ROADMAP.md` du dÃ©pÃ´t.

Ne pas laisser une Ã©tape marquÃ©e Â« terminÃ©e Â» dans cette roadmap. Une Ã©tape faite doit sortir de la roadmap et entrer dans la documentation stable.

## Ã‰tat solide Ã  prÃ©server

Ne pas casser ni refondre sans raison ces Ã©lÃ©ments dÃ©jÃ  propres :

- `vite.config.ts` : seulement `react()` + `tailwindcss()`, plus aucun plugin patch.
- `DataContext.tsx` : factorisation via `makeDailyChannelUpdater` et helpers `dataContextUpdateHelpers.ts`.
- `src/lib/money.ts` : `parseMoneyValue`, `formatCurrencyFr`, `sanitizeMoneyInput` centralisÃ©s.
- `src/lib/browserStorage.ts` : wrapper propre autour de `localStorage`.
- `src/lib/suiviPermissions.ts` : rÃ´les isolÃ©s et lisibles.
- Canaux de saisie `Sunday`, `Uber`, `Deliveroo`, `ClickCollect`, `AmexAncv`, `CbNepting`, `Especes`, `Conecs` : branchÃ©s sur `CanalSaisie`.
- `CanalSaisie.tsx` : composant gÃ©nÃ©rique validÃ©.
- Routing : `createHashRouter` avec lazy loading.
- Supabase sync : segmentation, banniÃ¨re d'erreur, debounce sauvegarde 900 ms.
- `api/invoice-vision.js` : clÃ© Gemini non exposÃ©e, endpoint dÃ©sactivÃ© en 410.
- `.env.example` et `.gitignore` : variables documentÃ©es, `.env*` exclus.
- Tests existants : base Ã  prÃ©server et complÃ©ter.

## ProblÃ¨mes identifiÃ©s

### Critique

1. `Dashboard.tsx` reste trop gros et dangereux : calculs financiers avec nombreux `parseFloat`, fonctions imbriquees longues, gros `useMemo`.

### Majeur

2. Il reste des `any` Ã  rÃ©duire dans `Dashboard.tsx`.

### Mineur

1. `utils/buildDailyEntries.ts` doit Ãªtre vÃ©rifiÃ© : doublon potentiel avec `getDashboardRowIndices`.
2. `personnelSalaryImport.ts` manque de couverture de tests sur les cas limites.
3. `README.md` doit rester alignÃ© avec l'application rÃ©elle et les variables d'environnement actives.

## Roadmap active

Les Ã©tapes doivent Ãªtre faites dans cet ordre, une par une, avec modification ciblÃ©e et validation avant de passer Ã  la suivante.

### Ã‰tape 7 â€” Migrer les `parseFloat` de `Dashboard.tsx`

**Risque** : Ã©levÃ©  
**Objectif** : Ã©viter les calculs silencieusement faux sur valeurs vides ou formats franÃ§ais.

Actions :

1. Dans `calculatedData`, remplacer progressivement `parseFloat(data[... ] || '0')` par `parseMoneyValue(data[...])`.
2. VÃ©rifier ligne par ligne que les formules attendent bien une valeur monÃ©taire.
3. Ajouter un test dans `dashboardModel.test.ts` sur cellules vides et valeurs avec virgule, par exemple `"1 234,56"`.
4. Comparer les totaux de colonnes et KPI avant/aprÃ¨s sur donnÃ©es rÃ©elles.

Validation : tests OK et totaux identiques.

## Hors scope de cette roadmap

Ã€ ne pas mÃ©langer avec ce chantier :

- DÃ©composition du JSX de `Dashboard.tsx` en sous-composants visuels.
- Migration globale du modÃ¨le de donnÃ©es de `string` vers `number` pour `MonthData`.
- Multi-tenant / multi-restaurant.

Ces sujets doivent avoir une roadmap dÃ©diÃ©e s'ils sont repris plus tard.
