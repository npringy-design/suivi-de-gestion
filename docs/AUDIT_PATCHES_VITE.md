# Audit patches Vite et plan de consolidation

Statut : etape 1 demarree - premiere lecture des patches actifs effectuee.

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

## Synthese de l'audit initial

Le risque principal n'est pas seulement le nombre de patches. Le vrai probleme est l'enchainement : certains patches modifient le resultat attendu par d'autres patches.

Zones les plus sensibles :

1. `Dashboard.tsx` : beaucoup de patches s'empilent sur ce fichier.
2. Import historique Excel : les patches sont dependants les uns des autres.
3. Personnel / salaires : plusieurs patches touchent les memes colonnes, calculs et taux.
4. Accueil : plusieurs patches modifient la meme logique de periode et de KPI.
5. Supabase : un patch modifie `DataContext.tsx`, donc il touche la sauvegarde centrale.

Premiere conclusion pratique : on ne commence pas par les gros patches metier. On commence par les patches petits, isoles, faciles a verifier visuellement.

## Audit detaille des patches actifs

| Patch | Fichier(s) transforme(s) | Role reel constate | Fragilite technique | Decision |
|---|---|---|---|---|
| `payrollCpProvisionPatch` | `src/personnelSalaryImport.ts`, `src/ConfigSalaires.tsx`, `src/Dashboard.tsx`, `src/DashboardAnalysisView.tsx` | Applique le coefficient CP : cadre x1,18, autres x1,10. Passe aussi la categorie aux calculs de taux moyens. | Moyenne : depend de chaines exactes mais la regle metier est claire. | A integrer, mais pas avant verification rapide salaires/config/analyse. |
| `dashboardPayrollColumnPatch` | `src/Dashboard.tsx` | Reorganise massivement les colonnes personnel, les colonnes editables, les calculs d'heures, couts, ratios, affichages et import PDF salaire. | Tres elevee : patch long, touche beaucoup de calculs et colonnes. | Ne pas integrer en premier. A decouper avant integration. |
| `dashboardRealiseTotalsPatch` | `src/Dashboard.tsx` | Ajoute/complete les ecarts realise vs budget, moyennes, couverts et colonnes de pourcentage. | Moyenne/elevee : touche les totaux semaine/mois. | A integrer apres stabilisation des colonnes realise. |
| `dashboardStrictSalaryRatesPatch` | `src/Dashboard.tsx` | Supprime les taux horaires fallback fixes pour obliger la lecture des taux depuis la config salaire. | Moyenne : patch simple, mais zone salaire sensible. | Bon candidat technique, mais validation salaire obligatoire. |
| `dashboardCaisseRecapPeriodePatch` | `src/Dashboard.tsx` | Branche le parser recap periode caisse, applique la date PDF, alimente bilan synthese, gere les TTC TVA. | Elevee : touche import caisse valide terrain. | Ne pas toucher en premier. A integrer seulement avec test import caisse. |
| `caisseImportRecoveryPatch` | `src/Dashboard.tsx` | Revient a `extractPdfText` et remplace la detection TTC TVA par une version plus fiable. | Elevee : rustine sur import caisse valide. | Garder temporairement. A fusionner avec le patch caisse plus tard. |
| `dashboardLimonadeSplitPatch` | `src/Dashboard.tsx` | Ajoute detail limonade midi/soir, deplace colonnes, modifie calculs et ordre Personnel/Achats. | Elevee : utile historiquement mais Thillois n'utilise pas la limonade. | A reevaluer. Possiblement simplifier avant integration. |
| `dashboardRealiseCleanLayoutPatch` | `src/Dashboard.tsx` | Reorganise les vues complet/prevision/realise, ajoute colonnes total restaurant, ecarts, couverts, groupes et calculs. | Tres elevee : patch visuel mais aussi calculatoire. | Ne pas classer comme simple. A integrer par morceaux. |
| `dashboardThilloisNoLimonadePatch` | `src/Dashboard.tsx` | Neutralise et masque les colonnes limonade pour Thillois. | Moyenne/elevee : depend du patch limonade et du layout complet. | A integrer apres clarification limonade. |
| `dashboardHistoricalBudgetExcelPatch` | `src/Dashboard.tsx` | Ajoute import Excel historique de base : XLSX, detection feuille mois/annee, preview, application. | Elevee : base de tous les imports historiques suivants. | A integrer avant les autres imports historiques, mais pas en premier chantier. |
| `dashboardHistoricalTextDatePatch` | `src/Dashboard.tsx` | Ajoute parsing de dates texte francaises. | Moyenne : petit patch mais ne corrige pas la cause personnel. | Garder temporairement, a reevaluer lors de l'extraction historique. |
| `dashboardHistoricalBudgetFocusedPatch` | `src/Dashboard.tsx` | Limite l'import historique au mois affiche, lit uniquement couverts + TM, evite CA ancien Excel. | Elevee : metier valide mais depend du patch budget de base. | A integrer avec `dashboardHistoricalBudgetExcelPatch`. |
| `dashboardHistoricalRealiseImportPatch` | `src/Dashboard.tsx` | Ajoute lecture du realise CA/couverts depuis le fichier historique. | Elevee : depend du parcours budget et des lignes source. | A integrer apres budget historique. |
| `dashboardHistoricalCostMatterImportPatch` | `src/Dashboard.tsx` | Ajoute mapping fournisseurs cout matiere et lecture montants. | Elevee : depend du realise/budget. | A integrer apres realise historique. |
| `dashboardHistoricalCostMatterSafePatch` | `src/Dashboard.tsx` | Remplace la detection fournisseur, gere EPISAVEUR 5%, montants negatifs, vide les anciennes valeurs avant import. | Elevee mais metier valide. | A fusionner avec `dashboardHistoricalCostMatterImportPatch`. |
| `dashboardCostMatterAmountFormatPatch` | `src/Dashboard.tsx` | Conserve les montants negatifs et evite d'afficher EPISAVEUR comme pourcentage. | Faible/moyenne : patch court, metier valide. | Bon candidat technique, mais mieux de l'integrer avec cout matiere. |
| `dashboardHistoricalPayrollImportPatch` | `src/Dashboard.tsx` | Ajoute import heures personnel historique projection/realise. | Tres elevee : non valide terrain, derniere semaine non lue. | Ne pas integrer tel quel. A isoler et reecrire avec diagnostic. |
| `dashboardAnalysisModePatch` | `src/Dashboard.tsx` | Branche `DashboardAnalysisView` dans le mode Analyse et masque KPI/onglets inutiles. | Moyenne : petit patch mais touche rendu principal. | A integrer apres validation visuelle Analyse. |
| `dashboardHeaderVisualPatch` | `src/Dashboard.tsx` | Harmonise la banderole, ajoute fermeture clic exterieur du date picker, mois cliquable, couleurs communes. | Moyenne : visuel mais assez large. | Candidat integration, mais pas le plus petit. |
| `dashboardVarianceSoftColorsPatch` | `src/Dashboard.tsx` | Change la couleur des ecarts positifs/negatifs. | Faible : patch court, visuel, localise. | Premier candidat d'integration. |
| `dataContextCloudSyncPatch` | `src/contexts/DataContext.tsx` | Ajoute chargement/sauvegarde Supabase segmentee, cache mois et alerte en cas d'erreur. | Tres elevee : sauvegarde centrale. | Ne pas toucher au debut. Integration dediee avec tests Supabase. |
| `homeHeaderPeriodPatch` | `src/Home.tsx` | Remplace mois/annee par selection de periode, change titre/localisation/meteo, ajoute modal calendrier. | Moyenne/elevee : gros patch accueil. | A integrer avant les autres patches accueil qui en dependent. |
| `homePayrollBubblePatch` | `src/Home.tsx` | Lit les KPI accueil depuis dashboard, ajoute tuile S/C semaine/mois/veille. | Moyenne/elevee : logique calculatoire accueil. | A integrer apres `homeHeaderPeriodPatch`. |
| `homeVisualPolishPatch` | `src/Home.tsx` | Finitions visuelles accueil, libelles dynamiques, meteo, affichage periode. | Moyenne : depend de `homeHeaderPeriodPatch` et `homePayrollBubblePatch`. | Bon candidat seulement apres integration des patches accueil de base. |
| `homeSmartPeriodSourcesPatch` | `src/Home.tsx` | Adapte les sources KPI selon jour/periode/mois/annee. | Moyenne/elevee : depend du systeme de periode accueil. | A integrer avec les patches accueil, pas seul. |
| `accountingSettingsRoutePatch` | `src/router.tsx`, `src/Home.tsx` | Ajoute routes parametrage comptable/ecritures comptables et lien accueil. | Moyenne : simple, mais touche navigation. | Candidat integration simple apres verification des composants cibles. |

