-- Setup minimal pour la sauvegarde centralisee de Suivi de gestion.
-- A executer une seule fois dans Supabase SQL Editor.
-- Cette table est volontairement separee de Gestion Commandes Doquet.

create table if not exists public.suivi_gestion_app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_suivi_gestion_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_suivi_gestion_app_state_updated_at on public.suivi_gestion_app_state;
create trigger trg_suivi_gestion_app_state_updated_at
before update on public.suivi_gestion_app_state
for each row
execute function public.set_suivi_gestion_app_state_updated_at();

alter table public.suivi_gestion_app_state enable row level security;

drop policy if exists "suivi_gestion_app_state_read" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_read"
on public.suivi_gestion_app_state
for select
to authenticated
using (true);

drop policy if exists "suivi_gestion_app_state_insert" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_insert"
on public.suivi_gestion_app_state
for insert
to authenticated
with check (true);

drop policy if exists "suivi_gestion_app_state_update" on public.suivi_gestion_app_state;
create policy "suivi_gestion_app_state_update"
on public.suivi_gestion_app_state
for update
to authenticated
using (true)
with check (true);

-- Authentification obligatoire :
-- - creer les utilisateurs dans Supabase Authentication > Users ;
-- - confirmer leur email ou leur definir un mot de passe ;
-- - ne pas redonner de droits anon sur cette table, sinon l'ecran de connexion ne protege plus vraiment les donnees.

-- Pour une version multi-etablissements plus avancee, il faudra ensuite ajouter site_id
-- ou garder une convention stricte de cle par site.
