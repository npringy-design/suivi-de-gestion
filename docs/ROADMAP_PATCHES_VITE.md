# Roadmap active — consolidation Vite

Derniere mise a jour : 06/06/2026, apres consolidation complete des patches Vite.

## Etat actuel

- Derniere etape terminee : integration de tous les patches Vite actifs dans le code source.
- Etat verifie : `vite.config.ts` ne contient plus que `react()` et `tailwindcss()` dans `plugins`.
- Patches Vite encore actifs dans `vite.config.ts` : 0.
- Vercel : READY confirme par Nicolas apres execution Codex.
- Objectif initial atteint : le comportement reel de l'application ne depend plus de plugins Vite temporaires.

## Regles de reprise apres consolidation

1. Ne plus ajouter de nouveau patch Vite sauf urgence absolue.
2. Toute nouvelle correction doit se faire directement dans le code source concerne.
3. Continuer a preserver l'existant et les perimetres valides.
4. Pour les zones sensibles, garder une modification ciblee puis verifier le build.
5. Le build Vercel ne remplace pas les tests metier terrain.
6. Documenter les changements importants dans `docs/`.

## Situation technique actuelle

`vite.config.ts` doit rester dans cet etat :

```ts
plugins: [react(), tailwindcss()]
```

Si un patch Vite reapparait dans `vite.config.ts`, le considerer comme une regression technique sauf justification explicite.

## Patches Vite actifs

Aucun patch Vite actif.

## Scripts de patch

Les anciens scripts de patch ne doivent plus etre appeles par `vite.config.ts`.

Point a surveiller : le script `dashboardHistoricalPayrollSafePatch` etait historiquement present mais non actif. Il ne doit pas etre reactive sans diagnostic metier complet du chantier personnel historique.

## Historique des vagues terminees

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

Resultat attendu conserve : la structure limonade historique est integree dans le code source sans reintroduire l'affichage limonade pour Thillois. Le visuel de banderole Dashboard est integre directement dans `src/Dashboard.tsx`.

### Vague 6 et suivantes — terminees par consolidation globale Codex

Codex a termine l'integration des patches restants et nettoye `vite.config.ts`.

Patches concernes :

- `homeHeaderPeriodPatch`
- `homePayrollBubblePatch`
- `homeVisualPolishPatch`
- `accountingSettingsRoutePatch`
- `dataContextCloudSyncPatch`
- `caisseImportRecoveryPatch`
- `dashboardHistoricalCostMatterImportPatch`
- `dashboardHistoricalCostMatterSafePatch`
- `dashboardHistoricalRealiseImportPatch`
- `dashboardHistoricalPayrollImportPatch`
- `dashboardHistoricalBudgetFocusedPatch`
- `dashboardHistoricalBudgetExcelPatch`
- `dashboardPayrollColumnPatch`

Resultat : `vite.config.ts` ne reference plus aucun patch Vite.

## Tests minimum a refaire cote application

La consolidation technique est terminee, mais les tests metier restent indispensables :

- Accueil : periode, tuiles, bulle S/C, visuel.
- Saisie quotidienne : saisie, fermeture jour, sections Personnel/Achats, validations caisse.
- Vue Analyse : entetes figees, couleurs, lecture S/C.
- Vue Complete : Previsions et Realise, sans limonade visible pour Thillois.
- Import caisse PDF : montants HT TVA 5,5 %, 10 % et 20 % dans le bloc Total.
- Import historique Excel : budget janvier/fevrier, realise, cout matiere.
- Supabase : chargement, sauvegarde, refresh, changement de mois.

## Points de vigilance restants

### Personnel historique

Le personnel historique n'est pas valide terrain. La derniere semaine ne remontait pas correctement dans certaines versions.

Ne pas reprendre ce sujet avec un patch aveugle. La prochaine reprise doit passer par un diagnostic visible :

- ligne source trouvee ;
- bloc personnel detecte ;
- colonnes detectees ;
- heures lues ;
- distinction format global / format detaille.

### `Dashboard.tsx`

Le fichier reste lourd. La priorite suivante n'est plus l'integration des patches Vite, mais le decoupage progressif de `Dashboard.tsx` en modules plus simples.

Ordre recommande :

1. Extraire helpers/formatters deja identifies.
2. Extraire composants visuels simples.
3. Extraire calculs metier par domaine.
4. Extraire imports PDF/Excel.
5. Transformer progressivement `Dashboard.tsx` en orchestrateur plus simple.
