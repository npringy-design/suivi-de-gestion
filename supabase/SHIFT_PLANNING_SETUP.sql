-- Planning des shifts (étape 1) : documents JSON par site, réservés au super_admin.
-- À exécuter une fois dans Supabase SQL Editor (après APP_STATE_SETUP.sql : réutilise
-- public.set_suivi_gestion_updated_at et public.suivi_gestion_user_access).
-- doc_key : 'settings', 'staff', 'absences', 'week-AAAA-MM-JJ' (lundi de la semaine).

create table if not exists public.suivi_gestion_shift_planning (
  site_id text not null,
  doc_key text not null,
  data jsonb not null,
  updated_at timestamptz default now(),
  primary key (site_id, doc_key)
);

drop trigger if exists trg_suivi_gestion_shift_planning_updated_at on public.suivi_gestion_shift_planning;
create trigger trg_suivi_gestion_shift_planning_updated_at
before update on public.suivi_gestion_shift_planning
for each row
execute function public.set_suivi_gestion_updated_at();

alter table public.suivi_gestion_shift_planning enable row level security;

drop policy if exists "suivi_gestion_shift_planning_select" on public.suivi_gestion_shift_planning;
create policy "suivi_gestion_shift_planning_select"
on public.suivi_gestion_shift_planning
for select
to authenticated
using (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
      and access.role = 'super_admin'
  )
);

drop policy if exists "suivi_gestion_shift_planning_insert" on public.suivi_gestion_shift_planning;
create policy "suivi_gestion_shift_planning_insert"
on public.suivi_gestion_shift_planning
for insert
to authenticated
with check (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
      and access.role = 'super_admin'
  )
);

drop policy if exists "suivi_gestion_shift_planning_update" on public.suivi_gestion_shift_planning;
create policy "suivi_gestion_shift_planning_update"
on public.suivi_gestion_shift_planning
for update
to authenticated
using (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
      and access.role = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.suivi_gestion_user_access access
    where access.user_id = auth.uid()
      and access.is_active = true
      and access.role = 'super_admin'
  )
);
