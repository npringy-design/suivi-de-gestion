# Point d'avancement global

Ce fichier est le point de reprise rapide du projet. Lire ensuite la documentation metier concernee dans `docs/`.

## Regles de travail

- Preserver l'existant.
- Faire des modifications ciblees.
- Ne pas modifier une partie validee sans demande explicite.
- Documenter les changements importants dans `docs/`.
- Pousser directement les corrections terminees sauf demande contraire.
- Verifier le build Vercel apres une modification code.

## Priorite technique actuelle - decoupage de `Dashboard.tsx`

Statut au 02/06/2026 : priorite haute sur la reduction et la restructuration de `src/Dashboard.tsx`.

Document detaille : `docs/DASHBOARD_REFACTOR.md`.

Decision :

- `Dashboard.tsx` ne doit pas etre une page de calcul metier ;
- cette page doit devenir une page de resume/orchestration ;
- elle doit recuperer des montants globaux deja calcules ailleurs ou passes par des modules dedies ;
- les calculs, imports PDF/Excel, definitions de colonnes et composants lourds doivent sortir de ce fichier ;
- les nouvelles demandes sur cette page doivent etre evitees tant que le decoupage n'a pas commence.

Constat :

- `Dashboard.tsx` fait environ 4 600 lignes ;
- le fichier concentre trop de responsabilites ;
- il est en plus modifie par de nombreux patches Vite ;
- continuer a ajouter des fonctionnalites directement dedans augmente fortement le risque de casse.

Ordre recommande maintenant :

1. Extraire types et constantes de colonnes.
2. Extraire helpers/formatters.
3. Extraire composants visuels simples.
4. Extraire calculs metier par domaine.
5. Extraire imports PDF/Excel.
6. Reprendre ensuite l'integration des patches Vite restants.

Important : l'application est encore en construction. Une casse temporaire peut etre acceptee si elle sert une consolidation structurante, mais chaque etape doit rester claire, reversible et documentee.

Avancement au 06/06/2026 :

- le codemod `scripts/dashboardRefactorStaticCodemod.ts` a ete execute localement ;
- `src/Dashboard.tsx` est maintenant branche sur `src/features/dashboard/dashboardTypes.ts`, `dashboardColumns.ts` et `dashboardStaticConfig.ts` ;
- le typage TypeScript complet passe ;
- prochaine etape : brancher les helpers/formatters deja extraits sans modifier les calculs metier.

## Priorite technique secondaire - consolidation patches Vite

Statut au 02/06/2026 : audit initial effectue, mais integration des petits patches mise derriere le decoupage de `Dashboard.tsx`.

Document detaille : `docs/AUDIT_PATCHES_VITE.md`.

Constat :

- l'application fonctionne sur beaucoup de perimetres metier valides, mais le code a accumule trop de patches Vite ;
- le vrai comportement execute au build ne correspond plus toujours directement au code visible dans `src/` ;
- le bug de l'import personnel historique, notamment la derniere semaine non lue, montre que continuer a empiler des patches devient risque.

Decision :

- ne pas refaire l'application ;
- ne pas supprimer tous les patches d'un coup ;
- ne plus ajouter de nouveau patch Vite sauf urgence absolue ;
- utiliser l'audit patches comme support du decoupage, pas comme priorite devant `Dashboard.tsx`.

Garde-fou : le build Vercel ne suffit pas comme validation metier. Chaque consolidation doit etre testee dans l'application.

## Authentification

Statut : auth globale active et page utilisateurs fonctionnelle.

Document detaille : `docs/AUTHENTIFICATION.md`.

Ce qui est en place :

- l'application principale est protegee par `src/AuthGate.tsx`, branche dans `src/App.tsx` ;
- les donnees ne sont chargees qu'apres connexion et validation de l'acces Suivi ;
- la verification d'acces utilise `src/services/supabaseAuth.ts` et `public.suivi_gestion_user_access` ;
- page de gestion utilisateurs disponible sur `/#/utilisateurs` ;
- acces utilisateurs ajoute sur l'accueil via `src/HomeWithAdminLink.tsx` et `src/router.tsx` ;
- API serveur `api/suiviAccount.ts` pour lister, creer, modifier role et activer/desactiver les utilisateurs ;
- table d'acces dediee `suivi_gestion_user_access` ;
- roles finaux : `super_admin`, `global_admin`, `user` ;
- `super_admin` affiche comme intouchable ;
- `global_admin` peut gerer les utilisateurs autorises mais pas le `super_admin` ;
- creation utilisateur par mot de passe temporaire uniquement pour le moment ;
- envoi email d'invitation retire temporairement de l'interface car le lien Supabase pointe vers `localhost` et le projet Supabase est partage avec Gestion Commandes.