## Dependances importantes detectees

### Chaine import historique

Ordre obligatoire :

1. `dashboardHistoricalBudgetExcelPatch`
2. `dashboardHistoricalBudgetFocusedPatch`
3. `dashboardHistoricalRealiseImportPatch`
4. `dashboardHistoricalCostMatterImportPatch`
5. `dashboardHistoricalCostMatterSafePatch`
6. `dashboardCostMatterAmountFormatPatch`
7. `dashboardHistoricalPayrollImportPatch`

Le personnel est le dernier de la chaine et n'est pas valide. Il ne doit pas bloquer l'integration future des imports valides, mais il ne faut pas l'integrer tel quel.

### Chaine accueil

Ordre logique :

1. `homeHeaderPeriodPatch`
2. `homePayrollBubblePatch`
3. `homeSmartPeriodSourcesPatch`
4. `homeVisualPolishPatch`

`homeVisualPolishPatch` parait simple, mais il depend deja des variables/expressions introduites par les autres patches accueil. Il ne doit pas etre integre seul avant eux.

### Chaine limonade / vue complete

Patches lies :

- `dashboardLimonadeSplitPatch`
- `dashboardRealiseCleanLayoutPatch`
- `dashboardThilloisNoLimonadePatch`

Cette zone est piegeuse : Thillois n'utilise pas la limonade, mais certains calculs et colonnes existent encore pour compatibilite. Il faut clarifier ce qu'on garde avant integration.

