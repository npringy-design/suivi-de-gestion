# Audit technique et roadmap refactoring — suivi-de-gestion

**Date audit** : 07 juin 2026  
**Commit audité** : `c86ed14`  
**Base auditée** : 81 fichiers TS/TSX — 20 199 lignes de code

Ce document est la roadmap active du chantier de refactoring structurel.

## Règle obligatoire de suivi

Ce fichier est temporaire et doit rester une liste d'étapes restantes, pas un historique.

À chaque étape terminée :

1. retirer l'étape terminée de la section **Roadmap active** de ce fichier ;
2. documenter ce qui a réellement été fait dans `docs/POINT_AVANCEMENT.md` ;
3. créer ou mettre à jour un document dédié si l'étape touche une zone métier ou technique sensible ;
4. garder uniquement les étapes restantes dans ce fichier ;
5. quand toutes les étapes sont terminées et documentées, supprimer `docs/AUDIT_ET_ROADMAP.md` du dépôt.

Ne pas laisser une étape marquée « terminée » dans cette roadmap. Une étape faite doit sortir de la roadmap et entrer dans la documentation stable.

## État solide à préserver

Ne pas casser ni refondre sans raison ces éléments déjà propres :

- `vite.config.ts` : seulement `react()` + `tailwindcss()`, plus aucun plugin patch.
- `DataContext.tsx` : factorisation via `makeDailyChannelUpdater` et helpers `dataContextUpdateHelpers.ts`.
- `src/lib/money.ts` : `parseMoneyValue`, `formatCurrencyFr`, `sanitizeMoneyInput` centralisés.
- `src/lib/browserStorage.ts` : wrapper propre autour de `localStorage`.
- `src/lib/suiviPermissions.ts` : rôles isolés et lisibles.
- Canaux de saisie `Sunday`, `Uber`, `Deliveroo`, `ClickCollect`, `AmexAncv`, `CbNepting`, `Especes`, `Conecs` : branchés sur `CanalSaisie`.
- `CanalSaisie.tsx` : composant générique validé.
- Routing : `createHashRouter` avec lazy loading.
- Supabase sync : segmentation, bannière d'erreur, debounce sauvegarde 900 ms.
- `api/invoice-vision.js` : clé Gemini non exposée, endpoint désactivé en 410.
- `.env.example` et `.gitignore` : variables documentées, `.env*` exclus.
- Tests existants : base à préserver et compléter.

## Problèmes identifiés

### Critique

1. `Dashboard.tsx` reste trop gros et dangereux : calculs financiers avec nombreux `parseFloat`, fonctions imbriquées longues, gros `useMemo`, helpers d'import Excel mélangés au JSX.
2. `Home.tsx` duplique trois parsings monétaires locaux au lieu d'utiliser `parseMoneyValue`.
3. `selectedYear` est figé à `2026` dans `DataContext.tsx`.
4. `AncvPapiers.tsx` et `BilanSynthese.tsx` réimplémentent localement `CurrencyInput`.

### Majeur

1. `better-sqlite3`, `express`, `dotenv` sont en `dependencies` alors qu'ils ne sont pas importés depuis `src/`.
2. `scripts/dashboardRefactorStaticCodemod.ts` est du code mort.
3. `HomeWithAdminLink.tsx` est un wrapper devenu inutile autour de `Home`.
4. Il reste des `any` à réduire dans `DashboardAnalysisView.tsx`, `Dashboard.tsx`, `DepensesPetiteCaisse.tsx`, `RemiseTR.tsx`.
5. `supabaseAuth.ts` utilise encore directement `window.localStorage` au lieu de `browserStorage`.

### Mineur

1. `utils/buildDailyEntries.ts` doit être vérifié : doublon potentiel avec `getDashboardRowIndices`.
2. `personnelSalaryImport.ts` manque de couverture de tests sur les cas limites.
3. `README.md` doit rester aligné avec l'application réelle et les variables d'environnement actives.

## Roadmap active

Les étapes doivent être faites dans cet ordre, une par une, avec modification ciblée et validation avant de passer à la suivante.

### Étape 1 — Nettoyage repo et année courante

**Risque** : nul  
**Objectif** : supprimer le code mort et corriger les métadonnées.

Actions :

