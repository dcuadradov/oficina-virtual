-- =============================================================================
-- Tabla: lead_presentation_runs
-- Descripción: Cada "Generar" de la presentación personalizada crea una fila
--              versionada por card_id. El path guarda los slides realmente
--              mostrados; form_data las respuestas de formularios; lead_snapshot
--              los datos del lead al momento de generar (para /result público).
-- =============================================================================

create table if not exists public.lead_presentation_runs (
  id            uuid        primary key default gen_random_uuid(),
  card_id       text        not null,
  version       integer     not null,
  path          jsonb       not null default '[]'::jsonb,
  form_data     jsonb       not null default '{}'::jsonb,
  lead_snapshot jsonb       not null default '{}'::jsonb,
  created_by    text,
  created_at    timestamptz not null default now(),
  constraint lead_presentation_runs_card_version_unique unique (card_id, version),
  constraint lead_presentation_runs_version_positive check (version >= 1)
);

create index if not exists idx_lead_presentation_runs_card_id_version
  on public.lead_presentation_runs (card_id, version desc);

comment on table public.lead_presentation_runs is
  'Runs versionados de la presentación personalizada (Pitch → Presentación).';

alter table public.lead_presentation_runs enable row level security;

-- Comerciales autenticados: leer / crear
drop policy if exists "lead_presentation_runs_select_authenticated" on public.lead_presentation_runs;
create policy "lead_presentation_runs_select_authenticated"
  on public.lead_presentation_runs
  for select
  to authenticated
  using (true);

drop policy if exists "lead_presentation_runs_insert_authenticated" on public.lead_presentation_runs;
create policy "lead_presentation_runs_insert_authenticated"
  on public.lead_presentation_runs
  for insert
  to authenticated
  with check (true);

-- Público (anon): solo lectura del resultado generado (link /result/:version/:cardId)
drop policy if exists "lead_presentation_runs_select_anon" on public.lead_presentation_runs;
create policy "lead_presentation_runs_select_anon"
  on public.lead_presentation_runs
  for select
  to anon
  using (true);
