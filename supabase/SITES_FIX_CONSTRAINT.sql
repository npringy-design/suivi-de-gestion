-- Remplace les contraintes CHECK legacy sur site_id par des cles etrangeres vers suivi_gestion_sites.
--
-- ORDRE D'EXECUTION : a lancer APRES SITES_SETUP.sql. La table suivi_gestion_sites doit exister et
-- contenir tous les sites deja crees (y compris un site dont le bootstrap a echoue) avant de poser
-- les FK : une FK echoue si une ligne existante reference un site_id absent de suivi_gestion_sites.
--
-- Contexte : ces CHECK listaient en dur ('hippo_thillois', 'hippo_cormontreuil') et bloquaient la
-- creation de tout nouveau site (suivi_gestion_app_state_site_id_check violated). Elles avaient ete
-- posees a la main dans le SQL Editor, hors des scripts commites.
--
-- Verification avant execution (contraintes presentes et definition exacte) :
--   select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid) as def
--   from pg_constraint
--   where conname in (
--     'suivi_gestion_app_state_site_id_check',
--     'suivi_gestion_user_site_access_site_id_check'
--   );
--
-- Verification des lignes orphelines (doit retourner 0 ligne) :
--   select distinct site_id from public.suivi_gestion_app_state
--   where site_id not in (select site_id from public.suivi_gestion_sites)
--   union
--   select distinct site_id from public.suivi_gestion_user_site_access
--   where site_id not in (select site_id from public.suivi_gestion_sites);
--
-- Ne touche aucune autre contrainte (cles primaires (site_id, key) / (user_id, site_id) et FK
-- user_id -> auth.users inchangees) ni aucune autre table. Rejouable sans erreur.

-- suivi_gestion_app_state
alter table public.suivi_gestion_app_state
  drop constraint if exists suivi_gestion_app_state_site_id_check;

alter table public.suivi_gestion_app_state
  drop constraint if exists suivi_gestion_app_state_site_id_fkey;

alter table public.suivi_gestion_app_state
  add constraint suivi_gestion_app_state_site_id_fkey
  foreign key (site_id) references public.suivi_gestion_sites(site_id);

-- suivi_gestion_user_site_access
alter table public.suivi_gestion_user_site_access
  drop constraint if exists suivi_gestion_user_site_access_site_id_check;

alter table public.suivi_gestion_user_site_access
  drop constraint if exists suivi_gestion_user_site_access_site_id_fkey;

alter table public.suivi_gestion_user_site_access
  add constraint suivi_gestion_user_site_access_site_id_fkey
  foreign key (site_id) references public.suivi_gestion_sites(site_id);
