-- Droits par site sur suivi_gestion_app_state (lecture et écriture des données de suivi).
-- A executer une seule fois dans Supabase SQL Editor, apres APP_STATE_SETUP.sql, SUIVI_ROLES_SETUP.sql
-- et SITES_SETUP.sql. Remplace les 3 policies de APP_STATE_SETUP.sql, qui laissaient tout utilisateur
-- actif lire et écrire les données de TOUS les sites (le filtrage par site n'existait que dans l'appli).
--
-- Règle : super_admin et global_admin accèdent à tous les sites ; un utilisateur 'user' accède
-- uniquement aux sites listés pour lui (actifs) dans suivi_gestion_user_site_access.

create or replace function public.suivi_gestion_can_access_site(target_site_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
      and (
        access.role in ('super_admin', 'global_admin')
        or exists (
          select 1
          from public.suivi_gestion_user_site_access site_access
          where site_access.user_id = auth.uid()
            and site_access.site_id = target_site_id
            and site_access.is_active = true
        )
      )
  );
$$;

revoke all on function public.suivi_gestion_can_access_site(text) from public;
grant execute on function public.suivi_gestion_can_access_site(text) to authenticated;

drop policy if exists "suivi_gestion_app_state_read" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_read"
on public.suivi_gestion_app_state
for select
to authenticated
using (public.suivi_gestion_can_access_site(site_id));

drop policy if exists "suivi_gestion_app_state_insert" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_insert"
on public.suivi_gestion_app_state
for insert
to authenticated
with check (public.suivi_gestion_can_access_site(site_id));

drop policy if exists "suivi_gestion_app_state_update" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_update"
on public.suivi_gestion_app_state
for update
to authenticated
using (public.suivi_gestion_can_access_site(site_id))
with check (public.suivi_gestion_can_access_site(site_id));

-- Vérification (doit lister les 3 policies avec suivi_gestion_can_access_site) :
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'suivi_gestion_app_state';
