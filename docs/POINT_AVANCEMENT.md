# Point d'avancement global

Ce fichier est le point de reprise rapide du projet. Lire ensuite la documentation metier concernee dans `docs/`.

## Regles de travail

- Preserver l'existant.
- Faire des modifications ciblees.
- Ne pas modifier une partie validee sans demande explicite.
- Documenter les changements importants dans `docs/`.
- Pousser directement les corrections terminees sauf demande contraire.
- Verifier le build Vercel apres une modification code.
- Roadmap active : chaque etape terminee doit etre retiree de `docs/AUDIT_ET_ROADMAP.md`, puis documentee ici ou dans un document dedie. Quand toutes les etapes sont terminees et documentees, supprimer `docs/AUDIT_ET_ROADMAP.md`.

## Etat general au 08/06/2026

**Chantier patches Vite : termine.**

Toutes les vagues (1 a 11) sont integrees. `vite.config.ts` contient uniquement `react()` et `tailwindcss()`. Vercel READY sur le commit `7f186ed`. Le codemod ponctuel `dashboardRefactorStaticCodemod.ts` a ete supprime dans l'etape 1 de la nouvelle roadmap.

**Chantier refactoring structurel post-audit : termine cote code.**

Document temporaire `docs/AUDIT_ET_ROADMAP.md` supprime apres completion des etapes.

La nouvelle roadmap audit du 07/06/2026 est terminee cote code et documentee ci-dessous.

## Priorite technique actuelle â€” nouvelle roadmap audit

Statut : nouvelle roadmap audit terminee cote code.

Regle appliquee : les etapes terminees ont ete documentees ici, puis `docs/AUDIT_ET_ROADMAP.md` a ete supprime.

Contexte Dashboard important :

- `Dashboard.tsx` a ete allege par les extractions de composants, hooks et helpers d'import.
- Il reste une zone sensible : logique metier, calculs et orchestration.
- Ne pas ajouter de nouvelles fonctionnalites directement dans ce fichier sauf necessite metier.
- Toute reprise future doit rester strictement ciblee et ne pas modifier les formules metier sans validation.

Dernieres actions documentaires du 08/06/2026 :

- Creation de `docs/AUDIT_ET_ROADMAP.md` avec le nouvel audit et la roadmap active.
- Ajout de la regle : une etape terminee sort de la roadmap et doit etre documentee.
- Rappel que la roadmap doit etre supprimee une fois toutes les etapes terminees et documentees.
- Etape 1 terminee : suppression du codemod Dashboard et de son workflow GitHub, retrait de `dotenv`, README aligne avec Supabase, `selectedYear` initialise sur l'annee courante.
- Etape 2 terminee : creation de `src/components/CurrencyInput.tsx`, remplacement des copies locales dans `CanalSaisie`, `AncvPapiers` et `BilanSynthese`, avec conservation des variantes visuelles existantes.
- Etape 3 terminee : fusion de `HomeWithAdminLink` dans `Home`, route racine pointee directement vers `Home`, suppression du wrapper.
- Etape 4 terminee : `supabaseAuth.ts` utilise `browserStorage`, typage cible dans `DepensesPetiteCaisse`, `DashboardAnalysisView` et `RemiseTR`, suppression des `any` listes dans la roadmap.
- Etape 5 terminee : migration des parsings monetaires de `Home.tsx` vers `parseMoneyValue`, suppression de la fonction locale `n()` et des parsings locaux dupliques.

- Etape 6 terminee : extraction des helpers d'import Excel/PDF de `Dashboard.tsx` vers `src/features/dashboard/importHelpers/` (`historicalBudgetImport.ts`, `payrollImport.ts`, `caisseImport.ts`), sans changement de logique metier.

