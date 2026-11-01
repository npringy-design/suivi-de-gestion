-- Registre des sites de Suivi de gestion (création de site dynamique).
-- A executer une seule fois dans Supabase SQL Editor, apres APP_STATE_SETUP.sql / SUIVI_ROLES_SETUP.sql.
-- Strictement additif : ne touche ni suivi_gestion_app_state ni suivi_gestion_user_site_access.
-- Les ecritures (insert/update) passent par /api/suiviAccount (cle service, role super_admin verifie
-- cote API) : aucune policy d'ecriture n'est donc creee pour le role authenticated.

create table if not exists public.suivi_gestion_sites (
  site_id text primary key,
  label text not null,
  brand text not null check (brand in ('hippo', 'au_bureau')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.suivi_gestion_sites enable row level security;

drop policy if exists "suivi_gestion_sites_read" on public.suivi_gestion_sites;
create policy "suivi_gestion_sites_read"
on public.suivi_gestion_sites
for select
to authenticated
using (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
  )
);

-- Sites existants (sans effet s'ils sont deja presents).
insert into public.suivi_gestion_sites (site_id, label, brand)
values
  ('hippo_thillois', 'Hippopotamus Thillois', 'hippo'),
  ('hippo_cormontreuil', 'Hippo Cormontreuil', 'hippo')
on conflict (site_id) do nothing;
