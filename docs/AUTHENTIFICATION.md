# Authentification

## Statut

Statut : en cours de mise en place, auth globale volontairement non bloquante pour l'instant.

L'application reste accessible sans connexion tant que la page de gestion utilisateurs n'est pas validée en conditions réelles. La page de gestion utilisateurs, elle, demande une connexion admin Suivi.

## Objectif final

Mettre en place le même confort que Gestion Commandes :

- une page dédiée pour créer les utilisateurs ;
- choix email / nom / rôle ;
- création par email d'invitation si possible ;
- fallback avec mot de passe temporaire à communiquer à la voix ;
- activation / désactivation des accès ;
- séparation stricte entre Gestion Commandes et Suivi de gestion.

## Point critique : Supabase partagé avec Gestion Commandes

Le projet Supabase est partagé avec Gestion Commandes Doquet.

Règles obligatoires :

- ne pas modifier les tables de Gestion Commandes Doquet ;
- ne pas modifier les policies RLS de Gestion Commandes Doquet ;
- ne pas supprimer ou recréer les utilisateurs Supabase Auth existants ;
- ne pas changer la configuration Auth globale sans vérifier l'impact sur Gestion Commandes ;
- ne pas supposer qu'un utilisateur connecté à Gestion Commandes a accès à Suivi de gestion ;
- séparer la protection des données par application via une table d'accès dédiée.

Supabase Auth est commun au projet Supabase. Les comptes peuvent être différents ou communs selon le besoin, mais l'accès à Suivi de gestion dépend uniquement de la table `suivi_gestion_user_access`.

## Ce qui est en place

- Page front : `src/UserManagementPage.tsx`.
- Route : `/#/utilisateurs`.
- API serveur : `api/suiviAccount.ts`.
- Table d'accès dédiée : `public.suivi_gestion_user_access`.
- SQL de mise en place dédié : `supabase/AUTH_USERS_SETUP.sql`.

La page utilisateurs permet :

- de se connecter en admin Suivi ;
- de lister les utilisateurs Suivi ;
- de créer un utilisateur ;
- de choisir le rôle `admin` ou `user` ;
- d'envoyer une invitation email si possible ;
- d'utiliser un mot de passe temporaire si l'email ne part pas ;
- de désactiver ou réactiver un accès.

## Ce qui n'est pas encore activé

L'authentification obligatoire devant toute l'application n'est pas encore réactivée.

Raison : il faut d'abord valider que :

- ton compte admin fonctionne ;
- la page `/utilisateurs` fonctionne ;
- la création d'utilisateur fonctionne ;
- Gestion Commandes n'est pas impacté ;
- la sauvegarde Supabase Suivi reste OK.

## Configuration Vercel requise

La page de création utilisateur utilise une route serveur. Il faut donc ajouter dans Vercel :

- `SUPABASE_SERVICE_ROLE_KEY`

Les variables déjà présentes restent nécessaires :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY`.

Important : `SUPABASE_SERVICE_ROLE_KEY` doit rester uniquement côté serveur Vercel. Ne jamais l'utiliser dans le front.

## Première mise en route admin

Il y a une seule action manuelle à faire au départ pour te donner les droits admin Suivi.

1. Dans Supabase, aller dans **Authentication > Users**.
2. Créer ou retrouver ton utilisateur.
3. Copier son `User UID`.
4. Dans Supabase SQL Editor, exécuter `supabase/AUTH_USERS_SETUP.sql`.
5. Puis exécuter cette requête en remplaçant l'UUID et l'email :

```sql
insert into public.suivi_gestion_user_access (user_id, email, full_name, role, is_active)
values ('UUID_UTILISATEUR', 'ton-email@exemple.fr', 'Nicolas', 'admin', true)
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = 'admin',
    is_active = true;
```

Après ça, tu vas sur :

`/#/utilisateurs`

Tu te connectes avec ton compte admin, puis tu peux créer les autres personnes depuis l'interface.

## Chemin utilisateur ensuite

Depuis la page utilisateurs :

1. Email de la personne.
2. Nom optionnel.
3. Rôle : `Utilisateur` ou `Administrateur`.
4. Option email d'invitation cochée si tu veux que Supabase lui envoie un mail.
5. Mot de passe temporaire renseigné si tu veux pouvoir lui donner les identifiants à la voix.
6. Bouton **Créer l'utilisateur**.

## Tests à faire

- Aller sur `/#/utilisateurs`.
- Se connecter avec ton compte admin Suivi.
- Vérifier que la liste utilisateurs charge.
- Créer un utilisateur test avec mot de passe temporaire.
- Vérifier qu'il apparaît dans la liste.
- Désactiver puis réactiver cet utilisateur.
- Vérifier dans Supabase Authentication que le compte existe.
- Vérifier que Gestion Commandes fonctionne toujours normalement.

## Étape suivante après validation

Quand la page utilisateurs est validée, on remettra l'auth obligatoire devant toute l'application avec `AuthGate` autour de `DataProvider`, puis on verrouillera `suivi_gestion_app_state` pour les utilisateurs actifs Suivi uniquement.