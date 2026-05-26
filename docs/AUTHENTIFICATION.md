# Authentification

## Statut

Statut : en cours de mise en place.

## Objectif

Bloquer l'acces a l'application avant chargement des donnees metier.

L'utilisateur doit se connecter avec un compte Supabase Auth avant que `DataProvider` ne charge la sauvegarde centrale.

## Point critique : Supabase partage avec Gestion Commandes

Le projet Supabase est partage avec Gestion Commandes Doquet.

Regles obligatoires :

- ne pas modifier les tables de Gestion Commandes Doquet ;
- ne pas modifier les policies RLS de Gestion Commandes Doquet ;
- ne pas supprimer ou recréer les utilisateurs Supabase Auth existants ;
- ne pas changer la configuration Auth globale sans verifier l'impact sur Gestion Commandes ;
- utiliser les utilisateurs Supabase Auth deja existants si possible ;
- separer la protection des donnees par table via RLS.

Important : Supabase Auth est commun au projet Supabase. Un compte utilisateur peut donc servir aux deux applications, mais les droits d'acces aux donnees doivent rester separes par les policies RLS de chaque table.

Pour Suivi de gestion, la modification RLS vise uniquement :

- `public.suivi_gestion_app_state`.

Elle ne doit pas toucher :

- `public.app_state` ;
- les tables Gestion Commandes ;
- les tables de profils ou acces sites deja utilisees par Gestion Commandes.

## Comportement retenu

- `AuthGate` entoure l'application avant `DataProvider`.
- Si aucune session valide n'existe, seule la page de connexion est visible.
- Apres connexion, l'application se charge normalement.
- Un bouton de deconnexion discret est affiche dans l'application.
- La session est stockee dans le localStorage uniquement pour maintenir la connexion navigateur.
- Les lectures et sauvegardes Supabase utilisent le token utilisateur connecte.

## Fichiers concernes

- `src/AuthGate.tsx` : ecran de connexion et protection avant l'application.
- `src/services/supabaseAuth.ts` : appels Supabase Auth REST, stockage session, refresh token, deconnexion.
- `src/services/supabaseAppState.ts` : lecture/ecriture app_state avec token authentifie.
- `src/App.tsx` : `AuthGate` place avant `DataProvider`.
- `supabase/APP_STATE_SETUP.sql` : policies limitees au role `authenticated` pour `suivi_gestion_app_state` uniquement.

## Configuration Supabase

Dans Supabase Authentication > Users :

- utiliser les comptes existants si les utilisateurs sont deja presents pour Gestion Commandes ;
- creer seulement les nouveaux utilisateurs necessaires ;
- definir leur email et mot de passe ;
- confirmer l'email si necessaire.

Dans Supabase SQL Editor, executer `supabase/APP_STATE_SETUP.sql` pour appliquer les policies `authenticated` sur `suivi_gestion_app_state` uniquement.

Important : ne pas redonner de policy `anon` sur `suivi_gestion_app_state`, sinon l'ecran de connexion deviendrait seulement visuel et les donnees resteraient lisibles via la cle publique.

## Configuration Vercel

Les variables existantes restent requises :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY`.

La cle anon/publishable reste publique cote front, mais les donnees sont protegees par Supabase Auth + RLS.

## Tests a faire

- Ouvrir Suivi de gestion en navigation privee : l'ecran de connexion doit apparaitre.
- Tenter un mauvais mot de passe : erreur visible.
- Se connecter avec un compte Supabase valide : acces a l'accueil.
- Verifier que les donnees Supabase se chargent apres connexion.
- Modifier une valeur puis verifier que `updated_at` change dans `suivi_gestion_app_state`.
- Cliquer sur Deconnexion : retour a l'ecran de connexion.
- Appliquer le SQL RLS puis verifier qu'un utilisateur non connecte ne peut plus lire/ecrire `suivi_gestion_app_state`.
- Controler que Gestion Commandes Doquet fonctionne toujours avec son authentification existante.
