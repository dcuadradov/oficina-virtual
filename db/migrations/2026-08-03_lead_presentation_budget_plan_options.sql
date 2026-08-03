-- =============================================================================
-- Catálogo de planes de vinculación + campo valor_vinculacion en budget
-- + cuota_mensual como text (permite "No aplica" en alternativas 1–4).
-- =============================================================================

begin;

-- 1) Catálogo
create table if not exists public.lead_presentation_budget_plan_options (
  id              uuid           primary key default gen_random_uuid(),
  plan_numero     integer        not null unique,
  usuarios        integer        not null,
  plan_nombre      text           not null,
  inscripcion     numeric(14, 2) not null,
  descuento       text           not null,
  meses           integer        not null,
  cuota_mensual   numeric(14, 2),
  created_at      timestamptz    not null default now()
);

comment on table public.lead_presentation_budget_plan_options is
  'Catálogo de planes (Elite, Platinum, Gold, …) para autocompletar presupuesto.';

alter table public.lead_presentation_budget_plan_options enable row level security;

drop policy if exists "budget_plan_options_select_authenticated"
  on public.lead_presentation_budget_plan_options;
create policy "budget_plan_options_select_authenticated"
  on public.lead_presentation_budget_plan_options
  for select to authenticated
  using (true);

drop policy if exists "budget_plan_options_select_anon"
  on public.lead_presentation_budget_plan_options;
create policy "budget_plan_options_select_anon"
  on public.lead_presentation_budget_plan_options
  for select to anon
  using (true);

insert into public.lead_presentation_budget_plan_options
  (plan_numero, usuarios, plan_nombre, inscripcion, descuento, meses, cuota_mensual)
values
  (1, 1, 'Elite',     1734, '15%',  1, 1734),
  (2, 2, 'Platinum',  1632, '20%',  1, 1632),
  (3, 1, 'Gold 1',    1734, '15%',  2,  867),
  (4, 2, 'Gold 2',    1632, '20%',  2,  816),
  (5, 1, 'Silver',    2040, 'N/A',  4,  510),
  (6, 1, 'Bronze',    2040, 'N/A',  6,  340),
  (7, 1, 'Standard',  2040, 'N/A',  8,  255),
  (8, 1, 'Essential', 2040, 'N/A', 10,  204),
  (9, 1, 'Basic',     2040, 'N/A', 12,  170)
on conflict (plan_numero) do update set
  usuarios      = excluded.usuarios,
  plan_nombre   = excluded.plan_nombre,
  inscripcion   = excluded.inscripcion,
  descuento     = excluded.descuento,
  meses         = excluded.meses,
  cuota_mensual = excluded.cuota_mensual;

-- 2) valor_vinculacion en budget (campo "en lugar de invertir" de modalidad)
alter table public.lead_presentation_budget
  add column if not exists valor_vinculacion numeric(14, 2);

comment on column public.lead_presentation_budget.valor_vinculacion is
  'Precio del plan en modalidad contado ("en lugar de invertir").';

-- 3) cuota_mensual en alternativas: text para permitir "No aplica"
alter table public.lead_presentation_budget_options
  alter column cuota_mensual type text using cuota_mensual::text;

commit;
