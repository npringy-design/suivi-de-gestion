# Roadmap active — integration des patches Vite

Derniere mise a jour : 06/06/2026, apres vague 4.

## Etat actuel

- Derniere vague terminee : vague 4.
- Dernier etat connu : Vercel READY sur le commit `b00a2d931e176365cfb06ea1a39886e6b680b894`.
- Patches Vite encore actifs dans `vite.config.ts` : 15.
- Objectif final : `vite.config.ts` ne doit plus contenir que `react()` et `tailwindcss()` dans `plugins`.
- Regle de reprise : cette roadmap guide l'ordre general ; Codex doit toujours lire les fichiers de patch et le code reel avant d'appliquer.

## Regles obligatoires pour chaque vague

1. Lire chaque fichier de patch concerne avant modification.
2. Verifier que le patch est encore actif dans `vite.config.ts`, sauf mention explicite d'un script inactif a traiter.
3. Appliquer le comportement directement dans le fichier source.
4. Supprimer le script integre.
5. Retirer l'import et l'appel dans `vite.config.ts`.
6. Lancer `vite build` apres chaque patch ou au minimum entre chaque vague selon la difficulte.
7. Attendre Vercel READY avant de passer a la vague suivante.
8. Mettre a jour cette roadmap : retirer la vague de la section active et l'ajouter a l'historique.
9. Mettre a jour `docs/AUDIT_PATCHES_VITE.md` et `docs/POINT_AVANCEMENT.md`.

Si un remplacement ne matche pas exactement le code actuel, ne pas improviser sans diagnostic : expliquer l'ecart, adapter seulement si le comportement attendu est compris et verifie.

## Vagues restantes

### Vague 5 — Dashboard : limonade et visuel banderole

Patches :

- `dashboardLimonadeSplitPatch`
- `dashboardHeaderVisualPatch`

Cible principale : `src/Dashboard.tsx`.

Objectif : integrer la logique restante autour de la structure limonade et le visuel de la banderole Dashboard.

Points de vigilance :

- Thillois n'a pas d'activite limonade ; verifier si `dashboardLimonadeSplitPatch` est encore utile tel quel ou s'il doit etre simplifie.
- La vague 2 a deja neutralise/masque les colonnes limonade Thillois et a adapte `dashboardRealiseCleanLayoutPatch` pour conserver ce comportement.
- Ne pas reintroduire d'affichage limonade dans la vue complete Thillois.

### Vague 6 — Accueil : patches Home.tsx restants

Patches :

- `homeHeaderPeriodPatch`
- `homePayrollBubblePatch`
- `homeVisualPolishPatch`

Cible principale : `src/Home.tsx`.

Objectif : liberer `Home.tsx` des patches Vite restants.

Ordre recommande :

1. `homeHeaderPeriodPatch`
2. `homePayrollBubblePatch`
3. `homeVisualPolishPatch`

Raison : les finitions visuelles et les KPI peuvent dependre du systeme de periode de l'accueil.

### Vague 7 — Routing et synchronisation centrale

Patches :

- `accountingSettingsRoutePatch`
- `dataContextCloudSyncPatch`

Cibles :

- `src/router.tsx`
- `src/Home.tsx`
- `src/contexts/DataContext.tsx`

Objectif : sortir les derniers patches hors Dashboard.

Points de vigilance :

- `accountingSettingsRoutePatch` touche la navigation et les routes comptables.
- `dataContextCloudSyncPatch` touche la sauvegarde centrale Supabase : test manuel obligatoire apres integration.
- Ne pas modifier les parametres Supabase globaux, car le compte Supabase est partage avec Gestion Commandes.

### Vague 8 — Dashboard : import caisse et cout matiere historique

Patches :

- `caisseImportRecoveryPatch`
- `dashboardHistoricalCostMatterImportPatch`
- `dashboardHistoricalCostMatterSafePatch`

Cible principale : `src/Dashboard.tsx`.

Objectif : integrer les corrections d'import caisse PDF et d'import cout matiere historique.

Tests recommandes :

- Import PDF caisse.
- Verification des montants HT TVA 5,5 %, 10 % et 20 % dans le bloc Total.
- Import Excel cout matiere historique.
- Verification des avoirs negatifs et des colonnes Episaveurs en montant.

### Vague 9 — Dashboard : realise historique et personnel historique

Patches :

- `dashboardHistoricalRealiseImportPatch`
- `dashboardHistoricalPayrollImportPatch`
- `dashboardHistoricalPayrollSafePatch` (script existant mais pas actif dans `vite.config.ts`)

Cible principale : `src/Dashboard.tsx`.

Objectif : integrer l'import realise historique et traiter le script correctif du personnel historique.

Point de vigilance majeur : le personnel historique n'est pas valide terrain. La derniere semaine ne remonte pas correctement dans certaines versions. Ne pas transformer ce chantier en correction aveugle : il faut verifier le diagnostic d'import et ne pas casser les imports budget/realise/cout matiere valides.

### Vague 10 — Dashboard : import budget historique

Patches :

- `dashboardHistoricalBudgetFocusedPatch`
- `dashboardHistoricalBudgetExcelPatch`

Cible principale : `src/Dashboard.tsx`.

Objectif : integrer l'import budget historique Excel.

Tests recommandes :

- Import budget janvier.
- Import budget fevrier.
- Verification que seules les donnees attendues sont reprises : previsions couverts et TM.
- Verification qu'aucun ancien CA budget non voulu n'est reinjecte.

### Vague 11 — Finale : personnel / colonnes salaires

Patch :

- `dashboardPayrollColumnPatch`

Cible principale : `src/Dashboard.tsx`.

Objectif : integrer le dernier patch Vite, le plus lourd.

Points de vigilance :

- Patch tres lourd, environ 48 remplacements.
- Touche les colonnes personnel, les heures, les couts, les ratios, les totaux semaine/mois et l'import PDF salaires.
- Traiter par groupes logiques.
- Verifier les heures au format hH:mm.
- Verifier les couts salariaux, les totaux et les ecarts.
- Import PDF salaires a tester manuellement.

Apres cette vague, verifier que :

```ts
plugins: [react(), tailwindcss()]
```

Et verifier que `scripts/` ne contient plus de patch Vite actif. Le codemod `dashboardRefactorStaticCodemod.ts` peut etre supprime si plus aucun usage n'est prevu.

## Historique des vagues terminees

### Vague 1 — terminee

Patches integres :

- `dashboardVarianceSoftColorsPatch`
- `dashboardHistoricalTextDatePatch`
- `dashboardRealiseTotalsPatch`

Resultat : build et Vercel revenus au vert apres correction de l'etat du depot.

### Vague 2 — terminee

Patches integres :

- `dashboardCostMatterAmountFormatPatch`
- `dashboardStrictSalaryRatesPatch`
- `dashboardThilloisNoLimonadePatch`

Adaptation notable : Codex a aussi adapte `dashboardRealiseCleanLayoutPatch` pour conserver le comportement Thillois sans limonade pendant que ce patch restait actif.

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

Resultat : Vercel READY sur le commit `b00a2d931e176365cfb06ea1a39886e6b680b894`.

## Source de verite technique au 06/06/2026

Les patches encore actifs sont ceux encore importes et appeles dans `vite.config.ts` :

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

Script de correction non actif dans `vite.config.ts`, mais encore present :

- `dashboardHistoricalPayrollSafePatch`

