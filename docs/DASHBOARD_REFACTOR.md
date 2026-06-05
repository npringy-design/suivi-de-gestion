# Refonte prioritaire de `Dashboard.tsx`

Statut : priorite haute.

Date de decision : 02/06/2026.

## Decision

`src/Dashboard.tsx` ne doit plus etre considere comme une page qui porte la logique metier.

La page doit devenir une page de resume et d'orchestration :

- afficher les donnees deja calculees ailleurs ;
- recuperer des montants globaux depuis les autres pages/services ;
- piloter les vues principales ;
- deleguer les calculs, imports et rendus lourds a des modules dedies.

## Constat

`Dashboard.tsx` fait environ 4 600 lignes. C'est trop pour une seule page React.

Le probleme n'est pas uniquement la taille du fichier. Le probleme est que ce fichier contient en meme temps :

- la declaration des colonnes ;
- les types internes ;
- les calculs budget/realise ;
- les calculs cout matiere ;
- les calculs frais de personnel ;
- les imports PDF caisse ;
- les imports PDF salaires ;
- les imports Excel historiques ;
- les previsualisations d'import ;
- les vues saisie/analyse/complet ;
- la logique d'affichage tableau ;
- des comportements specifiques Thillois ;
- beaucoup de code encore modifie par des patches Vite.

Cette situation rend chaque nouvelle demande plus risquee. Meme si l'application est encore en construction et pas utilisee operationnellement, continuer a ajouter des fonctionnalites dans ce fichier augmenterait fortement le risque de casse.

## Changement de priorite

Avant cette decision, la priorite etait :

1. auditer les patches Vite ;
2. integrer les petits patches simples ;
3. nettoyer progressivement.

Nouvelle priorite :

1. figer les nouvelles demandes sur `Dashboard.tsx` ;
2. decouper `Dashboard.tsx` en modules dedies ;
3. deplacer les calculs et imports hors de la page ;
4. conserver la page comme resume/orchestrateur ;
5. seulement ensuite reprendre l'integration fine des patches Vite.

Le chantier patches reste utile, mais il devient secondaire par rapport au decoupage de `Dashboard.tsx`.

## Regle cible

`Dashboard.tsx` ne doit pas etre la source de verite metier.

A terme :

- les montants doivent venir de fonctions/services dedies ;
- les imports doivent etre dans `src/features/historicalImport/` ou equivalent ;
- les calculs salaires doivent etre dans un module salaire ;
- les calculs cout matiere doivent etre dans un module cout matiere ;
- les composants lourds doivent etre dans `src/features/dashboard/components/` ;
- `Dashboard.tsx` doit assembler les blocs et transmettre les donnees.

## Objectif de taille

Objectif final raisonnable :

- `Dashboard.tsx` : 300 a 800 lignes maximum ;
- modules de calcul : fichiers separes et testables ;
- composants tableau/import/header : fichiers separes.

Une reduction immediate sous 800 lignes n'est pas obligatoire. Le but est de sortir les blocs progressivement sans creer une refonte brutale impossible a verifier.

## Avancement

### 02/06/2026 - Preparation extraction types/constantes

Fichiers crees :

```txt
src/features/dashboard/dashboardTypes.ts
src/features/dashboard/dashboardColumns.ts
src/features/dashboard/dashboardStaticConfig.ts
```

Contenu prepare :

- types Dashboard partages ;
- colonnes du tableau ;
- jours, mois, onglets, modes de vue ;
- colonnes editables ;
- colonnes de contexte ;
- lignes et totaux personnel quotidiens.

Build Vercel : OK sur le commit `f299523`.

Important : cette premiere etape prepare le decoupage sans encore brancher `Dashboard.tsx` sur ces modules. Le branchement direct du fichier principal doit se faire avec un vrai diff local ou par une modification controlee, car remplacer les 4 600 lignes du fichier via l'API GitHub serait trop risque.

### 02/06/2026 - Preparation extraction helpers/formatters

Fichiers crees :

```txt
src/features/dashboard/dashboardFormatters.ts
src/features/dashboard/dashboardHelpers.ts
```

Contenu prepare :

- normalisation d'entree numerique ;
- parsing de nombres ;
- formatage nombre/euro/pourcentage ;
- parsing de valeurs de pourcentage ;
- detection des colonnes d'ecart ;
- detection des colonnes hachurees ;
- detection des colonnes evenement ;
- detection des colonnes fournisseurs editables ;
- tonalite positive/negative/neutre des ecarts.

Build Vercel : OK sur le commit `9b7f270`.

Important : ces helpers ne sont pas encore branches dans `Dashboard.tsx`. Ils servent de cible stable pour le prochain passage de branchement/refactor.

## Strategie de decoupage

### Etape 1 - extraire les types et constantes

Objectif : sortir ce qui ne depend pas de React.

