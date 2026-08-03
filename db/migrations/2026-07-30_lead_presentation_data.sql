-- =============================================================================
-- Tabla: lead_presentation_data
-- Descripción: Datos del formulario de la presentación (Historial Médico y
--              siguientes slides). Una fila por lead (card_id). Se irán
--              agregando columnas a medida que se cableen más slides.
-- =============================================================================

create table if not exists public.lead_presentation_data (
  card_id                 text        primary key,
  antecedentes            text,
  resultado_antecedentes  text,
  viabilidad              text,
  resultado_viabilidad    text,
  autonomia               text,
  resultado_autonomia     text,
  conducta                text,
  resultado_conducta      text,
  updated_by              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.lead_presentation_data is
  'Datos editables de la presentación personalizada (1 fila por lead).';

create index if not exists idx_lead_presentation_data_updated_at
  on public.lead_presentation_data (updated_at desc);

alter table public.lead_presentation_data enable row level security;

-- Comerciales autenticados: leer / insertar / actualizar
drop policy if exists "lead_presentation_data_select_authenticated" on public.lead_presentation_data;
create policy "lead_presentation_data_select_authenticated"
  on public.lead_presentation_data
  for select
  to authenticated
  using (true);

drop policy if exists "lead_presentation_data_insert_authenticated" on public.lead_presentation_data;
create policy "lead_presentation_data_insert_authenticated"
  on public.lead_presentation_data
  for insert
  to authenticated
  with check (true);

drop policy if exists "lead_presentation_data_update_authenticated" on public.lead_presentation_data;
create policy "lead_presentation_data_update_authenticated"
  on public.lead_presentation_data
  for update
  to authenticated
  using (true)
  with check (true);

-- Público (anon): lectura para /result/:version/:cardId
drop policy if exists "lead_presentation_data_select_anon" on public.lead_presentation_data;
create policy "lead_presentation_data_select_anon"
  on public.lead_presentation_data
  for select
  to anon
  using (true);
