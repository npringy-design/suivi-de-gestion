# Audit patches Vite et plan de consolidation

Derniere mise a jour : 06/06/2026, apres consolidation complete des patches Vite.

## Pourquoi ce document existe

Le projet a longtemps fonctionne avec une partie importante du comportement reel injectee au build via des plugins Vite situes dans `scripts/`.

Ces patches ont permis d'avancer vite sans modifier directement les gros fichiers, notamment `src/Dashboard.tsx`. Le probleme etait qu'ils rendaient le projet fragile :

- le code visible dans les fichiers source ne correspondait pas toujours au code execute apres build ;
- les patches dependaient souvent de chaines exactes ;
- plusieurs patches touchaient la meme zone fonctionnelle ;
- les bugs devenaient difficiles a diagnostiquer, comme l'import personnel historique et la derniere semaine non lue ;
- `Dashboard.tsx` concentre encore trop de logique metier, de rendu, de calculs et d'import.

Conclusion : la consolidation Vite est terminee, mais il ne faut toujours pas refaire l'application. Il faut maintenant poursuivre le decoupage progressif du code source.

## Regle de travail actuelle

- Ne pas ajouter de nouveau patch Vite sauf urgence absolue.
- Faire les corrections directement dans les fichiers source.
- Ne pas faire de refonte globale.
- Ne pas modifier une partie validee sans test terrain.
- Verifier le build Vercel apres chaque modification code importante.
- Documenter chaque changement important.
- Conserver les comportements valides avant toute optimisation.

## Source de verite actuelle

Les patches actifs sont ceux importes et appeles dans `vite.config.ts`.

Etat au 06/06/2026 : aucun patch Vite actif.

`vite.config.ts` est revenu a l'etat attendu :

```ts
plugins: [react(), tailwindcss()]
```

Si un patch Vite reapparait dans `vite.config.ts`, c'est une regression technique sauf decision explicite et documentee.

## Vagues terminees

### Vague 1 — terminee

Patches integres :

- `dashboardVarianceSoftColorsPatch`
- `dashboardHistoricalTextDatePatch`
- `dashboardRealiseTotalsPatch`

Resultat : build/Vercel revenus au vert.

### Vague 2 — terminee

Patches integres :

- `dashboardCostMatterAmountFormatPatch`
- `dashboardStrictSalaryRatesPatch`
- `dashboardThilloisNoLimonadePatch`

Adaptation notable : `dashboardRealiseCleanLayoutPatch` a ete ajuste pendant la vague 2 pour conserver le comportement Thillois sans limonade pendant que ce patch restait actif.

Resultat : Vercel READY.

### Vague 3 — terminee

Patches integres :

- `dashboardAnalysisModePatch`
- `homeSmartPeriodSourcesPatch`
- `payrollCpProvisionPatch`

Resultat : Vercel READY.

### Vague 4 — terminee

Patches integres :

- `dashboardCaisseRecapPeriodePatch`
- `dashboardRealiseCleanLayoutPatch`

Resultat : Vercel READY sur le commit `b00a2d931e176365cfb06ea1a39886e6b680b894` avant mise a jour documentaire.

### Vague 5 — terminee

Patches integres :

- `dashboardLimonadeSplitPatch`
- `dashboardHeaderVisualPatch`

Resultat attendu conserve : la limonade ne doit pas reapparaitre pour Thillois ; le visuel de banderole Dashboard est integre dans le code source.

### Consolidation finale Codex — terminee

Codex a termine l'integration des patches Vite restants et `vite.config.ts` ne reference plus aucun patch.

Patches concernes :

- `dashboardPayrollColumnPatch`
- `caisseImportRecoveryPatch`
- `dashboardHistoricalBudgetExcelPatch`
- `dashboardHistoricalBudgetFocusedPatch`
- `dashboardHistoricalRealiseImportPatch`
- `dashboardHistoricalCostMatterImportPatch`
- `dashboardHistoricalCostMatterSafePatch`
- `dashboardHistoricalPayrollImportPatch`
- `dataContextCloudSyncPatch`
- `homeHeaderPeriodPatch`
- `homePayrollBubblePatch`
- `homeVisualPolishPatch`
- `accountingSettingsRoutePatch`

Resultat : Vercel READY confirme par Nicolas apres execution Codex.

## Dependances importantes encore valables

### Import historique

Les imports budget, realise et cout matiere avaient deja plusieurs validations terrain partielles. Ils doivent etre retestes apres consolidation technique, mais ne doivent pas etre modifies sans nouveau constat precis.

Le personnel historique reste le point fragile : la derniere semaine ne remontait pas correctement dans certaines versions. Il ne faut pas l'integrer ou le corriger aveuglement.

### Accueil

Les comportements lies a la periode, aux KPI et a la bulle S/C doivent etre retestes dans l'application apres consolidation.

### Limonade / vue complete

Thillois n'a pas d'activite limonade. La consolidation ne doit pas reintroduire d'affichage limonade dans la vue complete Thillois.

### Salaires/personnel

Les taux salariaux stricts et la provision CP cadre sont deja des comportements valides. Ne pas les modifier sans demande explicite.

## Prochaine etape concrete

La priorite immediate n'est plus la suppression des patches Vite. Elle devient :

1. Verifier manuellement les zones metier apres consolidation.
2. Puis poursuivre le decoupage progressif de `src/Dashboard.tsx` selon `docs/DASHBOARD_REFACTOR.md`.

## Ce qu'il ne faut pas faire

- Ne pas rajouter de patch Vite pour contourner une difficulte.
- Ne pas refaire `Dashboard.tsx` completement.
- Ne pas melanger nettoyage technique et nouvelle fonctionnalite metier.
- Ne pas integrer le personnel historique tant que le bug de derniere semaine n'est pas compris.
- Ne pas modifier les imports valides pendant une correction personnel.
- Ne pas considerer un build Vercel comme une validation metier suffisante.

## Tests minimum apres consolidation

- Build Vercel OK.
- Accueil OK.
- Saisie quotidienne OK.
- Vue Analyse OK.
- Vue Complete OK.
- Import caisse PDF OK.
- Import historique janvier OK.
- Import historique fevrier OK.
- Import cout matiere historique OK.
- Aucune perte de donnees Supabase.

## Decision actuelle

Priorite immediate : validation metier rapide de l'application apres consolidation Vite, puis reprise du decoupage de `Dashboard.tsx`.

Le bug personnel derniere semaine reste mis de cote. Il sera repris plus tard avec un diagnostic d'import, pas avec un nouveau patch aveugle.
