# Audit patches Vite et plan de consolidation

Derniere mise a jour : 06/06/2026, apres vague 4.

## Pourquoi ce document existe

Le projet fonctionne, mais une partie importante du comportement reel de l'application a longtemps ete injectee au build via des plugins Vite situes dans `scripts/`.

Ces patches ont permis d'avancer vite sans modifier directement les gros fichiers, notamment `src/Dashboard.tsx`. Le probleme est qu'ils rendent le projet fragile :

- le code visible dans les fichiers source ne correspond pas toujours au code execute apres build ;
- les patches dependent souvent de chaines exactes ;
- plusieurs patches touchent la meme zone fonctionnelle ;
- les bugs deviennent difficiles a diagnostiquer, comme l'import personnel historique et la derniere semaine non lue ;
- `Dashboard.tsx` concentre encore trop de logique metier, de rendu, de calculs et d'import.

Conclusion : il ne faut pas refaire l'application. Il faut consolider progressivement.

## Regle de travail du chantier

- Ne pas faire de refonte globale.
- Ne pas supprimer plusieurs patches sans build entre les etapes.
- Ne pas modifier une partie validee sans test terrain.
- Integrer un patch dans le vrai code source avant de supprimer le script.
- Retirer ensuite l'import et l'appel du patch dans `vite.config.ts`.
- Verifier le build Vercel apres chaque vague.
- Documenter chaque integration importante.
- Conserver les comportements valides avant toute optimisation.

## Source de verite actuelle

Les patches actifs sont ceux importes et appeles dans `vite.config.ts`.

Patches actifs au 06/06/2026 apres vague 4 :

1. `dashboardPayrollColumnPatch`
2. `caisseImportRecoveryPatch`
3. `dashboardLimonadeSplitPatch`
4. `dashboardHistoricalBudgetExcelPatch`
5. `dashboardHistoricalBudgetFocusedPatch`
6. `dashboardHistoricalRealiseImportPatch`
7. `dashboardHistoricalCostMatterImportPatch`
8. `dashboardHistoricalCostMatterSafePatch`
9. `dashboardHistoricalPayrollImportPatch`
10. `dashboardHeaderVisualPatch`
11. `dataContextCloudSyncPatch`
12. `homeHeaderPeriodPatch`
13. `homePayrollBubblePatch`
14. `homeVisualPolishPatch`
15. `accountingSettingsRoutePatch`

Script present mais non actif dans `vite.config.ts` :

- `dashboardHistoricalPayrollSafePatch`

Document de pilotage actif : `docs/ROADMAP_PATCHES_VITE.md`.

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

## Dependances importantes encore valables

### Chaine import historique

Patches encore concernes :

1. `dashboardHistoricalBudgetExcelPatch`
2. `dashboardHistoricalBudgetFocusedPatch`
3. `dashboardHistoricalRealiseImportPatch`
4. `dashboardHistoricalCostMatterImportPatch`
5. `dashboardHistoricalCostMatterSafePatch`
6. `dashboardHistoricalPayrollImportPatch`
7. `dashboardHistoricalPayrollSafePatch` (script non actif mais encore present)

Le personnel est le dernier de la chaine et n'est pas valide terrain. Il ne doit pas bloquer l'integration future des imports valides, mais il ne faut pas l'integrer aveuglement.

### Chaine accueil

Patches encore concernes :

1. `homeHeaderPeriodPatch`
2. `homePayrollBubblePatch`
3. `homeVisualPolishPatch`

`homeSmartPeriodSourcesPatch` a deja ete integre en vague 3.

### Chaine limonade / vue complete

Patches encore concernes :

- `dashboardLimonadeSplitPatch`
- `dashboardHeaderVisualPatch`

`dashboardThilloisNoLimonadePatch` et `dashboardRealiseCleanLayoutPatch` ont deja ete integres. La prochaine intervention sur la limonade doit verifier qu'elle ne reintroduit pas l'affichage limonade pour Thillois.

### Chaine salaires/personnel

Patches encore concernes :

- `dashboardPayrollColumnPatch`
- `homePayrollBubblePatch`
- `dashboardHistoricalPayrollImportPatch`
- `dashboardHistoricalPayrollSafePatch`

`dashboardStrictSalaryRatesPatch` et `payrollCpProvisionPatch` ont deja ete integres.

## Prochaine etape concrete

Reprendre avec `docs/ROADMAP_PATCHES_VITE.md`.

Prochaine vague recommandee : vague 5.

Patches prevus :

- `dashboardLimonadeSplitPatch`
- `dashboardHeaderVisualPatch`

Avant modification :

1. Lire les deux fichiers de patch actuels.
2. Verifier le code actuel de `src/Dashboard.tsx` apres les vagues 1 a 4.
3. Verifier que le comportement Thillois sans limonade reste preserve.
4. Integrer un patch a la fois.
5. Retirer l'import/appel dans `vite.config.ts`.
6. Supprimer le script seulement apres build vert.
7. Mettre a jour `docs/ROADMAP_PATCHES_VITE.md`, `docs/AUDIT_PATCHES_VITE.md` et `docs/POINT_AVANCEMENT.md`.

## Ce qu'il ne faut pas faire

- Ne pas supprimer tous les patches d'un coup.
- Ne pas refaire `Dashboard.tsx` completement.
- Ne pas melanger nettoyage technique et nouvelle fonctionnalite metier.
- Ne pas integrer le personnel historique tant que le bug de derniere semaine n'est pas compris.
- Ne pas modifier les imports valides pendant une correction personnel.
- Ne pas considerer un build Vercel comme une validation metier suffisante.

## Tests minimum apres chaque vague

- Build Vercel OK.
- Accueil OK.
- Saisie quotidienne OK.
- Vue Analyse OK.
- Vue Complete OK.
- Import caisse PDF OK si zone touchee.
- Import historique janvier OK si zone historique touchee.
- Import historique fevrier OK si zone historique touchee.
- Aucune perte de donnees Supabase.

## Decision actuelle

Priorite immediate : poursuivre la consolidation des patches restants selon `docs/ROADMAP_PATCHES_VITE.md`.

Le bug personnel derniere semaine reste mis de cote. Il sera repris plus tard avec un diagnostic d'import, pas avec un nouveau patch aveugle.