Important : ne pas modifier les parametres globaux Supabase Auth, notamment `Site URL`, sans verifier l'impact sur Gestion Commandes.

Fichiers importants auth :

- `src/App.tsx`
- `src/AuthGate.tsx`
- `src/services/supabaseAuth.ts`
- `src/UserManagementPage.tsx`
- `src/HomeWithAdminLink.tsx`
- `src/lib/suiviPermissions.ts`
- `api/suiviAccount.ts`
- `supabase/AUTH_USERS_SETUP.sql`
- `supabase/SUIVI_ROLES_SETUP.sql`

## Sauvegarde Supabase

Statut : optimisation segmentee et chargement mensuel a la demande ajoutes le 27/05/2026, a revalider apres deploiement.

Document detaille : `docs/SUPABASE_SYNC.md`.

Ce qui est valide :

- Supabase est la sauvegarde centrale de l'application ;
- la table utilisee est `suivi_gestion_app_state` ;
- la table est separee de Gestion Commandes Doquet ;
- les donnees sont chargees depuis Supabase apres validation de la session ;
- les modifications sont sauvegardees automatiquement dans Supabase ;
- le localStorage reste seulement un cache technique local ;
- une alerte visible apparait si Supabase n'est pas configure ou si une sauvegarde echoue ;
- il n'y a pas de realtime permanent ;
- il n'y a pas d'actualisation automatique toutes les 10 secondes.

Optimisation ajoutee :

- la sauvegarde n'ecrit plus un seul gros snapshot global en priorite ;
- `src/services/supabaseAppState.ts` utilise maintenant des segments v2 par mois : `...:segments_v2:allData:<annee>:<mois>` ;
- les segments separent aussi `config2025`, `customEvents` et `personnelInfos` ;
- le chargement initial lit le socle global et le mois de demarrage seulement ;
- quand l'utilisateur change de mois, `fetchCloudMonth` charge uniquement le mois demande si besoin ;
- l'ancien snapshot global reste relisible pour compatibilite ;
- les fichiers importes et textes PDF complets ne doivent toujours pas etre sauvegardes ; seules les valeurs metier validees sont conservees.

Tests utilisateur valides avant optimisation :

- navigateur principal vers Supabase : OK ;
- navigation privee depuis Supabase : OK ;
- saisie depuis navigation privee vers Supabase : OK ;
- retour navigateur principal avec donnees retrouvees : OK ;
- refresh d'une sous-page : OK.

Tests a refaire apres deploiement de l'optimisation :

- import caisse puis refresh ;
- import facture puis refresh ;
- changement de mois et retour sur le mois precedent ;
- verification dans Supabase de plusieurs cles `segments_v2` ;
- verification qu'une modification d'un mois n'entraine pas la reecriture d'un gros snapshot global.

Fichiers importants :

- `src/services/supabaseAppState.ts`
- `src/services/supabaseAuth.ts`
- `src/AuthGate.tsx`
- `src/UserManagementPage.tsx`
- `src/HomeWithAdminLink.tsx`
- `src/lib/suiviPermissions.ts`
- `api/suiviAccount.ts`
- `scripts/dataContextCloudSyncPatch.ts`
- `src/router.tsx`
- `supabase/APP_STATE_SETUP.sql`
- `supabase/AUTH_USERS_SETUP.sql`
- `supabase/SUIVI_ROLES_SETUP.sql`

Note routeur : le routeur est passe en mode hash pour eviter les erreurs 404 Vercel au refresh. Les URL peuvent donc avoir la forme `/#/especes/4`.

## Accueil

Statut : en cours de verification visuelle.

Document detaille : `docs/ACCUEIL.md`.

Ce qui est en place : titre `Hippopotamus`, localisation `Thillois`, selection de periode via la tuile date, suppression des listes mois / annee dans l'entete, meteo libellee Thillois.

Correction du 30/05/2026 : les tuiles d'accueil adaptent maintenant leurs libelles et leurs sources selon la selection calendrier. Par defaut, elles restent sur mois en cours + veille. En selection jour / periode / mois / annee, elles basculent sur les donnees de la selection.

Point important : la tuile `S/C` doit lire les valeurs consolidees de la vue complete du suivi quotidien et ne doit pas recalculer localement les taux salariaux.

A verifier : l'acces `Utilisateurs` est actuellement ajoute via `HomeWithAdminLink.tsx`. Son placement visuel doit rester propre et ne pas donner un effet bouton flottant bricole.

## Synthese CA

Statut : en cours de verification visuelle.

Document detaille : `docs/SYNTHESE_CA.md`.

