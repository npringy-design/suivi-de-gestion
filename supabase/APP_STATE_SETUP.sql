-- Setup minimal pour la sauvegarde centralisee de Suivi de gestion.
-- A executer une seule fois dans Supabase SQL Editor.
-- Cette table est volontairement separee de Gestion Commandes Doquet.
-- Ne pas modifier les tables/policies de Gestion Commandes Doquet avec ce script.

create table if not exists public.suivi_gestion_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suivi_gestion_app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_suivi_gestion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_suivi_gestion_user_access_updated_at on public.suivi_gestion_user_access;
create trigger trg_suivi_gestion_user_access_updated_at
before update on public.suivi_gestion_user_access
for each row
execute function public.set_suivi_gestion_updated_at();

drop trigger if exists trg_suivi_gestion_app_state_updated_at on public.suivi_gestion_app_state;
create trigger trg_suivi_gestion_app_state_updated_at
before update on public.suivi_gestion_app_state
for each row
execute function public.set_suivi_gestion_updated_at();

alter table public.suivi_gestion_user_access enable row level security;
alter table public.suivi_gestion_app_state enable row level security;

drop policy if exists "suivi_gestion_user_access_read_own" on public.suivi_gestion_user_access;
create policy "suivi_gestion_user_access_read_own"
on public.suivi_gestion_user_access
for select
to authenticated
using (user_id = auth.uid() and is_active = true);

drop policy if exists "suivi_gestion_app_state_read" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_read"
on public.suivi_gestion_app_state
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

drop policy if exists "suivi_gestion_app_state_insert" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_insert"
on public.suivi_gestion_app_state
for insert
to authenticated
with check (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
  )
);

drop policy if exists "suivi_gestion_app_state_update" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_update"
on public.suivi_gestion_app_state
for update
to authenticated
using (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
  )
);

-- Ajouter un utilisateur autorise sur Suivi de gestion :
-- 1) creer ou retrouver l'utilisateur dans Supabase Authentication > Users ;
-- 2) copier son UUID ;
-- 3) executer :
-- insert into public.suivi_gestion_user_access (user_id, email, role, is_active)
-- values ('UUID_UTILISATEUR', 'email@exemple.fr', 'admin', true)
-- on conflict (user_id) do update set email = excluded.email, role = excluded.role, is_active = true;

-- Important :
-- - un utilisateur Supabase Auth peut exister pour Gestion Commandes sans etre autorise sur Suivi de gestion ;
-- - seul un utilisateur present et actif dans suivi_gestion_user_access peut acceder aux donnees Suivi de gestion ;
-- - ne pas redonner de droits anon sur ces tables.
