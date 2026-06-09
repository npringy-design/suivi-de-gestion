# Roadmap structure — post-audit juin 2026

Chaque etape laisse le projet deployable. Vercel vert avant de passer a la suivante.
Une etape terminee : la supprimer de ce fichier et ajouter une ligne dans POINT_AVANCEMENT.md.
Ce fichier est a supprimer quand toutes les etapes sont faites.

Regle documentation : ne documenter que ce qui est en cours ou utile pour comprendre.
Supprimer toute section terminee. Pas de roman — juste l'essentiel.

---

## Etape 2 — Extraire les utilitaires dupliques

**Effort : 1h. Risque : faible.**

### 2a — src/lib/formatters.ts

Creer ce fichier avec deux fonctions exportees :

```ts
export const formatEuro = (v: number): string =>
  v === 0 ? '0' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

export const formatPercent = (v: number): string =>
  isFinite(v) && !isNaN(v) ? `${v.toFixed(2)}%` : '';
```

Remplacer les declarations locales `const fe = ...` et `const fp = ...` par un import
depuis `@/lib/formatters` dans ces fichiers :
`EdgMensuel`, `VsBudget`, `VsN1`, `BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`,
`Reporting`, `MiseEnPaiement`, `ConfigurationChiffre2025`, `RecapAnnuel`, `Home`.

### 2b — src/lib/constants.ts

Creer ce fichier avec :

```ts
export const MONTH_NAMES = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

export const MONTH_NAMES_SHORT = ['janv', 'fevr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
```

Supprimer les declarations locales dans :
`EdgMensuel`, `DepensesPetiteCaisse`, `MiseEnPaiement`, `SyntheseCA`, `VsN1`, `ConfigSalaires`.

Verifier `tsc --noEmit`. Committer en un seul commit.

---

## Etape 3 — Extraire les types de DataContext

**Effort : 30 min. Risque : faible.**

`DataContext.tsx` fait 861 lignes dont 27 types exportes en haut du fichier.

1. Creer `src/types/dataTypes.ts`
2. Deplacer tous les `export type` et `export interface` de `DataContext.tsx` vers ce fichier
3. Dans `DataContext.tsx`, remplacer par un import groupee depuis `@/types/dataTypes`
4. Verifier que tous les composants qui importaient depuis `@/contexts/DataContext`
   trouvent toujours leurs types (les re-exporter depuis DataContext si necessaire
   pour ne pas casser les imports existants)

Verifier `tsc --noEmit`. Committer.

---

## Etape 4 — Reorganiser src/ en dossiers par domaine

**Effort : 2-3h. Risque : moyen (beaucoup d'imports a mettre a jour).**

Structure cible :

```
src/
  features/
    dashboard/        ← deja fait
    comptabilite/     ← ExportComptable, ParametrageComptable, BilanSynthese
    salaires/         ← ConfigSalaires, CalculetteSalaires, VisuelVacances, ConfigurationChiffre2025
    caisse/           ← CbNepting, Especes, Conecs, AncvPapiers, SaisieTR, VisuTRPapiers
                         Sunday, Uber, AmexAncv, Deliveroo, ClickCollect, RemiseTR, SaisieTheorique
    edg/              ← EdgMensuel, BudgetEdgAnnuel, EdgAnnuelTabs, RealiseEdgAnneeFiscale
                         VsBudget, VsN1, RecapAnnuel, SyntheseCA, Reporting
    facturation/      ← FactureDevis, MiseEnPaiement, DepensesPetiteCaisse
  pages/              ← Home, DashboardAnalysisView
  components/         ← deja fait (CanalSaisie, CurrencyInput)
  contexts/           ← deja fait
  lib/                ← deja fait
  services/           ← deja fait
  types/              ← apres etape 3
```

Proceder feature par feature. Mettre a jour `router.tsx` a chaque deplacement.
Verifier `tsc --noEmit` apres chaque feature. Ne pas tout deplacer en une seule passe.

---

## Etape 5 — Tests sur les modules metier critiques

**Effort : 2-3h. Risque : zero (ajout uniquement).**

Cibles prioritaires (fonctions pures, logique metier, risque de regression) :

- `src/utils/buildDailyEntries.ts` — `buildDailyEntries()` et `checkBalance()`
- `src/features/dashboard/dashboardCalculations.ts` — fonctions KPI et agregation
- `src/lib/formatters.ts` — `formatEuro` et `formatPercent` (cree a l'etape 2)

Un fichier de test par module, dans `src/test/` ou cote a cote avec le fichier source.
Pas besoin de 100% de couverture — couvrir les cas limites metier (valeurs nulles,
virgules, annees bissextiles si pertinent).

---

## Etape 6 — Valeurs monetaires en number dans DataContext

**Effort : plusieurs sessions. Risque : eleve. A faire en dernier.**

Les montants sont stockes en `string` dans le state. Objectif : stocker en `number`,
parser a l'entree (saisie utilisateur via `CurrencyInput`), formatter a la sortie
(affichage).

Commencer par un seul canal de saisie pour valider la strategie avant d'etendre.
Ne pas faire de passe globale en une seule fois.
