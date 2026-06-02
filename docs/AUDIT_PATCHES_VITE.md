# Audit patches Vite et plan de consolidation

Statut : demarrage etape 1 - audit technique.

Date de reference : 02/06/2026.

## Pourquoi ce document existe

Le projet fonctionne, mais une partie importante du comportement reel de l'application est injectee au build via des plugins Vite situes dans `scripts/`.

Ces patches ont permis d'avancer vite sans modifier directement les gros fichiers, notamment `src/Dashboard.tsx`. Le probleme est qu'ils rendent maintenant le projet plus fragile :

- le code visible dans les fichiers source ne correspond pas toujours au code execute apres build ;
- les patches dependent souvent de chaines exactes, donc une petite modification peut empecher une correction de s'appliquer ;
- plusieurs patches touchent la meme zone fonctionnelle ;
- les bugs deviennent difficiles a diagnostiquer, comme l'import personnel historique et la derniere semaine non lue ;
- `Dashboard.tsx` concentre trop de logique metier, de rendu, de calculs et d'import.

Conclusion : il ne faut pas refaire l'application. Il faut consolider progressivement.

## Regle de travail du chantier

- Ne pas faire de refonte globale.
- Ne pas supprimer plusieurs patches en meme temps.
- Ne pas modifier une partie validee sans test terrain.
- Integrer un patch a la fois dans le vrai code source.
- Retirer ensuite le patch de `vite.config.ts`.
- Verifier le build Vercel apres chaque etape.
- Documenter chaque integration importante.
- Conserver les comportements valides avant toute optimisation.

## Source de verite actuelle

Les patches actifs sont ceux importes et appeles dans `vite.config.ts`.

Patches actifs au 02/06/2026 :

1. `payrollCpProvisionPatch`
2. `dashboardPayrollColumnPatch`
3. `dashboardRealiseTotalsPatch`
4. `dashboardStrictSalaryRatesPatch`
5. `dashboardCaisseRecapPeriodePatch`
6. `caisseImportRecoveryPatch`
7. `dashboardLimonadeSplitPatch`
8. `dashboardRealiseCleanLayoutPatch`
9. `dashboardThilloisNoLimonadePatch`
10. `dashboardHistoricalBudgetExcelPatch`
11. `dashboardHistoricalTextDatePatch`
12. `dashboardHistoricalBudgetFocusedPatch`
13. `dashboardHistoricalRealiseImportPatch`
14. `dashboardHistoricalCostMatterImportPatch`
15. `dashboardHistoricalCostMatterSafePatch`
16. `dashboardCostMatterAmountFormatPatch`
17. `dashboardHistoricalPayrollImportPatch`
18. `dashboardAnalysisModePatch`
19. `dashboardHeaderVisualPatch`
20. `dashboardVarianceSoftColorsPatch`
21. `dataContextCloudSyncPatch`
22. `homeHeaderPeriodPatch`
23. `homePayrollBubblePatch`
24. `homeVisualPolishPatch`
25. `homeSmartPeriodSourcesPatch`
26. `accountingSettingsRoutePatch`

## Classement initial

Ce classement est volontairement prudent. Il doit etre affine en lisant chaque patch avant integration.

| Patch | Zone | Statut terrain | Risque | Action recommandee |
|---|---|---|---:|---|
| `payrollCpProvisionPatch` | salaires / provision CP | regle metier validee | moyen | integrer apres verification formule |
| `dashboardPayrollColumnPatch` | colonnes personnel | sensible | eleve | garder temporairement, auditer avant integration |
| `dashboardRealiseTotalsPatch` | totaux realise | probablement valide | moyen | auditer puis integrer |
| `dashboardStrictSalaryRatesPatch` | taux horaires | sensible | eleve | garder, integrer seulement apres tests salaires |
| `dashboardCaisseRecapPeriodePatch` | recap caisse/periode | valide a verifier | moyen | auditer puis integrer |
| `caisseImportRecoveryPatch` | import feuille de caisse | valide terrain recent | eleve | ne pas toucher en premier |
| `dashboardLimonadeSplitPatch` | limonade | Thillois sans limonade | moyen | verifier utilite actuelle, possiblement simplifier |
| `dashboardRealiseCleanLayoutPatch` | vue realise/complet | visuel valide en partie | faible/moyen | bon candidat integration simple |
| `dashboardThilloisNoLimonadePatch` | masquage limonade Thillois | attendu | moyen | auditer puis integrer |
| `dashboardHistoricalBudgetExcelPatch` | import historique base | valide partiel | eleve | integrer apres les patches visuels |
| `dashboardHistoricalTextDatePatch` | import historique dates texte | rustine investigation | eleve | conserver temporairement, reevaluer |
| `dashboardHistoricalBudgetFocusedPatch` | import budget/prevision | valide janvier/fevrier | eleve | integrer mais pas en premier |
| `dashboardHistoricalRealiseImportPatch` | import realise CA/couverts | valide | eleve | integrer apres budget |
| `dashboardHistoricalCostMatterImportPatch` | import cout matiere | valide | eleve | integrer apres realise |
| `dashboardHistoricalCostMatterSafePatch` | securisation cout matiere | valide/utile | eleve | integrer avec cout matiere |
| `dashboardCostMatterAmountFormatPatch` | format montants cout matiere | valide | moyen | integrer avec cout matiere |
| `dashboardHistoricalPayrollImportPatch` | import personnel historique | non valide | tres eleve | isoler, ne pas integrer tel quel |
| `dashboardAnalysisModePatch` | vue analyse | sensible | eleve | garder jusqu'a stabilisation imports |
| `dashboardHeaderVisualPatch` | visuel entetes | visuel | faible | bon candidat integration simple |
| `dashboardVarianceSoftColorsPatch` | couleurs ecarts | visuel | faible | bon candidat integration simple |
| `dataContextCloudSyncPatch` | sauvegarde Supabase segments | sensible | eleve | ne pas toucher au debut |
| `homeHeaderPeriodPatch` | accueil periode | visuel/fonctionnel | moyen | auditer puis integrer |
| `homePayrollBubblePatch` | accueil cout salarial | fonctionnel | moyen | auditer apres salaires |
| `homeVisualPolishPatch` | accueil visuel | faible | faible | bon candidat integration simple |
| `homeSmartPeriodSourcesPatch` | sources dynamiques accueil | fonctionnel | moyen | auditer puis integrer |
| `accountingSettingsRoutePatch` | route parametres compta | fonctionnel | moyen | auditer puis integrer |

