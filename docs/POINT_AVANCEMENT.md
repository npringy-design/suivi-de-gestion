# Point d'avancement global

Ce fichier est le point de reprise rapide du projet. Lire ensuite la documentation metier concernee dans `docs/`.

## Regles de travail

- Preserver l'existant.
- Faire des modifications ciblees.
- Ne pas modifier une partie validee sans demande explicite.
- Documenter les changements importants dans `docs/`.
- Pousser directement les corrections terminees sauf demande contraire.
- Verifier le build Vercel apres une modification code.

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
