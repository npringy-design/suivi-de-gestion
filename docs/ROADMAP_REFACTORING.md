# Roadmap refactoring — apres consolidation des patches Vite

Creee le 06/06/2026. Chantier suivant l'integration complete des patches Vite (vagues 1 a 11).

## Principe directeur

Chaque etape laisse l'application dans un etat deployable. Vercel vert avant de passer a l'etape suivante. Aucune reecriture en bloc.

## Etat de depart

- `vite.config.ts` : propre, uniquement `react()` et `tailwindcss()`.
- `Dashboard.tsx` : 5 302 lignes, 16 fonctions render*, 29 etats locaux.
- 8 composants de saisie quasi-identiques (~190 lignes chacun).
- `DataContext.tsx` : 1 015 lignes, 23 fonctions update*.
- 152 occurrences de `parseFloat` (valeurs monetaires stockees en string).
- 23 occurrences de `localStorage` directes hors DataContext.

## Etapes

### Etape 1 — Supprimer la cle Gemini
**Statut : a faire. Effort : 30 minutes. Risque : zero.**

La cle API Gemini est injectee dans le bundle via `vite.config.ts` mais la fonctionnalite qui l'utilisait a ete supprimee. Elle est visible dans le JS de production sans servir a rien.

Actions :
1. Verifier qu'aucun fichier `src/` ne reference `GEMINI_API_KEY`, `geminiAI` ou `@google/generative-ai`.
2. Supprimer dans `vite.config.ts` : la ligne `defineValues`, le champ `define:`, et l'import `loadEnv` s'il n'est plus utilise.
3. Retirer `@google/generative-ai` de `package.json` si present.
4. Vercel READY.

### Etape 2 — Composant generique canaux de saisie
**Statut : termine. Effort : 1-2 sessions. Risque : faible.**

8 fichiers sont des copies quasi-identiques : `Sunday.tsx`, `Deliveroo.tsx`, `Uber.tsx`, `ClickCollect.tsx`, `Especes.tsx`, `CbNepting.tsx`, `Conecs.tsx`, `AmexAncv.tsx`. ~1 540 lignes au total. Seuls le titre, les colonnes et la fonction `update*` changent.

Sous-etapes :

**2a** : Creer `src/components/CanalSaisie.tsx` — composant generique parametre par `title`, `columns`, `getData`, `onUpdate`, `computeEcart`. Valider sur `Sunday.tsx` en premier. **Fait : composant cree et `Sunday.tsx` migre.**

**2b** : Migrer les 7 autres canaux dans cet ordre : Deliveroo → Uber → ClickCollect → AmexAncv → Conecs → CbNepting → Especes. **Fait : tous les canaux sont migres.**

Gain estime : -1 300 lignes.

### Etape 3 — Extraire les render* de Dashboard
**Statut : en cours. Effort : 2-3 sessions. Risque : moyen.**

**3a — helpers simples** (sans etat, sans hooks) :
Extraire vers `src/features/dashboard/components/` :
`renderAutoValue`, `renderCashAutoValue`, `renderDailyServiceRow`, `renderDailySingleRow`, `renderDailyTotalRow`, `renderDailySection`, `renderPersonnelRow`, `renderPersonnelTable`. **Fait : helpers extraits dans `dashboardRenderHelpers.tsx`.**
Gain estime : -200 lignes.

**3b — vues complexes** :
Extraire dans cet ordre : `renderDatePicker` → `renderRealCaisseTable` → `renderDailyRealiseMatrix` → `renderDailyEntryView`. **Fait : vues extraites dans `DashboardDatePicker.tsx`, `DashboardCaisseView.tsx`, `DashboardRealiseMatrix.tsx` et `DashboardDailyEntry.tsx`.**
Destinations : `DashboardDatePicker.tsx`, `DashboardCaisseView.tsx`, `DashboardRealiseMatrix.tsx`, `DashboardDailyEntry.tsx`.
Gain estime : -600 a -800 lignes.

### Etape 4 — Decouper les etats de Dashboard
**Statut : en cours. Effort : 3-4 sessions. Risque : eleve.**

Regrouper les 29 `useState` par domaine et deplacer ceux qui appartiennent aux sous-composants extraits a l'etape 3 :
- Etats caisse → `DashboardCaisseView` / `DashboardDailyEntry` : **en cours, etats de detail/validation caisse deplaces hors `Dashboard.tsx`.**
- Etats import/upload → composants d'import correspondants
- Etats saisie quotidienne → `DashboardDailyEntry` : **en cours, props calendrier masquees retirees de la vue journaliere.**
- Etats UI (tableViewMode, activeTab...) → rester dans Dashboard

Objectif : Dashboard reduit a ~2 000 lignes, role d'orchestrateur.

### Etape 5 — Assainir le DataContext
**Statut : a faire. Effort : 1-2 sessions. Risque : moyen.**

**5a** : Centraliser les 23 `localStorage` directs hors DataContext. Identifier chaque cle, verifier si la donnee a un equivalent dans le contexte, supprimer les acces directs.

**5b** : Factoriser les 8 fonctions `update*` de canaux de saisie identiques (updateSunday, updateDeliveroo, etc.) avec une factory interne `makeChannelUpdater(channelKey)`.
Gain estime : -120 lignes.

### Etape 6 — Unifier les valeurs monetaires
**Statut : a faire apres etape 2. Effort : 4-5 sessions. Risque : eleve.**

152 occurrences de `parseFloat`. Objectif : stocker les montants en `number` dans le DataContext, parser a l'entree (saisie utilisateur), formatter a la sortie (affichage).

Strategie : commencer par les canaux de saisie (via `CanalSaisie.tsx` cree a l'etape 2), puis etendre progressivement. Ne pas faire une passe globale en une seule fois.

## Ordre recommande si ressources limitees

Etape prioritaire : **etape 2** (canaux de saisie). Meilleur rapport effort/gain, risque faible.

Deux etapes : **etape 2 puis etape 3a**. Base de code nettement plus lisible sans toucher a la logique metier.

Etapes 4, 5, 6 : investissements long terme, utiles si le projet continue de croitre.

## Gains totaux estimes

| Etape | Lignes supprimees | Benefice principal |
|-------|------------------|--------------------|
| 1 | ~3 | Securite |
| 2 | ~1 300 | Maintenance canaux |
| 3a | ~200 | Lisibilite Dashboard |
| 3b | ~700 | Lisibilite Dashboard |
| 4 | ~400 | Architecture Dashboard |
| 5a | ~50 | Coherence donnees |
| 5b | ~120 | DataContext |
| 6 | Variable | Fiabilite calculs |

Total estime : ~2 800 lignes supprimees ou deplacees.
`Dashboard.tsx` devrait descendre de 5 302 a ~2 000 lignes apres les etapes 3 et 4.
