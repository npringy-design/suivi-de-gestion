# Point d'avancement global

Ce fichier est le point de reprise rapide du projet. Lire ensuite la documentation metier concernee dans `docs/`.

## Regles de travail

- Preserver l'existant.
- Faire des modifications ciblees.
- Ne pas modifier une partie validee sans demande explicite.
- Documenter les changements importants dans `docs/`.
- Pousser directement les corrections terminees sauf demande contraire.
- Verifier le build Vercel apres une modification code.

## Etat general au 07/06/2026

**Chantier patches Vite : termine.**

Toutes les vagues (1 a 11) sont integrees. `vite.config.ts` contient uniquement `react()` et `tailwindcss()`. Vercel READY sur le commit `7f186ed`. Le dossier `scripts/` ne contient plus que `dashboardRefactorStaticCodemod.ts` (codemod ponctuel deja execute, peut etre supprime).

**Chantier en cours : refactoring structurel.**

Document detaille : `docs/ROADMAP_REFACTORING.md`.

## Priorite technique actuelle — refactoring structurel

Statut : etape 5 demarree apres reprise de l'etape 4.

Document detaille : `docs/ROADMAP_REFACTORING.md`.

Etapes dans l'ordre recommande :

1. Supprimer la cle Gemini de `vite.config.ts` (fonctionnalite supprimee, cle encore injectee dans le bundle).
2. Creer un composant generique `CanalSaisie.tsx` pour remplacer les 8 composants de saisie quasi-identiques (Sunday, Deliveroo, Uber, etc.).
3. Extraire les fonctions `render*` de `Dashboard.tsx` en composants separes.
4. Decouper les etats de `Dashboard.tsx` par domaine.
5. Assainir le `DataContext.tsx` (localStorage directs, fonctions update dupliquees) — **en cours**.
6. Unifier les valeurs monetaires (152 `parseFloat`, stockage en string).

Contexte Dashboard important :

- `Dashboard.tsx` a ete allege par les extractions des etapes 3 et 4.
- Il reste une zone sensible : logique metier, calculs, imports PDF/Excel et orchestration.
- Ne pas ajouter de nouvelles fonctionnalites directement dans ce fichier sauf necessite metier.
- La roadmap detaillee avec les prompts Codex est dans `docs/ROADMAP_REFACTORING.md`.

Dernieres actions refactoring du 07/06/2026 :

- Creation de `src/lib/browserStorage.ts` pour centraliser les appels navigateur `localStorage`.
- Migration de `src/features/dashboard/hooks/useDashboardPurchaseSuppliers.ts` vers ce wrapper.
- Migration de `src/accountingConfig.ts` vers ce wrapper.
- Creation de `src/contexts/dataContextUpdateHelpers.ts` pour preparer la factorisation des mises a jour quotidiennes et mensuelles du `DataContext`.
- Les acces restants detectes sont volontaires ou a traiter separement : `src/contexts/DataContext.tsx` pour le cache central et `src/services/supabaseAuth.ts` pour la session auth.
- Commit code/doc le plus recent : `85c5ca8`.
- Vercel etait encore `pending` au moment du controle GitHub. A recontroler avant de considerer l'etape validee.

Prochaine action conseillee : brancher `dataContextUpdateHelpers.ts` dans `DataContext.tsx` par petits lots, en commencant par `updateSunday`, `updateUber`, `updateDeliveroo` et `updateClickCollect`, puis verifier Vercel avant de continuer.

## Consolidation patches Vite — terminee

Document de reference : `docs/ROADMAP_PATCHES_VITE.md`.

Toutes les vagues sont dans l'historique. Aucun patch Vite actif dans `vite.config.ts`.

## Authentification

Statut : auth globale active et page utilisateurs fonctionnelle.

Document detaille : `docs/AUTHENTIFICATION.md`.

Ce qui est en place :

- L'application principale est protegee par `src/AuthGate.tsx`, branche dans `src/App.tsx`.
- Les donnees ne sont chargees qu'apres connexion et validation de l'acces Suivi.
- La verification d'acces utilise `src/services/supabaseAuth.ts` et `public.suivi_gestion_user_access`.
- Page de gestion utilisateurs disponible sur `/#/utilisateurs`.
- Acces utilisateurs ajoute sur l'accueil via `src/HomeWithAdminLink.tsx` et `src/router.tsx`.
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
- `src/HomeWithAdminLink.tsx`
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

## Suivi quotidien — import caisse

Statut : valide.

Document detaille : `docs/IMPORT_CAISSE.md`.

Rappel : l'import caisse lit le PDF, alimente les valeurs automatiques utiles et ne doit pas toucher aux commentaires, corrections ou saisies reelles manuelles.

## Suivi quotidien — import historique Excel

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