### Chaine salaires/personnel

Patches lies :

- `payrollCpProvisionPatch`
- `dashboardPayrollColumnPatch`
- `dashboardStrictSalaryRatesPatch`
- `homePayrollBubblePatch`
- `dashboardHistoricalPayrollImportPatch`

Le coefficient CP cadre est clair. En revanche, colonnes personnel + import historique + analyse doivent rester separes.

## Premiers candidats d'integration

### Candidat 1 - `dashboardVarianceSoftColorsPatch`

Pourquoi :

- patch court ;
- localise dans `Dashboard.tsx` ;
- uniquement visuel ;
- faible impact metier ;
- facile a tester dans Vue complete avec des ecarts positifs/negatifs.

Risque : faible.

### Candidat 2 - `accountingSettingsRoutePatch`

Pourquoi :

- route et lien de navigation ;
- patch court ;
- ne touche pas aux calculs ;
- integration directe possible dans `src/router.tsx` et `src/Home.tsx`.

Risque : moyen, car il faut verifier que `ParametrageComptable` et `ExportComptable` existent et que le lien accueil reste propre.

### Candidat 3 - `dashboardStrictSalaryRatesPatch`

Pourquoi :

- patch court ;
- intention claire : ne plus utiliser les anciens taux fallback fixes ;
- regle logique avec les taux salaires importes/configures.

Risque : moyen, car il faut verifier que l'absence de taux ne donne pas des cellules incoherentes. A tester avec config salaires existante.

### Candidat 4 - `payrollCpProvisionPatch`

Pourquoi :

- regle metier validee : cadre x1,18, autres x1,10 ;
- mieux vaut l'avoir en vrai code qu'en patch.

Risque : moyen, car il touche quatre fichiers. A integrer apres les candidats plus petits.

## Patches a ne pas prendre en premier

- `dashboardPayrollColumnPatch` : trop large.
- `dashboardRealiseCleanLayoutPatch` : faux patch visuel, en realite il modifie aussi des calculs.
- `dashboardCaisseRecapPeriodePatch` + `caisseImportRecoveryPatch` : import caisse valide, ne pas prendre le risque au debut.
- `dataContextCloudSyncPatch` : sauvegarde centrale Supabase, trop sensible.
- `dashboardHistoricalPayrollImportPatch` : non valide, a reecrire plus tard.
- Tous les patches historiques sauf `dashboardCostMatterAmountFormatPatch` : dependances fortes.

## Priorites de consolidation

### Priorite 1 - inventaire et documentation

Objectif : savoir exactement ce qui transforme l'application au build.

Etat : premiere lecture effectuee pour les 26 patches actifs.

Actions restantes :

1. Verifier les composants cibles du patch comptable.
2. Lire les fichiers source touches par les 2 ou 3 premiers candidats.
3. Integrer un seul candidat a la fois.
4. Retirer son import/appel dans `vite.config.ts`.
5. Build Vercel puis test application.

### Priorite 2 - integration des patches simples

Objectif : reduire le nombre de patches sans prendre de risque metier.

Ordre conseille maintenant :

1. `dashboardVarianceSoftColorsPatch`
2. `accountingSettingsRoutePatch`
3. `dashboardStrictSalaryRatesPatch`
4. `payrollCpProvisionPatch`

Attention : cet ordre peut changer si la lecture des fichiers source montre que le patch est deja partiellement integre ou que les composants cibles manquent.

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

## Etape suivante concrete

Commencer l'integration du premier patch simple : `dashboardVarianceSoftColorsPatch`.

Avant modification :

1. Lire `src/Dashboard.tsx` autour du bloc de couleurs d'ecarts.
2. Integrer la logique dans le vrai fichier.
3. Retirer `dashboardVarianceSoftColorsPatch` de `vite.config.ts`.
4. Supprimer le fichier patch seulement si le build passe.
5. Tester visuellement les ecarts positifs/negatifs dans Vue complete.

## Decision actuelle

Priorite immediate : poursuivre la consolidation par petits patches.

Le bug personnel derniere semaine reste mis de cote. Il sera repris plus tard avec un diagnostic d'import, pas avec un nouveau patch aveugle.