## Priorites de consolidation

### Priorite 1 - inventaire et documentation

Objectif : savoir exactement ce qui transforme l'application au build.

Actions :

1. Lire chaque patch actif.
2. Identifier le ou les fichiers modifies par le patch.
3. Identifier la zone metier concernee.
4. Classer le patch : valide, fragile, temporaire, a supprimer.
5. Completer ce document au fur et a mesure.

Aucun comportement applicatif ne doit etre modifie pendant cette phase, sauf suppression d'un patch mort prouve comme inactif.

### Priorite 2 - integration des patches simples

Objectif : reduire le nombre de patches sans prendre de risque metier.

Candidats probables :

- `dashboardHeaderVisualPatch`
- `dashboardVarianceSoftColorsPatch`
- `homeVisualPolishPatch`
- une partie de `dashboardRealiseCleanLayoutPatch` si le rendu est confirme

Methode :

1. Integrer le changement dans le vrai fichier source.
2. Retirer le patch de `vite.config.ts`.
3. Supprimer le fichier patch seulement apres build et verification.
4. Tester les pages concernees.

### Priorite 3 - integration des imports historiques valides

Objectif : sortir les imports valides du systeme de patches.

Ordre recommande :

1. Budget/prevision.
2. Realise CA/couverts.
3. Cout matiere.

Ne pas toucher au personnel historique dans cette phase, sauf pour l'isoler.

### Priorite 4 - isolement du personnel historique

Objectif : ne plus melanger le personnel fragile avec les imports valides.

Actions futures :

- extraire une fonction dediee d'import personnel historique ;
- ajouter un diagnostic visible dans la previsualisation d'import ;
- afficher pour chaque jour : ligne source, bloc personnel detecte, colonnes detectees, heures lues ;
- ne pas modifier la vue Analyse tant que l'import personnel n'est pas fiable.

Constat actuel :

- la derniere semaine du personnel historique ne remonte toujours pas ;
- budget, realise et cout matiere lisent bien cette meme semaine ;
- la cause est donc probablement dans le parcours/mapping personnel, pas dans le calendrier global ;
- le chantier est mis de cote temporairement pour eviter de casser les imports valides.

### Priorite 5 - decoupage progressif de `Dashboard.tsx`

Objectif : reduire la taille et le risque de `Dashboard.tsx` sans refonte.

Ordre conseille :

1. Extraire les constantes de colonnes.
2. Extraire les formatters.
3. Extraire les imports historiques.
4. Extraire les composants visuels.
5. Transformer `Dashboard.tsx` en orchestrateur plus simple.

Fichiers cibles possibles :

```txt
src/features/dashboard/dashboardColumns.ts
src/utils/formatters.ts
src/features/historicalImport/historicalBudgetImport.ts
src/features/historicalImport/historicalRealiseImport.ts
src/features/historicalImport/historicalCostMatterImport.ts
src/features/historicalImport/historicalPayrollImport.ts
src/features/historicalImport/historicalImportTypes.ts
src/features/dashboard/components/ImportPreviewModal.tsx
src/features/dashboard/components/DashboardHeader.tsx
```

## Ce qu'il ne faut pas faire

- Ne pas supprimer tous les patches d'un coup.
- Ne pas refaire `Dashboard.tsx` completement.
- Ne pas melanger nettoyage technique et nouvelle fonctionnalite metier.
- Ne pas integrer le personnel historique tant que le bug de derniere semaine n'est pas compris.
- Ne pas modifier les imports valides pendant une correction personnel.
- Ne pas considerer un build Vercel comme une validation metier suffisante.

## Tests minimum apres chaque integration

- Build Vercel OK.
- Accueil OK.
- Saisie quotidienne OK.
- Vue Analyse OK.
- Vue Complete OK.
- Import caisse PDF OK si zone touchee.
- Import historique janvier OK si zone historique touchee.
- Import historique fevrier OK si zone historique touchee.
- Aucune perte de donnees Supabase.

## Etape 1 concrete a faire maintenant

1. Lire tous les patches actifs un par un.
2. Completer pour chaque patch :
   - fichier source transforme ;
   - fonction exacte ;
   - dependance a une chaine fragile ;
   - statut : a integrer / a garder / a supprimer / a reecrire.
3. Choisir les 2 ou 3 premiers patches simples a integrer.
4. Ne faire aucune consolidation code tant que ce tableau n'est pas suffisamment fiable.

## Decision actuelle

Priorite immediate : audit des patches Vite.

Le bug personnel derniere semaine est mis de cote. Il sera repris plus tard avec un diagnostic d'import, pas avec un nouveau patch aveugle.