- Etape 7 terminee : migration des `parseFloat` de `Dashboard.tsx` vers `parseMoneyValue`, ajout d'un test cible sur `parseMoneyValue('1 234,56 €')`, et correction de `parseMoneyValue` pour le symbole euro reel. Verification TypeScript et lint OK. Test Vitest cible non lanceable dans cet environnement : erreur d'acces Windows avant execution du test.
- Etape 8A terminee : creation de `src/features/dashboard/dashboardCalculations.ts` et extraction des helpers purs de date, paie, KPI, layout frais generaux et formatage de cellule depuis `Dashboard.tsx`. Verification TypeScript OK et lint complet OK. Build Vite non lanceable dans cet environnement : erreur d'acces Windows avant compilation de `vite.config.ts`. Commit non effectue : `git` indisponible dans l'environnement.
- Etape 8B terminee : creation de `src/features/dashboard/hooks/useDashboardImportHandlers.ts` et extraction des handlers d'import budget historique, caisse, factures et salaires depuis `Dashboard.tsx`, sans modification volontaire de logique metier. `Dashboard.tsx` descend a 2991 lignes. Verification TypeScript OK et lint cible OK. Build Vite toujours non lanceable dans cet environnement : erreur d'acces Windows avant compilation de `vite.config.ts`.
- Etape 8C terminee : creation de `src/features/dashboard/hooks/useDashboardDailyRecapHandlers.ts` regroupant toute la logique du recap mail journalier (formatage, construction HTML/texte, ouverture de l'apercu, validation/envoi), deplacee telle quelle depuis `Dashboard.tsx`. `Dashboard.tsx` descend a 2761 lignes. Deplacement pur, aucune logique metier modifiee.
- Etape 8D terminee : extraction des sous-composants JSX `DashboardSidebar.tsx`, `DashboardHeader.tsx`, `DashboardDailyRecapModal.tsx` et `DashboardImportModal.tsx` dans `src/features/dashboard/components/`, avec typage complet des props (sans `any`). Les chaines mojibake (accents corrompus type `AnnÃ©e`, `donnÃ©es`, `PrÃ©parer`) ont ete preservees octet pour octet (verification par `md5sum` sur extraits cibles). `Dashboard.tsx` descend a 2198 lignes (objectif < 2500 atteint). Le `return` de `Dashboard` ne contient plus que les imports de ces sous-composants et la table principale. Build/lint toujours non lancables dans cet environnement (acces Windows). Commits : `ade97f5` (8C), `603dcfa` (8D).
- Etape A terminee : suppression de la dependance `@google/genai` (aucune reference dans `src/`), retrait de `package.json`/`package-lock.json` via `npm remove`. `tsc --noEmit` montre 3 erreurs preexistantes dans `Dashboard.tsx` (identiques avant/apres, verifiees par `git stash`), non liees a ce changement. Commit dedie.
- Etape B terminee : `@tailwindcss/vite`, `@vitejs/plugin-react` et `vite` deplaces de `dependencies` vers `devDependencies` (doublon `vite` supprime), `package-lock.json` regenere via `npm install`. `tsc --noEmit` inchange (memes 3 erreurs preexistantes). Commit dedie.
- Etape C terminee : migration des parsings monetaires locaux (`n`, `parseVal`, `parseValue`, `parseNum`, `p`, fonctions inline) vers `parseMoneyValue` de `@/lib/money` dans 16 fichiers : `EdgMensuel`, `VsBudget`, `VsN1`, `Reporting`, `BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`, `MiseEnPaiement`, `ConfigSalaires`, `RecapAnnuel`, `ExportComptable`, `DashboardAnalysisView`, `DepensesPetiteCaisse`, `SaisieTheorique`, `ConfigurationChiffre2025` (commit complementaire), plus les parseFloat inline dans `Reporting` et `RecapAnnuel`. Logique metier inchangee. `tsc --noEmit` passe sans erreur apres le dernier commit.
- Etape D terminee : remplacement des `field: any` (et `provider: any`) des callbacks `update*` dans `DashboardDailyEntry.tsx` et `DashboardCaisseView.tsx` par les types `keyof DayData...`/`keyof TrEntry` reels. `DayDataNepting`, `DayDataEspeces` et `DayDataConecs` ont ete exportes depuis `DataContext.tsx` (ils ne l'etaient pas). `tsc --noEmit` inchange (memes 3 erreurs preexistantes dans `Dashboard.tsx`). Commit dedie.
- Correction post-roadmap : les 3 erreurs `tsc` preexistantes dans `Dashboard.tsx` (lignes 1511, 1520, 2125, signalees par le build CI Vercel/GitHub) ont ete corrigees en typant correctement les props des sous-composants extraits a l'etape 8D : `DashboardHeader.tsx` (`tableViewMode`/`setTableViewMode` typés `TableViewMode` au lieu de `string`, `datePickerRef: RefObject<HTMLDivElement | null>`) et `DashboardDailyRecapModal.tsx` (`recapPreviewRef: RefObject<HTMLDivElement | null>`). `tsc --noEmit` ne remonte plus aucune erreur.
- Etape E terminee : creation de `docs/SECURITE_DEPENDANCES.md` recensant les CVEs npm connues au 08/06/2026 (`jspdf`, `react-router-dom`, `vite`, `xlsx` et leurs dependances transitives `dompurify`, `minimatch`, `picomatch`, `postcss`, `ws`), avec action recommandee par paquet. Aucune dependance modifiee (remplacement hors perimetre). Le fichier doit etre supprime une fois toutes les vulnerabilites corrigees.
- ROADMAP_STRUCTURE etape 1 terminee : `jspdf` monte en `4.2.1` (CVE critique resolue), `react-router-dom` monte en `7.17.0` (CVE DoS resolue). `tsc --noEmit` passe sans erreur. `docs/SECURITE_DEPENDANCES.md` mis a jour (entrees `jspdf` et `react-router-dom` supprimees). 15 → 12 vulnerabilites. Etape 1 retiree de `ROADMAP_STRUCTURE.md`.
- ROADMAP_STRUCTURE etape 2 terminee : creation de `src/lib/formatters.ts` (`formatEuro`, `formatPercent`) et `src/lib/constants.ts` (`MONTH_NAMES`, `MONTH_NAMES_SHORT`, `MONTH_NAMES_UPPER`). Les duplications `fe`/`fp` remplacees dans `EdgMensuel`, `VsBudget`, `VsN1`, `BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`. Les tableaux MONTHS locaux supprimes dans `EdgMensuel`, `VsN1`, `DepensesPetiteCaisse`, `MiseEnPaiement`, `SyntheseCA`, `ConfigSalaires`. Affichage preserve (UPPERCASE via `MONTH_NAMES_UPPER`, lowercase via `.toLowerCase()`). `tsc --noEmit` sans erreur. Commit unique.
- ROADMAP_STRUCTURE etape 3 terminee : creation de `src/types/dataTypes.ts` regroupant les 27 types exportes (DayData*, MonthData, VirementEntry, SalarieRow, PersonnelInfo, etc.) qui etaient en tete de `DataContext.tsx`. `DataContext.tsx` les re-exporte via `export type { ... } from '@/types/dataTypes'` pour ne pas casser les 40 fichiers consommateurs existants. `tsc --noEmit` sans erreur. Commit dedie.
- ROADMAP_STRUCTURE etape 6 terminee : migration de tous les champs monetaires `string → number` dans `DataContext`. Tous les types `DayData*` ont leurs champs numeriques en `number`. Parsing via `parseMoneyValue` dans chaque updater ; les donnees string existantes en storage continuent de fonctionner (migration lazy). `CurrencyInput`, `CanalSaisie`, `SaisieTheorique`, `DashboardCaisseView`, `useDashboardImportHandlers` mis a jour. 68 tests passent, `tsc --noEmit` sans erreur. `ROADMAP_STRUCTURE.md` supprime.
- ROADMAP_STRUCTURE etape 5 terminee : 39 tests Vitest ajoutes dans 3 fichiers — `src/test/formatters.test.ts` (10 tests : `formatEuro`, `formatPercent`), `src/test/buildDailyEntries.test.ts` (10 tests : `buildDailyEntries`, `checkBalance`, cas limites monetaires et arrondi), `src/test/dashboardCalculations.test.ts` (19 tests : `isDateInRange`, `isExactDate`, `isPayrollInputColumn`, `parsePayrollHourForCalculation`, `formatPayrollHourVisualValue`, `formatKpiCurrency`, `formatKpiNumber`). 39/39 passent.
- Router type : `Component: any` remplace par `ComponentType<...>` dans les 4 wrappers de routes (`MonthRoute`, `MonthParamRoute`, `MonthRouteWithSetMonth`, `PageRoute`). Variable `selectedYear` inutilisee dans `EdgMensuelRoute` supprimee. ESLint `no-explicit-any` passe de `off` a `warn` (override test files conserve a `off`). `tsc --noEmit` et `eslint src/router.tsx --max-warnings 0` sans erreur ni avertissement.

- Migration champs monetaires structures terminee : `AchatEntry.ht/tva`, `AlimentationEntry.montant`, `VirementEntry.montantHT/TTC`, `MonthDataDepensesPetiteCaisse.solde_debut_mois` et tous les champs `comptage`, `TrEntry.valeur` passes de `string` a `number` dans `dataTypes.ts`. Cascade mise a jour dans `DataContext` (updaters avec `parseMoneyValue`, defaults a 0), `SaisieTR`, `VisuTRPapiers`, `DashboardCaisseView`, `DashboardDailyEntry`, `DepensesPetiteCaisse`, `MiseEnPaiement`. Migration lazy : les donnees string existantes en storage continuent de fonctionner via `parseMoneyValue`. `tsc --noEmit` sans erreur.

- ROADMAP_STRUCTURE etape 4 terminee : reorganisation de `src/` en dossiers par domaine. 34 fichiers deplaces via `git mv` : `src/features/caisse/` (13 fichiers), `src/features/edg/` (9 fichiers), `src/features/salaires/` (4 fichiers), `src/features/comptabilite/` (3 fichiers), `src/features/facturation/` (3 fichiers), `src/pages/` (2 fichiers). `router.tsx`, `Dashboard.tsx` et `App.test.tsx` mis a jour. Les imports `'./utils'` dans les fichiers `edg` et `pages/Home` corriges en `'@/utils'`. `tsc --noEmit` sans erreur. Commit unique.

## Authentification

Statut : auth globale active et page utilisateurs fonctionnelle.

Document detaille : `docs/AUTHENTIFICATION.md`.

Ce qui est en place :

- L'application principale est protegee par `src/AuthGate.tsx`, branche dans `src/App.tsx`.
- Les donnees ne sont chargees qu'apres connexion et validation de l'acces Suivi.
- La verification d'acces utilise `src/services/supabaseAuth.ts` et `public.suivi_gestion_user_access`.
- Page de gestion utilisateurs disponible sur `/#/utilisateurs`.
- Acces utilisateurs ajoute sur l'accueil via `src/Home.tsx` et `src/router.tsx`.
- API serveur `api/suiviAccount.ts` pour lister, creer, modifier role et activer/desactiver les utilisateurs.
- Table d'acces dediee `suivi_gestion_user_access`.
- Roles finaux : `super_admin`, `global_admin`, `user`.
- `super_admin` affiche comme intouchable.
- `global_admin` peut gerer les utilisateurs autorises mais pas le `super_admin`.
- Creation utilisateur par mot de passe temporaire uniquement pour le moment.
- Envoi email d'invitation retire temporairement de l'interface car le lien Supabase pointe vers `localhost` et le projet Supabase est partage avec Gestion Commandes.

Important : ne pas modifier les parametres globaux Supabase Auth, notamment `Site URL`, sans verifier l'impact sur Gestion Commandes.

Fichiers importants auth :

- `src/App.tsx`
- `src/AuthGate.tsx`
- `src/services/supabaseAuth.ts`
- `src/UserManagementPage.tsx`
- `src/Home.tsx`
- `src/lib/suiviPermissions.ts`
- `api/suiviAccount.ts`
- `supabase/AUTH_USERS_SETUP.sql`
- `supabase/SUIVI_ROLES_SETUP.sql`

## Sauvegarde Supabase

Statut : optimisation segmentee et chargement mensuel a la demande actifs. A revalider manuellement apres integration de `dataContextCloudSyncPatch` (vague 7, terminee).

Document detaille : `docs/SUPABASE_SYNC.md`.

Ce qui est valide :

- Supabase est la sauvegarde centrale de l'application.
- La table utilisee est `suivi_gestion_app_state`.
- La table est separee de Gestion Commandes Doquet.
- Les donnees sont chargees depuis Supabase apres validation de la session.
- Les modifications sont sauvegardees automatiquement dans Supabase.
- Le localStorage reste seulement un cache technique local.
- Une alerte visible apparait si Supabase n'est pas configure ou si une sauvegarde echoue.
- Il n'y a pas de realtime permanent ni d'actualisation automatique toutes les 10 secondes.
- La sauvegarde utilise des segments v2 par mois : `...:segments_v2:allData:<annee>:<mois>`.

Tests a faire apres la mise en production de la vague 7 :

- Import caisse puis refresh.
- Import facture puis refresh.
- Changement de mois et retour sur le mois precedent.
- Verification dans Supabase de plusieurs cles `segments_v2`.
- Verification qu'une modification d'un mois n'entraine pas la reecriture d'un gros snapshot global.

Fichiers importants :

- `src/services/supabaseAppState.ts`
- `src/contexts/DataContext.tsx`

## Accueil

Statut : en cours de verification visuelle.

Document detaille : `docs/ACCUEIL.md`.

Ce qui est en place : titre `Hippopotamus`, localisation `Thillois`, selection de periode via la tuile date, suppression des listes mois/annee dans l'entete, meteo libellee Thillois. Les tuiles adaptent leurs libelles et sources selon la selection calendrier.

Point important : la tuile `S/C` doit lire les valeurs consolidees de la vue complete du suivi quotidien et ne doit pas recalculer localement les taux salariaux.

## Synthese CA

Statut : en cours de verification visuelle.

Document detaille : `docs/SYNTHESE_CA.md`.

Ce qui est en place : `/synthese` prend le mois courant, plus de fallback fixe sur mars, le mois choisi est maintenu tant que l'utilisateur reste dans la zone Synthese CA, le maintien passe par la route et non par le localStorage.

## Suivi quotidien â€” import caisse

Statut : valide.

Document detaille : `docs/IMPORT_CAISSE.md`.

Rappel : l'import caisse lit le PDF, alimente les valeurs automatiques utiles et ne doit pas toucher aux commentaires, corrections ou saisies reelles manuelles.

## Suivi quotidien â€” import historique Excel

Statut au 06/06/2026 : import historique global partiellement valide. Chantier personnel historique mis de cote.

Document detaille : `docs/IMPORT_HISTORIQUE_EXCEL.md`.

Valide terrain :

- Budget/previsions : lecture de janvier et fevrier jugee coherente.
- Realise CA/couverts : lecture jugee coherente.
- Cout matiere : lecture des montants fournisseurs jugee bonne, avoirs negatifs importes.

Non valide / mis de cote :

- Personnel historique : la derniere semaine ne remonte pas. Ne pas continuer a empiler des corrections aveugles. Reprise future uniquement avec diagnostic d'import visible.

Contexte metier important sur le personnel :

- Ne pas coder de regle fixe par date ou par site pour detecter le format.
- L'application sera multi-site (~6 sites). Toute logique par exception de mois/site est a eviter.
- Pour 2025/2024, s'attendre a beaucoup de feuilles au format ancien global.
- Format global : `Cadre`, `Maitrise`, `NIV I-II`, `NIV III`, `Apprenti`.
- Format detaille : `Cadre cuisine`, `Cadre salle`, `Maitrise cuisine`, `Maitrise salle`, etc.
- Si format global : stocker comme personnel non ventile, ne pas inventer de repartition salle/cuisine.


