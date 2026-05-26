-- Setup minimal pour la sauvegarde centralisee de Suivi de gestion.
-- A executer une seule fois dans Supabase SQL Editor.

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_app_state_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "app_state_public_read" on public.app_state;
create policy "app_state_public_read"
on public.app_state
for select
to anon, authenticated
using (true);

drop policy if exists "app_state_public_insert" on public.app_state;
create policy "app_state_public_insert"
on public.app_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_state_public_update" on public.app_state;
create policy "app_state_public_update"
on public.app_state
for update
to anon, authenticated
using (true)
with check (true);

-- Pour une version multi-etablissements plus avancee, il faudra ensuite ajouter site_id
-- et remplacer la cle unique simple par une cle composee ou une convention stricte de key.