1. Supprimer `scripts/dashboardRefactorStaticCodemod.ts` et le dossier `scripts/` si vide.
2. Déplacer `better-sqlite3`, `express`, `dotenv` de `dependencies` vers `devDependencies`, ou les supprimer s'ils ne sont utilisés par aucun script npm.
3. Vérifier et compléter `README.md` : app réelle, pas de référence AI Studio/Gemini client-side, variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_ID`.
4. Corriger `selectedYear` initial dans `DataContext.tsx` : `useState(() => new Date().getFullYear())`.

Validation : `npm install`, `npm run lint:ts`, `npm run build`, Vercel READY.

### Étape 2 — Unifier `CurrencyInput`

**Risque** : faible  
**Objectif** : avoir un seul composant `CurrencyInput` partagé.

Actions :

1. Créer `src/components/CurrencyInput.tsx` depuis le composant de `CanalSaisie.tsx`.
2. Remplacer les `CurrencyInput` locaux dans `AncvPapiers.tsx` et `BilanSynthese.tsx`.
3. Mettre à jour `CanalSaisie.tsx` pour importer le composant partagé.

Validation : comportement visuel identique sur les trois écrans.

### Étape 3 — Fusionner `HomeWithAdminLink` dans `Home`

**Risque** : faible  
**Objectif** : supprimer la couche wrapper inutile.

Actions :

1. Copier dans `Home.tsx` la vérification d'accès admin actuellement portée par `HomeWithAdminLink.tsx`.
2. Ajouter directement le bouton `Utilisateurs` conditionnel dans `Home.tsx`.
3. Mettre à jour `router.tsx` pour charger `Home` directement.
4. Supprimer `HomeWithAdminLink.tsx`.

Validation : bouton `Utilisateurs` toujours visible pour les admins, absent pour les utilisateurs standards.

### Étape 4 — Corriger `supabaseAuth.ts` et réduire les `any`

**Risque** : faible  
**Objectif** : cohérence des patterns et typage plus sûr.

Actions :

1. Remplacer les accès `window.localStorage` de `supabaseAuth.ts` par les helpers de `src/lib/browserStorage.ts`.
2. Typer les itérations de `DepensesPetiteCaisse.tsx` avec `AchatEntry` et `AlimentationEntry`.
3. Remplacer `Array<any>` dans `DashboardAnalysisView.tsx` par le bon type, probablement `DashboardRow[]`.
4. Typer `renderBrandTable` et les `.map((row: any, ...))` dans `RemiseTR.tsx`.

Validation : `npm run lint:ts` sans nouvelle erreur.

### Étape 5 — Migrer les parsings monétaires de `Home.tsx`

**Risque** : moyen  
**Objectif** : utiliser une seule fonction de parsing monétaire.

Actions :

1. Supprimer les trois lambdas locales de parsing monétaire dans `Home.tsx`.
2. Remplacer par `parseMoneyValue` importé depuis `@/lib/money`.
3. Supprimer la fonction locale `n()` si elle duplique `parseMoneyValue`.
4. Comparer les KPI avant/après sur un mois avec données réelles.

Validation : KPI Home identiques avant/après.

### Étape 6 — Extraire les helpers d'import Excel de `Dashboard.tsx`

**Risque** : moyen-élevé  
**Objectif** : isoler la logique d'import et alléger `Dashboard.tsx`.

Actions :

1. Créer `src/features/dashboard/importHelpers/historicalBudgetImport.ts` pour les helpers `parseHistoricalBudget*`, `getHistoricalBudget*`, `rowHasHistorical*`, `normalizeHistorical*`, `findHistorical*`.
2. Créer `src/features/dashboard/importHelpers/caisseImport.ts` pour `findCaisseAmounts`, `findCaisseAmount`, `findCaisseTheoriqueAmount`, `extractCaisseNumbers`, `findCaisseTtcByRate`.
3. Créer `src/features/dashboard/importHelpers/payrollImport.ts` pour `parseHistoricalPayroll*`, `findHistoricalPayroll*`, `getHistoricalPayroll*`, `sumHistoricalPayroll*`, `historicalPayrollHourToDecimal`.
4. Mettre à jour les imports dans `Dashboard.tsx` sans changer la logique métier.

Validation : import budget historique, caisse et paie toujours fonctionnels.

### Étape 7 — Migrer les `parseFloat` de `Dashboard.tsx`

**Risque** : élevé  
**Objectif** : éviter les calculs silencieusement faux sur valeurs vides ou formats français.

Actions :

1. Dans `calculatedData`, remplacer progressivement `parseFloat(data[... ] || '0')` par `parseMoneyValue(data[...])`.
2. Vérifier ligne par ligne que les formules attendent bien une valeur monétaire.
3. Ajouter un test dans `dashboardModel.test.ts` sur cellules vides et valeurs avec virgule, par exemple `"1 234,56"`.
4. Comparer les totaux de colonnes et KPI avant/après sur données réelles.

Validation : tests OK et totaux identiques.

## Hors scope de cette roadmap

À ne pas mélanger avec ce chantier :

- Décomposition du JSX de `Dashboard.tsx` en sous-composants visuels.
- Migration globale du modèle de données de `string` vers `number` pour `MonthData`.
- Multi-tenant / multi-restaurant.

Ces sujets doivent avoir une roadmap dédiée s'ils sont repris plus tard.
