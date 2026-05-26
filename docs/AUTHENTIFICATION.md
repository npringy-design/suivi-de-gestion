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
- ne pas supposer qu'un utilisateur connecte a Gestion Commandes a acces a Suivi de gestion ;
- separer la protection des donnees par application via une table d'acces dediee.

Important : Supabase Auth est commun au projet Supabase. Les comptes peuvent etre differents ou communs selon le besoin, mais l'acces a Suivi de gestion depend uniquement de la table `suivi_gestion_user_access`.

Pour Suivi de gestion, les modifications RLS visent uniquement :

- `public.suivi_gestion_app_state` ;
- `public.suivi_gestion_user_access`.

Elles ne doivent pas toucher :

- `public.app_state` ;
- les tables Gestion Commandes ;
- les tables de profils ou acces sites deja utilisees par Gestion Commandes.

## Regle d'acces retenue

`authenticated` seul est insuffisant, car un utilisateur connecte a Gestion Commandes serait aussi authentifie dans le meme projet Supabase.

La regle retenue est donc :

1. l'utilisateur doit reussir la connexion Supabase Auth ;
2. son `user_id` doit etre present dans `public.suivi_gestion_user_access` ;
3. la ligne doit avoir `is_active = true`.

Sans ligne active dans `suivi_gestion_user_access`, l'acces a Suivi de gestion est refuse, meme si le compte existe pour Gestion Commandes.

## Comportement retenu

- `AuthGate` entoure l'application avant `DataProvider`.
- Si aucune session valide n'existe, seule la page de connexion est visible.
- Apres connexion, l'application verifie l'autorisation Suivi de gestion dans `suivi_gestion_user_access`.
- Apres autorisation, l'application se charge normalement.
- Un bouton de deconnexion discret est affiche dans l'application.
- La session est stockee dans le localStorage uniquement pour maintenir la connexion navigateur.
- Les lectures et sauvegardes Supabase utilisent le token utilisateur connecte.

## Fichiers concernes

- `src/AuthGate.tsx` : ecran de connexion et protection avant l'application.
- `src/services/supabaseAuth.ts` : appels Supabase Auth REST, stockage session, refresh token, deconnexion et controle `suivi_gestion_user_access`.
- `src/services/supabaseAppState.ts` : lecture/ecriture app_state avec token authentifie.
- `src/App.tsx` : `AuthGate` place avant `DataProvider`.
- `supabase/APP_STATE_SETUP.sql` : table `suivi_gestion_user_access` et policies limitees aux utilisateurs autorises.

## Configuration Supabase

Dans Supabase Authentication > Users :

- creer les utilisateurs propres a Suivi de gestion si besoin ;
- ou utiliser un compte deja existant seulement si cette personne doit vraiment acceder aux deux applications ;
- definir leur email et mot de passe ;
- confirmer l'email si necessaire.

Puis autoriser explicitement l'utilisateur sur Suivi de gestion :

```sql
insert into public.suivi_gestion_user_access (user_id, email, role, is_active)
values ('UUID_UTILISATEUR', 'email@exemple.fr', 'admin', true)
on conflict (user_id) do update
set email = excluded.email,
    role = excluded.role,
    is_active = true;
```

Pour retirer l'acces a Suivi de gestion sans supprimer le compte Supabase :

```sql
update public.suivi_gestion_user_access
set is_active = false
where user_id = 'UUID_UTILISATEUR';
```

Dans Supabase SQL Editor, executer `supabase/APP_STATE_SETUP.sql` pour creer la table d'acces et appliquer les policies.

Important : ne pas redonner de policy `anon` sur `suivi_gestion_app_state` ou `suivi_gestion_user_access`, sinon l'ecran de connexion deviendrait seulement visuel.

## Configuration Vercel

Les variables existantes restent requises :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY`.

La cle anon/publishable reste publique cote front, mais les donnees sont protegees par Supabase Auth + RLS + `suivi_gestion_user_access`.

## Tests a faire

- Ouvrir Suivi de gestion en navigation privee : l'ecran de connexion doit apparaitre.
- Tenter un mauvais mot de passe : erreur visible.
- Se connecter avec un compte Supabase valide mais non present dans `suivi_gestion_user_access` : acces refuse.
- Ajouter ce compte dans `suivi_gestion_user_access` avec `is_active = true` : acces a l'accueil.
- Verifier que les donnees Supabase se chargent apres connexion.
- Modifier une valeur puis verifier que `updated_at` change dans `suivi_gestion_app_state`.
- Cliquer sur Deconnexion : retour a l'ecran de connexion.
- Verifier qu'un utilisateur non connecte ne peut plus lire/ecrire `suivi_gestion_app_state`.
- Controler que Gestion Commandes Doquet fonctionne toujours avec son authentification existante.
