# Roadmap structure — post-audit juin 2026

Chaque etape laisse le projet deployable. Vercel vert avant de passer a la suivante.
Une etape terminee : la supprimer de ce fichier et ajouter une ligne dans POINT_AVANCEMENT.md.
Ce fichier est a supprimer quand toutes les etapes sont faites.

Regle documentation : ne documenter que ce qui est en cours ou utile pour comprendre.
Supprimer toute section terminee. Pas de roman — juste l'essentiel.

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
