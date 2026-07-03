# Instructions Claude Code — suivi-de-gestion

## Avant toute intervention

1. Lire `docs/POINT_AVANCEMENT.md` — état du projet et règles actives.
2. Résumer en une phrase ce que tu vas faire.
3. N'intervenir que sur les fichiers nécessaires à la tâche demandée.

---

## Règles de code (non négociables)

### TypeScript
- `tsc --noEmit` doit passer sans erreur après chaque modification.
- Zéro `any` explicite. Utiliser les types existants dans `src/types/dataTypes.ts`.
- Les nouveaux types métier vont dans `src/types/dataTypes.ts`, pas dans les composants.

### Valeurs monétaires
- Stocker en `number`, jamais en `string`.
- Parser à l'entrée avec `parseMoneyValue()` depuis `@/lib/money`.
- Afficher avec `formatEuro()` ou `formatEuroSymbol()` depuis `@/lib/formatters`.
- Ne jamais écrire `parseFloat()` pour une valeur monétaire.

### Utilitaires partagés — toujours importer, jamais redéfinir localement
- Formatage nombres/euros : `@/lib/formatters`
- Noms de mois : `@/lib/constants`
- Parsing monétaire : `@/lib/money`
- Permissions : `@/lib/suiviPermissions`
- Storage local : `@/lib/browserStorage`

### Structure des fichiers
- Logique métier pure (calculs, transformations) → fichier `.ts` dans `features/<domaine>/`
- Hooks React → `features/<domaine>/hooks/use*.ts`
- Sous-composants JSX > 50 lignes → `features/<domaine>/components/`
- Types → `src/types/dataTypes.ts`
- Constantes partagées → `src/lib/constants.ts`

### Anti-gonflement du code
- **Factoriser au moment où on touche, jamais en chantier isolé.** Les duplications connues (`VsBudget.tsx`/`VsN1.tsx` ~80 % identiques, flux d'import budget/V25 dans `useDashboardImportHandlers.ts`) se fusionnent le jour où une évolution les concerne — pas avant.
- **Toute nouvelle page suit un modèle existant.** Nouveau canal de caisse → fiche de config ~40 lignes sur `CanalSaisie` (voir `Sunday.tsx`), jamais un copier-coller de page complète. Nouvelle vue de comparaison EDG → c'est le déclencheur pour créer le composant commun avec `VsBudget`/`VsN1`.
- **Seuil d'alerte : ~500 lignes.** Si un fichier dépasse ce seuil lors d'une modification, extraire hooks/composants/helpers dans le même commit (modèle : `features/dashboard/hooks/` et `components/`).
- **Ne pas compresser le code métier.** `dashboardCalculations.ts` et les parseurs d'import sont volontairement explicites et défensifs : la réduction de lignes n'y est pas un objectif.

### Sauvegarde cloud (DataContext)
- La sync Supabase ne pousse que les **snapshots marqués modifiés** (`dirtyMonthKeysRef` par mois, `dirtySegmentsRef` pour config2025/customEvents/personnelInfos).
- **Piège** : toute nouvelle donnée persistée doit passer par `updateDataForYear(month, ...)` (qui marque le mois modifié) ou marquer son segment dirty — sinon elle sera sauvée en localStorage mais **jamais poussée vers Supabase**.
- Ne jamais réintroduire une sauvegarde de l'état complet : c'est ce qui permettait à un poste d'écraser les saisies d'un autre (appli multi-utilisateurs, bientôt multi-site).

### Import V25
Import V25 : colonnes source hardcodées (budget cols 8/9/10/11, réalisé cols 20/23/27/29/42/44, coût matière cols 67-79). Ne pas utiliser `getHistoricalCostMatterColumnMap` pour le V25 — mapping fixe dans `V25_COST_MATTER_MAP`.

### Règle Dashboard
`Dashboard.tsx` est un orchestrateur. Il ne contient que :
- Appels aux hooks `useDashboard*`
- `useMemo` appelant des fonctions de `dashboardCalculations.ts`
- JSX de haut niveau via sous-composants

Toute nouvelle logique métier dashboard → `dashboardCalculations.ts` ou nouveau hook.
Toute nouvelle colonne/groupe → `dashboardColumns.ts` ou `dashboardStaticConfig.ts`.
Tout nouveau bloc JSX > 50 lignes → nouveau composant dans `features/dashboard/components/`.
Voir `src/features/dashboard/ARCHITECTURE.md`.

---

## Règles de documentation

- Une tâche terminée → une ligne dans `docs/POINT_AVANCEMENT.md`.
- Format : `"[sujet] : [ce qui a été fait]. tsc OK."`
- Supprimer toute section de doc qui ne décrit que de l'historique sans valeur de référence.
- Ne pas créer de fichier de doc temporaire pour une tâche simple.
- Les fichiers `docs/` permanents décrivent comment l'appli fonctionne, pas l'historique des chantiers.

---

## Règles de commit

- Un commit par tâche cohérente.
- Message court : `"feat: ..."`, `"fix: ..."`, `"refactor: ..."`, `"docs: ..."`.
- Vérifier `tsc --noEmit` avant chaque commit.

---

## Ce qu'il ne faut jamais faire

- Créer une fonction locale qui existe déjà dans `src/lib/`.
- Stocker une valeur monétaire en `string`.
- Ajouter du code directement dans `Dashboard.tsx` sans passer par un hook ou sous-composant.
- Désactiver une règle ESLint sans justification dans le commit.
- Laisser du `console.log` en dehors des fichiers de test.
- Modifier la logique métier (formules, calculs) sans que ce soit explicitement demandé.
- Créer un fichier de patch ou codemod au lieu de modifier le source directement.
