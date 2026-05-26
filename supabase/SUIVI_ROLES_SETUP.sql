-- Roles Suivi de gestion.
-- A executer apres AUTH_USERS_SETUP.sql.
-- Ne modifie pas Gestion Commandes.

update public.suivi_gestion_user_access
set role = 'global_admin'
where role = 'admin';

alter table public.suivi_gestion_user_access
  drop constraint if exists suivi_gestion_user_access_role_check;

alter table public.suivi_gestion_user_access
  add constraint suivi_gestion_user_access_role_check
  check (role in ('super_admin', 'global_admin', 'user'));

-- Role super_admin : Nicolas, intouchable dans l'interface.
-- Role global_admin : tous droits sauf action sur le super_admin.
-- Role user : acces application standard, sans page creation utilisateur.
