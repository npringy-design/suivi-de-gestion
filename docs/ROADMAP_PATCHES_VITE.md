# Roadmap — integration des patches Vite

Derniere mise a jour : 06/06/2026, apres vague 11 (finale).

## Etat actuel

**Chantier termine.**

- Toutes les vagues (1 a 11) sont integrees.
- `vite.config.ts` ne contient plus que `react()` et `tailwindcss()` dans `plugins`.
- Vercel READY sur le commit `7f186ed`.
- `scripts/` ne contient plus que `dashboardRefactorStaticCodemod.ts` (codemod ponctuel deja execute, peut etre supprime).

## Historique des vagues terminees

### Vague 1

Patches integres : `dashboardVarianceSoftColorsPatch`, `dashboardHistoricalTextDatePatch`, `dashboardRealiseTotalsPatch`.

### Vague 2

Patches integres : `dashboardCostMatterAmountFormatPatch`, `dashboardStrictSalaryRatesPatch`, `dashboardThilloisNoLimonadePatch`.

Adaptation notable : Codex a aussi adapte `dashboardRealiseCleanLayoutPatch` pour conserver le comportement Thillois sans limonade pendant que ce patch restait actif.

### Vague 3

Patches integres : `dashboardAnalysisModePatch`, `homeSmartPeriodSourcesPatch`, `payrollCpProvisionPatch`.

### Vague 4

Patches integres : `dashboardCaisseRecapPeriodePatch`, `dashboardRealiseCleanLayoutPatch`.

### Vague 5

Patches integres : `dashboardLimonadeSplitPatch`, `dashboardHeaderVisualPatch`.

### Vague 6

Patches integres : `homeVisualPolishPatch`, `homePayrollBubblePatch`, `homeHeaderPeriodPatch`.

### Vague 7

Patches integres : `accountingSettingsRoutePatch`, `dataContextCloudSyncPatch`.

Fichiers touches : `src/router.tsx`, `src/Home.tsx`, `src/contexts/DataContext.tsx`.

### Vague 8

Patches integres : `caisseImportRecoveryPatch`, `dashboardHistoricalCostMatterImportPatch`, `dashboardHistoricalCostMatterSafePatch`.

### Vague 9

Patches integres : `dashboardHistoricalRealiseImportPatch`, `dashboardHistoricalPayrollImportPatch`, `dashboardHistoricalPayrollSafePatch` (script inactif integre directement).

### Vague 10

Patches integres : `dashboardHistoricalBudgetFocusedPatch`, `dashboardHistoricalBudgetExcelPatch`.

### Vague 11 — finale

Patch integre : `dashboardPayrollColumnPatch` (48 remplacements, logique heures/salaires).

Resultat final : `vite.config.ts` propre, Vercel READY.
