-- Setup authentification et gestion utilisateurs pour Suivi de gestion.
-- A executer dans Supabase SQL Editor.
-- Ce script ne modifie pas les tables de Gestion Commandes Doquet.
-- Ce script ne verrouille pas encore suivi_gestion_app_state : l'appli reste accessible tant que l'auth globale n'est pas validée.

create table if not exists public.suivi_gestion_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suivi_gestion_user_access
  add column if not exists full_name text;

create or replace function public.set_suivi_gestion_user_access_updated_at()
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
execute function public.set_suivi_gestion_user_access_updated_at();

alter table public.suivi_gestion_user_access enable row level security;

drop policy if exists "suivi_gestion_user_access_read_own" on public.suivi_gestion_user_access;
create policy "suivi_gestion_user_access_read_own"
on public.suivi_gestion_user_access
for select
to authenticated
using (user_id = auth.uid() and is_active = true);

-- IMPORTANT BOOTSTRAP ADMIN :
-- 1. Creer ton compte dans Supabase > Authentication > Users.
-- 2. Copier ton User UID.
-- 3. Executer la requete ci-dessous en remplacant UUID_UTILISATEUR et ton email.
--
-- insert into public.suivi_gestion_user_access (user_id, email, full_name, role, is_active)
-- values ('UUID_UTILISATEUR', 'ton-email@exemple.fr', 'Nicolas', 'admin', true)
-- on conflict (user_id) do update
-- set email = excluded.email,
--     full_name = excluded.full_name,
--     role = 'admin',
--     is_active = true;
