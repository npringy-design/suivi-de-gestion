# Point d'avancement global

Ce fichier est le point de reprise rapide du projet. Lire ensuite la documentation metier concernee dans `docs/`.

## Regles de travail

- Preserver l'existant.
- Faire des modifications ciblees.
- Ne pas modifier une partie validee sans demande explicite.
- Documenter les changements importants dans `docs/`.
- Pousser directement les corrections terminees sauf demande contraire.
- Verifier le build Vercel apres une modification code.

## Sauvegarde Supabase

Statut : valide.

Document detaille : `docs/SUPABASE_SYNC.md`.

Ce qui est valide :

- Supabase est la sauvegarde centrale de l'application ;
- la table utilisee est `suivi_gestion_app_state` ;
- la table est separee de Gestion Commandes Doquet ;
- les donnees sont chargees depuis Supabase au demarrage ;
- les modifications sont sauvegardees automatiquement dans Supabase ;
- le localStorage reste seulement un cache technique local ;
- une alerte visible apparait si Supabase n'est pas configure ou si une sauvegarde echoue ;
- il n'y a pas de realtime permanent ;
- il n'y a pas d'actualisation automatique toutes les 10 secondes.

Tests utilisateur valides :

- navigateur principal vers Supabase : OK ;
- navigation privee depuis Supabase : OK ;
- saisie depuis navigation privee vers Supabase : OK ;
- retour navigateur principal avec donnees retrouvees : OK ;
- refresh d'une sous-page : OK.

Fichiers importants :

- `src/services/supabaseAppState.ts`
- `scripts/dataContextCloudSyncPatch.ts`
- `src/router.tsx`
- `supabase/APP_STATE_SETUP.sql`

Note routeur : le routeur est passe en mode hash pour eviter les erreurs 404 Vercel au refresh. Les URL peuvent donc avoir la forme `/#/especes/4`.

## Accueil

Statut : en cours de verification visuelle.

Document detaille : `docs/ACCUEIL.md`.

Ce qui est en place : titre `Hippopotamus`, localisation `Thillois`, selection de periode via la tuile date, suppression des listes mois / annee dans l'entete, meteo libellee Thillois.

Point important : les KPI restent bases sur le mois actif. Un vrai calcul multi-periode devra etre traite comme une evolution separee.

## Synthese CA

Statut : en cours de verification visuelle.

Document detaille : `docs/SYNTHESE_CA.md`.

Ce qui est en place : `/synthese` prend le mois courant, plus de fallback fixe sur mars, le mois choisi est maintenu tant que l'utilisateur reste dans la zone Synthese CA, le maintien passe par la route et non par le localStorage.

## Suivi quotidien - import caisse

Statut : valide.

Document detaille : `docs/IMPORT_CAISSE.md`.

Rappel : l'import caisse lit le PDF, alimente les valeurs automatiques utiles et ne doit pas toucher aux commentaires, corrections ou saisies reelles manuelles.

## Suivi quotidien - import factures fournisseurs

Statut : valide dans son principe actuel, avec IA desactivee.

Document detaille : `docs/IMPORT_FACTURES.md`.

Rappel : logique generique fournisseur/date/montant HT, correction manuelle possible, pas d'exceptions fournisseur par fournisseur.

## Suivi quotidien - recap mail du jour

Statut : valide. Ne pas toucher sans demande explicite.

Document detaille : `docs/RECAP_MAIL_JOUR.md`.

Rappel : le rendu application et le rendu image pour Outlook sont valides.

## Suivi quotidien - RAZ locale provisoire

Statut : provisoire, utile pour les tests.

Document detaille : `docs/RAZ_LOCALE_PROVISOIRE.md`.

Rappel : ce bouton devra etre retire ou transforme en action admin encadree avant usage normal.

## Personnel - heures, salaires et cout horaire

Statut : en cours, mecanique avancee mais encore a tester en usage reel.

Document detaille : `docs/HEURES_PERSONNEL.md`.

Rappels importants : ne pas convertir les heures pendant la frappe, saisie lisible en format horaire, calculs en centiemes pour la vue complete, import PDF salaires disponible, logique encore portee par un patch Vite sur `Dashboard.tsx`.

## Dernieres verifications connues

- build Vercel apres sauvegarde Supabase : success ;
- sauvegarde Supabase : OK ;
- rechargement depuis navigation privee : OK ;
- saisie dans les deux sens : OK ;
- refresh sous-page avec routeur hash : OK.

Verifications historiques : `npm.cmd run test -- --run src/test/utils.test.ts` OK ; `npm.cmd run lint` OK avec warnings existants ; `npm.cmd run lint:ts` OK ; `npm.cmd run build` OK.

## Phrase de reprise pour un nouveau clavardage

Lire d'abord `docs/POINT_AVANCEMENT.md`, puis la doc metier concernee dans `docs/`. La sauvegarde Supabase est validee : lire `docs/SUPABASE_SYNC.md`, table `suivi_gestion_app_state`, chargement/sauvegarde OK dans les deux sens, routeur hash pour eviter les 404 au refresh. Le recap mail est valide et ne doit pas etre modifie. Pour l'accueil, lire `docs/ACCUEIL.md`. Pour Synthese CA, lire `docs/SYNTHESE_CA.md`. Pour le personnel, lire `docs/HEURES_PERSONNEL.md`. Avant toute nouvelle correction, verifier que le build Vercel passe.