Ce qui est en place : `/synthese` prend le mois courant, plus de fallback fixe sur mars, le mois choisi est maintenu tant que l'utilisateur reste dans la zone Synthese CA, le maintien passe par la route et non par le localStorage.

## Suivi quotidien - import caisse

Statut : valide.

Document detaille : `docs/IMPORT_CAISSE.md`.

Rappel : l'import caisse lit le PDF, alimente les valeurs automatiques utiles et ne doit pas toucher aux commentaires, corrections ou saisies reelles manuelles.

## Suivi quotidien - import historique Excel

Statut au 02/06/2026 : import historique global partiellement valide ; chantier personnel mis de cote temporairement au profit du decoupage `Dashboard.tsx` et de l'audit/consolidation technique.

Document detaille : `docs/IMPORT_HISTORIQUE_EXCEL.md`, `docs/HEURES_PERSONNEL.md`, `docs/AUDIT_PATCHES_VITE.md` et `docs/DASHBOARD_REFACTOR.md`.

Valide terrain :

- Budget/previsions : lecture de janvier et fevrier jugee coherente apres correction du decalage de ligne et des lignes total semaine.
- Realise CA/couverts : lecture jugee coherente ; les ecarts budget valeur/% semaine et total mois ont ete ajoutes et corriges.
- Cout matiere : lecture des montants fournisseurs jugee bonne ; les avoirs negatifs sont importes ; les colonnes `EPISAVEUR20%` et `EPISAVEUR5%` restent affichees en montant et non en pourcentage.

Non valide / mis de cote :

- Personnel historique : la projection et le realise ont ete partiellement lus selon les versions, mais la derniere semaine ne remonte toujours pas.
- Plusieurs tentatives de patch ont montre que la logique actuelle est trop fragile.
- Ne pas continuer a empiler des corrections aveugles.
- Reprise future uniquement avec diagnostic d'import visible : ligne source trouvee, bloc personnel detecte, colonnes detectees, heures lues.

Contexte metier important :

- La page Dashboard/Suivi quotidien ne doit pas devenir la source de verite des calculs.
- Elle doit recuperer/afficher des montants consolides ou deleguer les calculs a des modules.
- Le decoupage du fichier est prioritaire avant d'ajouter de nouvelles fonctionnalites lourdes.

Contexte metier important sur le personnel :

- Il ne faut pas coder une regle fixe par date, du type `avant fevrier 2026 = ancien format` / `apres fevrier 2026 = nouveau format`.
- Le passage au detail salle/cuisine depend du site : Thillois est passe sur le nouveau format en janvier/fevrier 2026 selon les feuilles testees, mais d'autres sites ont pu basculer un ou deux mois avant.
- Pour 2025 et 2024, il faut s'attendre a beaucoup de feuilles au format ancien global.
- L'application finale sera multi-site, environ 6 sites, donc toute logique par exception de mois/site est a eviter.

Objectif de reprise future du chantier personnel :

- Supprimer/remplacer la logique actuelle d'import personnel historique qui a ete patchee plusieurs fois et reste fragile.
- Creer une detection automatique par feuille mensuelle et par site :
  - format global : `Cadre`, `Maitrise`, `NIV I-II`, `NIV III`, `Apprenti` ;
  - format detaille : `Cadre cuisine`, `Cadre salle`, `Maitrise cuisine`, `Maitrise salle`, etc.
- Ne pas inventer une repartition salle/cuisine quand la feuille source ne la contient pas.
- Si format detaille : importer vers les colonnes detaillees actuelles de l'application.
- Si format global : stocker/importer comme personnel non ventile par echelon, ou au minimum prevoir une structure de donnees permettant a l'analyse de l'afficher comme global/non ventile.
- Adapter ensuite la vue Analyse :
  - mois/periode 100 % detaille : analyse salle/cuisine complete ;
  - mois/periode 100 % global : analyse par echelon global uniquement ;
  - periode mixte : total personnel fiable, detail salle/cuisine seulement sur la partie detaillee, partie ancienne affichee comme non ventilee.

Derniers fichiers de patch concernes :

- `scripts/dashboardHistoricalBudgetExcelPatch.ts`
- `scripts/dashboardHistoricalBudgetFocusedPatch.ts`
- `scripts/dashboardHistoricalRealiseImportPatch.ts`
- `scripts/dashboardHistoricalCostMatterImportPatch.ts`
- `scripts/dashboardHistoricalCostMatterSafePatch.ts`
- `scripts/dashboardCostMatterAmountFormatPatch.ts`
- `scripts/dashboardHistoricalPayrollImportPatch.ts` : fragile, ne pas integrer tel quel
- `scripts/dashboardHistoricalTextDatePatch.ts` : ajoute pendant investigation, a conserver ou retirer selon audit
- `vite.config.ts`
