# Point d'avancement — suivi-de-gestion

Lire ce fichier en premier. Il décrit l'état actuel et les règles actives.
Les détails fonctionnels sont dans les fichiers `docs/` dédiés.

---

## 29/06/2026 (graphiques Budget)

- RecapAnnuel Budget : deux graphiques recharts ajoutés sous le tableau — LineChart "Évolution du CA cumulé" (cumul + CA mensuel en pointillés) et PieChart donut "Répartition des couverts" (Midi/Soir) avec tuiles % + nb couverts. Affiché uniquement sur l'onglet Budget. tsc OK.

## 29/06/2026

- RecapAnnuel reskin visuel : tabs intégrés dans le header (icônes SVG checkbox, actif #1e40af), pill blanche droite avec CA N-1 ; header tableau — ligne 1 #1e40af, groupes alternance #b4c6e7/#dbeafe, libellés #dbeafe/#1e40af ; colonne DATE sombre (#1e3a5f/#1e40af mois courant) ; tfoot #1e40af fond blanc texte ; AMBER et BG_YELL supprimées. tsc OK.

## 28/06/2026 (import coût matière)

- Import historique V25/V26 coût matière : correction de montants aberrants après import — `parseHistoricalBudgetCellNumber` et `parseHistoricalCostMatterCellNumber` ignorent désormais les cellules de type date (valeur `instanceof Date` ou `{formula, result: Date}`) avant le fallback `cell.text` qui pouvait convertir "01/12/2026 00:00:00.100" en ~10^14 ; garde-fou MAX_SUPPLIER_DAILY_AMOUNT = 500 000 € ajouté sur les deux parseurs. tsc OK.

## 28/06/2026

- RecapAnnuel Coût Matière : 3 bugs corrigés — (1) données fantômes sur mois/semaines vides : week_total et month_total effacent maintenant les cellules quand hasData=false au lieu de conserver les valeurs stales ; (2) CUMUL HT calculé en progressif dans getSectionValues au lieu de lire col 59 (toujours 0) ; (3) Ratio calculé inline (totalHT/caRéalisé) au lieu de lire col 60 (parseMoneyValue échoue sur "xx%"). TOTAL row CUMUL = s(58). tsc OK.

## 27/06/2026

- Écart VS N-1 : appairage des jours par semaine ISO + jour de semaine (au lieu de Nième occurrence dans le mois) ; total semaine calculé par différence des totaux réel/budget vs somme N-1 appairée (au lieu de déduction algébrique) — s'applique aux 4 colonnes : CA réalisé 118/119, couverts réalisés 123/124, CA budget 128/5, couverts budget 129/13. tsc OK.

## 26/06/2026

- RecapAnnuel Réalisé : colonne "VAR vs Budget %" ajoutée après Tendance Annuel dans CA HT et COUVERTS (= cumul écarts / budget annuel, dynamique) — COLS_REALISE passe à 22 colonnes, getSectionValues et getTotalValues à 22 valeurs. tsc OK.
- RecapAnnuel Réalisé CVTS : même disposition que CA HT — 10 colonnes (NB Midi / Écart Midi / NB Soir / Écart Soir / NB Jour / Moy Jour / Écart Jour NB / Écart Jour % / Cumul / Tendance progressive) ; getSectionValues et getTotalValues passent à 20 valeurs. tsc OK.
- RecapAnnuel Réalisé Tendance : logique corrigée — budgetAnnuel + cumul progressif des écarts réalisés (col 22 / col 29-10) jusqu'au mois courant ; mois vides maintiennent le dernier cumul figé ; TOTAL = budget + somme de tous les écarts réalisés. tsc OK.
- RecapAnnuel Réalisé : affichage '—' sur mois vides (ca=0) ; tendanceCA/tendanceCvts calculées (réalisé jan→lastReal + budget pour les mois restants) ; COLS_REALISE passe à 18 colonnes (Tendance Cvts ajoutée en couverts) ; cumul CA corrigé sur caByMonth. tsc OK.
- RecapAnnuel Réalisé : COLS_REALISE restructuré à 17 colonnes (VAE/Midi/Écart Midi/Soir/Écart Soir/Jour/Écart Valeur/Écart %/Cumul/Tendance + 7 couverts) ; getSectionValues et getTotalValues mis à jour (écarts vs budget Midi/Soir/Jour calculés, ecartJourPct protégé si g(3)=0, cumul = somme col 21/29 jan→mois, moyennes pondérées TOTAL). tsc OK.

- RecapAnnuel Réalisé précédent : COLS_REALISE réduit de 25 à 15 colonnes (colonnes vides/redondantes supprimées, ordre Midi/Soir/VAE/Mois) ; getSectionValues et getTotalValues recalculés (cumul = somme col 21 jan→mois, cumul couverts = somme col 29, VAR N-1 protégée si ca=0, moyennes pondérées TOTAL) ; sCvtsMidi/Soir/Jour hors scope supprimées. tsc OK.

## 26/06/2026 (Budget précédent)

- RecapAnnuel Budget : CA_N1_BY_MONTH remplacé par les réalisés 2025 (source feuille "Variation 2025") ; cumul CA et CVTS calculés par somme jan→mois courant (au lieu de getLastDayVal) ; VAR VS N-1 basé sur le CA budget du mois vs CA réalisé N-1 ; ligne TOTAL avec moyennes CVTS pondérées et cumul annuel = totalCaJour. tsc OK.

## 15/06/2026

- Détection des dates journalières import historique : correction de `parseHistoricalBudgetDate` (cellules formule ExcelJS `{formula, result}` non gérées + regex `d`→`\d` cassées). tsc OK.
- Erreur "Failed to fetch dynamically imported module" après redéploiement : `src/main.tsx` recharge la page une fois automatiquement si un chunk obsolète échoue à se charger. tsc OK.
- Correctif duplication du 1er janvier : `useDashboardImportHandlers.ts` ne retient désormais que les cellules de date issues d'une formule Excel (ligne journalière), écartant la date statique d'en-tête de feuille. tsc OK.
- Correctif décalage des données importées : suppression du fallback `rowNumber - 1` / `rowNumber - 2` (couverts/TM/réalisé/personnel) devenu obsolète, lecture directe sur `rowNumber`. tsc OK.
- Import budget historique Excel : lecture de tous les mois du classeur en un seul import. tsc OK.
- Correctif démarques : application sur tous les mois lors de l'import multi-mois. tsc OK.
- Correctif import multi-mois : mois importés marqués comme chargés pour éviter l'écrasement Supabase à la navigation. tsc OK.
- Correctif persistance import : `saveNow` déclenche une sauvegarde Supabase immédiate après confirmation de l'import (le debounce 900ms était annulé si l'utilisateur quittait avant qu'il ne se déclenche). tsc OK.
- Fix bootstrap cloud : `applyCloudState` passe en merger (setAllData fonctionnel) + `cloudBootstrapDoneRef` bloque la sauvegarde auto pendant le bootstrap → données des mois importés conservées au rechargement. tsc OK.
- Import historique Excel format V25 : parseur dédié `historicalV25Import.ts`, handler `handleHistoricalV25ExcelImport`, détection automatique schéma personnel, bouton distinct dans DashboardImportModal. tsc OK.
- Correctif import V25 : suppression filtre isFormulaCell inadapté (dates directes dans V25) + reset complet des colonnes avant récriture pour garantir l'idempotence. tsc OK.
- Correctif parsing V25 : parseHistoricalBudgetNumber extrait désormais le résultat des formules ExcelJS ({ result: number }) avant de tomber sur String(). Corrige CA midi/soir et couverts vides à l'import. tsc OK.
- Correction colonnes import V25 : budget (8/9/10/11), réalisé CA (20/23/27/29), couverts réalisés (42/44), coût matière mapping fixe (cols 67-79), contrats V25 désactivés (montants tous à 0), diagnostic temporaire supprimé. tsc OK.
- FG V25+V26 : remplacement boucle while par itération sur plages de rows fixes [9-15, 18-26, 29-37, 41-48] — suppression de la détection textuelle de fin de box. tsc OK.
- Reset complet des cellules FG avant import (box 0-3, colGroup 0-2, dIdx 0-6) pour éliminer les données corrompues des anciens imports. tsc OK.
- Fix reset FG : borne dIdx corrigée de 6 à 9 pour correspondre au calcul des totaux. tsc OK.
- FG V26 : détection dynamique des offsets de colonnes par recherche de 'DATE' en row 8 (suppression des offsets hardcodés [123,128,133] invalides pour FEV-DEC 26). tsc OK.
- FG : déplacement du reset+écriture dans apply (atomique avec saveNow) — suppression du reset dans handle qui ne persistait pas en base. tsc OK.
- Calcul ECART VS N-1 : correspondance par semaine ISO + jour de semaine, cols 5/13 (budget) et 118/119/123/124 (réalisé CA/couverts). tsc OK.
- Correctif indices cols N-1 prévision : écart CA écrit en col 128 (CA ECART VS N-1 VALEUR) et écart CVTS en col 129 (RESTAURANTS ECART VS N-1 VALEUR) — les deux étaient décalés d'un cran, causant l'affichage de couverts au lieu d'euros. Exclusion et copy-from-last-day mis à jour avec le col 129. Third pass mois total aligné (128/129). Overflow débordement fin de mois : les 6 premiers jours du mois suivant en N-1 sont fusionnés dans nMinus1Data (Dashboard.tsx), avec calcul exact du srcRIdx tenant compte des total-semaine intercalés. tsc OK.
- Matching N-1 : remplacement de l'index "semaine ISO + jour de semaine" par "Nième occurrence du même jour de semaine dans le mois en N-1". Calcul mathématique de la date cible (getN1TargetDate) : 1er jeudi de janvier 2026 → 1er jeudi de janvier 2025 ; 5ème samedi de janvier 2026 → 1er février 2025 (débordement naturel). Index par clé YYYY-M-D. S'applique aux prévisions (budget) et réalisé (CA/couverts). tsc OK.
- Correction lint prefer-const Dashboard.tsx L365 (mergedCellData let → const). lint + build OK.
- Correction test sentinelle dashboardModel.test.ts : toHaveLength 140→144 (4 colonnes écart ajoutées). 81 tests passent.
- Refactor colonnes ECART section réalisée + fix doublon + écarts € prévision : dashboardColumns = 144 entrées (indices 0–143). Doublon APPRENTI supprimé (ex-index 139). Indices finaux : 139 = ECART BUDGET CUMUL €, 140 = ECART N-1 JOUR €, 141 = ECART N-1 JOUR % (hatched), 142 = ECART BUDGET CVTS CUMUL NB ; fantômes 143/144 = cumulN1CA/Cvts. First pass : cols 127 (CA ECART € budget vs N-1) et 128 (CVTS ECART € budget vs N-1) désormais calculés ; cols 5/13 recalculés aussi. Second/third pass : exclusion [139,140,142] + copie forEach depuis dernier jour [118,119,121,123,124,127,128,139,140,141,142]. Third pass : cols 127/128/5/13 du mois calculés depuis fantômes 143/144 du dernier jour. tsc OK.
- Capture mail : supersampling ×2 + downsample → PNG 620px net (texte antialiasé).
- Capture mail : HTML clipboard testé et abandonné (Outlook dépouille les styles). PNG supersampling ×2 conservé comme solution finale.
- RecapAnnuel : lecture des totaux depuis la ligne `month_total` calculée par `computeDashboardData` (via `useRecapAnnuelData`) au lieu de la somme brute jour/jour ; `buildMonthRows` extrait dans `dashboardRows.ts` et réutilisé par Dashboard.tsx. tsc OK.
- RecapAnnuel refonte complète : sélecteur d'année (YEAR-1/YEAR/YEAR+1) dans le header via `setSelectedYear` ; colonnes limonade supprimées (budget 18→14 cols, réalisé sans COUVERTS LIMONADE) ; `getSectionValues`/`getTotalValues` rebranchés sur indices réels de `dashboardColumns.ts` ; `getFgTotal(mi)` branché pour le total FG hors contrat ; sous-catégories FG marquées `'—'` (TODO brancher par catégorie). tsc OK.
- RecapAnnuel correctifs mapping : réalisé 27→25 cols (CA HT Limo + Ecart Budget Limo supprimés) ; mapping `getSectionValues` réalisé corrigé (col 21 = CA total jour, col 22 = écart budget, varP calc local) ; couverts arrondis via `Math.round` ; `fmtHeures` (HH:MM) pour les colonnes heures FP/FG ; `getRaw` ajouté à `useRecapAnnuelData` pour lire les valeurs brutes string (%, ratios) sans passage par `parseMoneyValue` ; FP section dynamique selon schéma personnel (`global` 22 cols avec indices 130-134/135-139 vs `cuisine_salle` 32 cols 62-71/77-86). tsc OK.
- RecapAnnuel budget : VAE supprimée (donnée réalisée, hors Budget) → 14→13 cols ; `getLastDayVal` ajouté à `useRecapAnnuelData` (lit le dernier jour-type pour les cumuls progressifs cols 4 et 12) ; moyennes CVTS calculées CA÷NB au lieu d'être lues depuis `month_total` ; VAR N-1 branché sur `varP` local (CA_N1_BY_MONTH) au lieu de col 5/13 qui sont nulles sur `month_total` ; ligne TOTAL recalculée CA annuel÷couverts annuels. tsc OK.
- Modale ANCV Papier multi-lignes : `AncvEntry` ajouté dans `dataTypes.ts` + champ `lignes?: AncvEntry[]` dans `DayDataAncvPapiers` ; `updateAncvLigne` dans DataContext (recalcule `montant_total`/`nombre_ancv` automatiquement) ; `AncvPapierModal.tsx` refaite avec 8 lignes valeur+nombre (même pattern que TrPapierModal) ; chaîne de props Dashboard→DashboardDailyEntry→DashboardCaisseView mise à jour. lint + 81 tests + build OK.
- Correctif crash "x.replace is not a function" ANCV papier : `ancv?.montant_total` (number) passé en string brut à `parseCaisseNumber` → enveloppé dans `reelStr()` dans l'appel `renderRealCaisseControl`. tsc OK.
- Fix CurrencyInput décimal SaisieTR + modales TR/ANCV papier (saisie quotidienne) : draft local dans CurrencyInput préserve "5." en cours de frappe (SaisieTR.tsx et TrPapierModal.tsx) ; AncvPapierModal.tsx créée (montant + nombre ANCV) ; clic label "ANCV papier" et "TR papier" dans DashboardCaisseView ouvre la modale correspondante. lint + 81 tests + build OK.
- Modale TR Papier (saisie quotidienne) : clic sur le label "TR papier" dans DashboardCaisseView ouvre TrPapierModal — 4 colonnes (Edenred/Bimpli/Pluxee/Up), 8 lignes valeur+nombre par colonne, total en temps réel, persistance immédiate via updateSaisieTR, bouton Valider/✕. Le champ réel affiche le montant calculé. lint + 81 tests + build OK.
- Nettoyage structurel : `src/types.ts` fusionné dans `src/types/dataTypes.ts` ; `src/utils.ts` → `src/lib/utils.ts` ; `src/personnelSalaryImport.ts` → `src/features/dashboard/importHelpers/personnelSalaryImport.ts` ; `src/accountingConfig.ts` → `src/features/comptabilite/accountingConfig.ts` ; `src/caisseRecapPeriodeParser.ts` → `src/features/caisse/caisseRecapPeriodeParser.ts`. Tous les imports mis à jour. lint + 81 tests + build OK.

---

## État technique au 09/06/2026

- Build Vercel : READY sur `main`. `tsc --noEmit` sans erreur. 68 tests Vitest passent.
- ESLint `no-explicit-any` : `warn` (actif). Zéro `any` dans le code actuel.
- Sécurité : voir `docs/SECURITE_DEPENDANCES.md`. CVEs résiduelles sans correctif disponible (vite, dompurify transitif) — aucune action immédiate requise.
- `Dashboard.tsx` : 1 139 lignes. Orchestrateur pur — voir règle Dashboard dans `AGENTS.md` et `src/features/dashboard/ARCHITECTURE.md`.

---

## Architecture en place

```
src/
  features/
    dashboard/      ← hooks/, components/, importHelpers/
                       dashboardCalculations.ts, dashboardColumns.ts
                       dashboardStaticConfig.ts, dashboardTypes.ts
    caisse/         ← CbNepting, Especes, Conecs, AncvPapiers, SaisieTR,
                       VisuTRPapiers, Sunday, Uber, AmexAncv, Deliveroo,
                       ClickCollect, RemiseTR, SaisieTheorique
    edg/            ← EdgMensuel, BudgetEdgAnnuel, EdgAnnuelTabs,
                       RealiseEdgAnneeFiscale, VsBudget, VsN1,
                       RecapAnnuel, SyntheseCA, Reporting
    salaires/       ← ConfigSalaires, CalculetteSalaires,
                       ConfigurationChiffre2025, VisuelVacances
    comptabilite/   ← ExportComptable, ParametrageComptable, BilanSynthese
    facturation/    ← FactureDevis, MiseEnPaiement, DepensesPetiteCaisse
  pages/            ← Home, DashboardAnalysisView
  components/       ← CanalSaisie, CurrencyInput
  contexts/         ← DataContext (provider + useData)
  types/            ← dataTypes.ts (tous les types métier)
  lib/              ← money, formatters, constants, browserStorage, suiviPermissions
  services/         ← supabaseAppState, supabaseAuth
```

---

## Règles actives

**Monnaie** : stocker en `number`, parser avec `parseMoneyValue()`, afficher avec `formatEuro()`.
**Types** : nouveaux types métier → `src/types/dataTypes.ts` uniquement.
**Utilitaires** : importer depuis `src/lib/`, ne jamais redéfinir localement.
**Dashboard** : pas de logique ajoutée directement — hooks ou sous-composants uniquement.
**Doc** : supprimer les sections qui ne décrivent que de l'historique terminé.

---

## Fonctionnalités en place

- Auth Supabase globale via `AuthGate.tsx`. Détails : `docs/AUTHENTIFICATION.md`.
- Sync Supabase par segments mensuels. Détails : `docs/SUPABASE_SYNC.md`.
- Import caisse PDF. Détails : `docs/IMPORT_CAISSE.md`.
- Import historique Excel (budget, réalisé, coût matière). Détails : `docs/IMPORT_HISTORIQUE_EXCEL.md`.
- Export comptable CSV. Détails : `docs/ECRITURES_COMPTABLES.md`.
- Gestion utilisateurs (`/#/utilisateurs`). Détails : `docs/AUTHENTIFICATION.md`.
- Accueil avec KPIs, météo Thillois, sélection de période. Détails : `docs/ACCUEIL.md`.
- Synthèse CA avec maintien du mois par route. Détails : `docs/SYNTHESE_CA.md`.

---

## Points d'attention actifs

Import historique personnel : correction des regex `\d` cassées, lecture des cellules `Date`/timedelta (semaine 5+) et des chaînes décimales `"H.MM"`, ajout du schéma `global` (5 colonnes, cols 130-139) en plus de `cuisine_salle` (10 colonnes, cols 62-71/77-86), détection automatique du schéma par mois via `personnelSchema`. tsc OK.

L'appli sera multi-site (~6 sites) : aucune logique codée en dur par site ou par mois.

**Invitation email utilisateur** : retirée temporairement. Le lien Supabase pointe vers localhost
(projet partagé avec Gestion Commandes). Ne pas modifier `Site URL` Supabase sans vérifier
l'impact sur Gestion Commandes.

**Tuile S/C accueil** : doit lire les valeurs consolidées de la vue complète du suivi quotidien,
ne pas recalculer localement les taux salariaux.