Fichiers cibles :

```txt
src/features/dashboard/dashboardTypes.ts
src/features/dashboard/dashboardColumns.ts
src/features/dashboard/dashboardRows.ts
```

Contenu a sortir :

- `DashboardColumn` ;
- `VisibleDashboardColumn` ;
- `DashboardRow` ;
- la constante `C` des colonnes ;
- les listes de colonnes editables ;
- les groupes de colonnes.

Risque : faible/moyen.

Etat : modules crees, branchement dans `Dashboard.tsx` restant a faire.

### Etape 2 - extraire les formatters et helpers simples

Fichiers cibles :

```txt
src/features/dashboard/dashboardFormatters.ts
src/features/dashboard/dashboardHelpers.ts
```

Contenu a sortir :

- formatage euros ;
- formatage nombres ;
- parsing de nombres ;
- helpers de lignes/jours ;
- helpers de couleurs.

Risque : faible.

Etat : modules crees, branchement dans `Dashboard.tsx` restant a faire.

### Etape 3 - extraire les calculs metier

Fichiers cibles :

```txt
src/features/dashboard/dashboardCalculations.ts
src/features/dashboard/payrollCalculations.ts
src/features/dashboard/costMatterCalculations.ts
src/features/dashboard/realiseCalculations.ts
src/features/dashboard/budgetCalculations.ts
```

Contenu a sortir :

- calculs prevision ;
- calculs realise ;
- calculs cout matiere ;
- calculs personnel ;
- ecarts budget ;
- totaux semaine/mois.

Risque : eleve. A faire apres types/formatters.

### Etape 4 - extraire les imports

Fichiers cibles :

```txt
src/features/dashboard/imports/caisseImport.ts
src/features/dashboard/imports/salaryImport.ts
src/features/dashboard/imports/historicalBudgetImport.ts
src/features/dashboard/imports/historicalRealiseImport.ts
src/features/dashboard/imports/historicalCostMatterImport.ts
src/features/dashboard/imports/historicalPayrollImport.ts
```

Regle : les imports doivent retourner une previsualisation propre. La page ne doit pas contenir la logique de lecture Excel/PDF.

Risque : eleve, surtout pour l'historique et le personnel.

### Etape 5 - extraire les composants visuels

Fichiers cibles :

```txt
src/features/dashboard/components/DashboardHeader.tsx
src/features/dashboard/components/DashboardTable.tsx
src/features/dashboard/components/DailyEntryView.tsx
src/features/dashboard/components/ImportPreviewPanel.tsx
src/features/dashboard/components/HistoricalImportPanel.tsx
```

Objectif : la page principale ne doit plus contenir directement tout le JSX du tableau.

Risque : moyen/eleve.

## Ordre de travail recommande

1. Extraire types + constantes.
2. Verifier build.
3. Extraire helpers/formatters.
4. Verifier build.
5. Extraire petits composants sans changer la logique.
6. Verifier build.
7. Extraire calculs un domaine a la fois.
8. Verifier build + test visuel.
9. Extraire imports un domaine a la fois.
10. Reprendre les patches Vite restants.

## Ce qu'il ne faut plus faire

- Ne plus ajouter une nouvelle fonctionnalite directement dans `Dashboard.tsx`.
- Ne plus ajouter un patch Vite sur `Dashboard.tsx` sauf urgence de build.
- Ne plus corriger l'import personnel historique par empilement de patches.
- Ne pas chercher a tout refaire en une seule fois.
- Ne pas garder les calculs dans la page au motif que cela fonctionne aujourd'hui.

## Tolerance de casse

L'application est en construction et n'est pas encore utilisee operationnellement. Une casse temporaire peut etre acceptee si elle sert une consolidation structurante.

Mais meme avec cette tolerance, chaque etape doit rester identifiable et reversible :

- un domaine a la fois ;
- un commit clair ;
- build Vercel verifie ;
- documentation mise a jour ;
- test visuel apres deploiement.

## Premiere action technique

La premiere vraie action technique doit etre l'extraction des types et de la constante colonnes.

Pourquoi :

- c'est le bloc le plus evident a sortir ;
- il reduit la taille de `Dashboard.tsx` ;
- il prepare les autres extractions ;
- il ne devrait pas changer le comportement metier.

Avant de le faire, il faut recuperer le fichier complet en environnement local ou par un outil capable d'appliquer un vrai diff. Remplacer manuellement tout `Dashboard.tsx` via l'API GitHub est possible mais trop risque sans diff local.

## Decision actuelle

Le chantier prioritaire devient : **decoupage de `Dashboard.tsx`**.

L'audit des patches Vite reste documente, mais l'integration du petit patch `dashboardVarianceSoftColorsPatch` n'est plus la meilleure prochaine etape. La prochaine etape pertinente est de sortir les blocs structurants de `Dashboard.tsx`.