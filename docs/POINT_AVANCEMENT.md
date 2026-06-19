# Point d'avancement — suivi-de-gestion

Lire ce fichier en premier. Il décrit l'état actuel et les règles actives.
Les détails fonctionnels sont dans les fichiers `docs/` dédiés.

---

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
