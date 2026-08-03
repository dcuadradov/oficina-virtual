-- =============================================================================
-- Presupuesto de presentación + soporte draft/run_id
--
-- Modelo:
--   - Durante la presentación se guardan filas DRAFT (run_id IS NULL).
--   - Al Generar: se crea lead_presentation_runs y se asocia (SET run_id).
--   - Al Salir sin Generar: se borran solo drafts (run_id IS NULL).
--   - leads NUNCA se borra.
-- =============================================================================

-- 1) lead_presentation_data: pasar de PK card_id → id uuid + run_id draft
alter table public.lead_presentation_data
  add column if not exists id uuid;

update public.lead_presentation_data
set id = gen_random_uuid()
where id is null;

alter table public.lead_presentation_data
  alter column id set default gen_random_uuid(),
  alter column id set not null;

-- Quitar PK antigua (card_id) si existe
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'lead_presentation_data'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name = 'lead_presentation_data_pkey'
  ) then
    alter table public.lead_presentation_data drop constraint lead_presentation_data_pkey;
  end if;
end $$;

alter table public.lead_presentation_data
  add primary key (id);

alter table public.lead_presentation_data
  add column if not exists run_id uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'lead_presentation_data'
      and constraint_name = 'lead_presentation_data_run_id_fkey'
  ) then
    alter table public.lead_presentation_data
      add constraint lead_presentation_data_run_id_fkey
      foreign key (run_id) references public.lead_presentation_runs(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists lead_presentation_data_draft_card_unique
  on public.lead_presentation_data (card_id)
  where run_id is null;

create unique index if not exists lead_presentation_data_run_unique
  on public.lead_presentation_data (run_id)
  where run_id is not null;

-- 2) lead_presentation_budget (1 fila draft / 1 por run)
create table if not exists public.lead_presentation_budget (
  id                     uuid           primary key default gen_random_uuid(),
  card_id                text           not null,
  run_id                 uuid           references public.lead_presentation_runs(id) on delete set null,
  inversion_regular      numeric(14, 2),
  bono                   numeric(14, 2),
  inversion_final_hoy    numeric(14, 2),
  beneficio_exclusivo    numeric(14, 2),
  inversion_final        numeric(14, 2),
  equivalente_a          text,
  comentarios            text,
  updated_by             text,
  created_at             timestamptz    not null default now(),
  updated_at             timestamptz    not null default now()
);

create unique index if not exists lead_presentation_budget_draft_card_unique
  on public.lead_presentation_budget (card_id)
  where run_id is null;

create unique index if not exists lead_presentation_budget_run_unique
  on public.lead_presentation_budget (run_id)
  where run_id is not null;

create index if not exists idx_lead_presentation_budget_card_id
  on public.lead_presentation_budget (card_id);

comment on table public.lead_presentation_budget is
  'Presupuesto / modalidad de contado de la presentación (draft o asociado a un run).';

-- 3) lead_presentation_budget_options (hasta 3 planes por draft/run)
create table if not exists public.lead_presentation_budget_options (
  id                 uuid           primary key default gen_random_uuid(),
  card_id            text           not null,
  run_id             uuid           references public.lead_presentation_runs(id) on delete set null,
  budget_id          uuid           not null references public.lead_presentation_budget(id) on delete cascade,
  sort_order         integer        not null,
  plan               text,
  inscripcion        numeric(14, 2),
  meses              integer,
  cuota_mensual      numeric(14, 2),
  valor_aproximado   text,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now(),
  constraint lead_presentation_budget_options_sort_check check (sort_order >= 1 and sort_order <= 3)
);

create unique index if not exists lead_presentation_budget_options_budget_sort_unique
  on public.lead_presentation_budget_options (budget_id, sort_order);

create index if not exists idx_lead_presentation_budget_options_card_id
  on public.lead_presentation_budget_options (card_id);

comment on table public.lead_presentation_budget_options is
  'Hasta 3 planes/alternativas de inversión por presupuesto de presentación.';

-- RLS
alter table public.lead_presentation_budget enable row level security;
alter table public.lead_presentation_budget_options enable row level security;

drop policy if exists "lead_presentation_budget_select_authenticated" on public.lead_presentation_budget;
create policy "lead_presentation_budget_select_authenticated"
  on public.lead_presentation_budget for select to authenticated using (true);

drop policy if exists "lead_presentation_budget_insert_authenticated" on public.lead_presentation_budget;
create policy "lead_presentation_budget_insert_authenticated"
  on public.lead_presentation_budget for insert to authenticated with check (true);

drop policy if exists "lead_presentation_budget_update_authenticated" on public.lead_presentation_budget;
create policy "lead_presentation_budget_update_authenticated"
  on public.lead_presentation_budget for update to authenticated using (true) with check (true);

drop policy if exists "lead_presentation_budget_delete_authenticated" on public.lead_presentation_budget;
create policy "lead_presentation_budget_delete_authenticated"
  on public.lead_presentation_budget for delete to authenticated using (true);

drop policy if exists "lead_presentation_budget_select_anon" on public.lead_presentation_budget;
create policy "lead_presentation_budget_select_anon"
  on public.lead_presentation_budget for select to anon using (true);

drop policy if exists "lead_presentation_budget_options_select_authenticated" on public.lead_presentation_budget_options;
create policy "lead_presentation_budget_options_select_authenticated"
  on public.lead_presentation_budget_options for select to authenticated using (true);

drop policy if exists "lead_presentation_budget_options_insert_authenticated" on public.lead_presentation_budget_options;
create policy "lead_presentation_budget_options_insert_authenticated"
  on public.lead_presentation_budget_options for insert to authenticated with check (true);

drop policy if exists "lead_presentation_budget_options_update_authenticated" on public.lead_presentation_budget_options;
create policy "lead_presentation_budget_options_update_authenticated"
  on public.lead_presentation_budget_options for update to authenticated using (true) with check (true);

drop policy if exists "lead_presentation_budget_options_delete_authenticated" on public.lead_presentation_budget_options;
create policy "lead_presentation_budget_options_delete_authenticated"
  on public.lead_presentation_budget_options for delete to authenticated using (true);

drop policy if exists "lead_presentation_budget_options_select_anon" on public.lead_presentation_budget_options;
create policy "lead_presentation_budget_options_select_anon"
  on public.lead_presentation_budget_options for select to anon using (true);

-- Permitir borrar drafts de presentation_data
drop policy if exists "lead_presentation_data_delete_authenticated" on public.lead_presentation_data;
create policy "lead_presentation_data_delete_authenticated"
  on public.lead_presentation_data for delete to authenticated using (true);
