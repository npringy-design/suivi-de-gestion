# Authentification

## Statut

Statut : auth globale active et page utilisateurs fonctionnelle.

L'application est maintenant protégée à l'entrée par `src/AuthGate.tsx`, branché dans `src/App.tsx` autour de `DataProvider`. Les données de l'application ne sont chargées qu'après connexion Supabase Auth et validation de l'accès dans `public.suivi_gestion_user_access`.

## Règles importantes

Le projet Supabase est partagé avec Gestion Commandes Doquet.

Règles obligatoires :

- ne pas modifier les tables de Gestion Commandes Doquet ;
- ne pas modifier les policies RLS de Gestion Commandes Doquet ;
- ne pas supprimer ou recréer les utilisateurs Supabase Auth existants ;
- ne pas modifier à la légère les paramètres globaux Supabase Auth, notamment `Site URL`, car cela peut impacter les emails de Gestion Commandes ;
- ne pas supposer qu'un utilisateur connecté à Gestion Commandes a accès à Suivi de gestion ;
- l'accès à Suivi dépend uniquement de `public.suivi_gestion_user_access`.

## Rôles Suivi

Rôles retenus :

- `super_admin` : Nicolas, intouchable dans l'interface, tous les droits ;
- `global_admin` : accès complet à l'application et à la création utilisateurs, mais aucune action sur le `super_admin` ;
- `user` : accès standard à l'application, sans accès à la création utilisateurs.

Compatibilité : l'ancien rôle `admin` est normalisé en `global_admin` dans le front et dans l'API.

## Ce qui est en place

- Auth globale : `src/AuthGate.tsx`.
- Auth Supabase : `src/services/supabaseAuth.ts`.
- Page utilisateurs : `src/UserManagementPage.tsx`.
- Route utilisateurs : `/#/utilisateurs`.
- Accès utilisateurs depuis l'accueil : `src/HomeWithAdminLink.tsx`, utilisé par `src/router.tsx`.
- API serveur utilisateurs : `api/suiviAccount.ts`.
- Table d'accès dédiée : `public.suivi_gestion_user_access`.
- SQL de mise en place : `supabase/AUTH_USERS_SETUP.sql`.
- SQL de préparation rôles : `supabase/SUIVI_ROLES_SETUP.sql`.
- Permissions front : `src/lib/suiviPermissions.ts`.

## Fonctionnement connexion

1. L'utilisateur arrive sur l'application.
2. `AuthGate` affiche la page de connexion.
3. L'utilisateur se connecte avec son email Supabase Auth et son mot de passe.
4. `src/services/supabaseAuth.ts` vérifie que l'utilisateur possède une ligne active dans `suivi_gestion_user_access`.
5. Si l'accès est actif, l'application charge les données.
6. Sinon, l'accès est refusé.

## Création utilisateur

L'envoi d'email d'invitation est désactivé temporairement.

Raison : le projet Supabase est partagé avec Gestion Commandes et le template/lien d'invitation pointe actuellement vers `localhost`. Modifier les paramètres globaux Supabase Auth à chaud pourrait impacter l'autre application.

Méthode actuelle validée :

1. Aller sur la page utilisateurs depuis l'accueil ou `/#/utilisateurs`.
2. Renseigner l'email.
3. Renseigner le nom si besoin.
4. Choisir le rôle : `Global admin` ou `Utilisateur` selon ton propre rôle.
5. Renseigner un mot de passe temporaire d'au moins 8 caractères.
6. Créer l'utilisateur.
7. Donner à la personne l'URL de l'application, son email et son mot de passe temporaire.

Important : pour le moment, le changement obligatoire du mot de passe temporaire n'est pas encore forcé dans l'application.

## Super admin initial

Ton compte a été passé en `super_admin` dans `public.suivi_gestion_user_access`.

Requête type si besoin de refaire l'opération :

```sql
update public.suivi_gestion_user_access
set role = 'super_admin',
    is_active = true,
    full_name = 'Nicolas'
where lower(email) = 'npringy@gmail.com';
```

## Configuration Vercel requise

Variables nécessaires :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY` ;
- `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` doit rester uniquement côté serveur Vercel. Ne jamais l'utiliser dans le front.

## Tests validés / à vérifier

Validé :

- build Vercel OK après activation AuthGate ;
- connexion Nicolas `super_admin` OK ;
- page utilisateurs affiche Nicolas en `Super admin` intouchable ;
- création utilisateur avec mot de passe temporaire fonctionne ;
- email d'invitation identifié comme non fiable à cause du lien `localhost`, donc option retirée de l'interface.

À vérifier régulièrement :

- un utilisateur `user` peut se connecter et accéder à l'application ;
- un utilisateur `user` ne voit pas / ne peut pas gérer la page utilisateurs ;
- un `global_admin` peut créer un `user` mais ne peut pas modifier le `super_admin` ;
- Gestion Commandes fonctionne toujours normalement.

## À faire plus tard

- Remettre proprement les invitations email avec une redirection spécifique à Suivi, sans casser Gestion Commandes.
- Ajouter une page de changement de mot de passe si besoin.
- Améliorer le placement visuel de l'accès `Utilisateurs` dans l'accueil si nécessaire.
