-- =============================================================================
-- Tabla: pitches_resultados
-- Descripción: Historial transaccional de resultados de Pitch por lead.
--              Cada vez que el comercial registra el resultado de un pitch
--              en el sub-tab "Pitch" del LeadSidebar, se inserta una fila aquí.
--              Un mismo card_id puede tener N filas (un pitch por intento).
-- =============================================================================

create table if not exists public.pitches_resultados (
  id           uuid        primary key default gen_random_uuid(),
  card_id      text        not null,
  attended     text,
  pitch_stage  text,
  pitch_result text,
  rescheduled  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índice para listar rápido los pitches de un lead ordenados por fecha
create index if not exists idx_pitches_resultados_card_id_created_at
  on public.pitches_resultados (card_id, created_at desc);

-- Trigger para mantener updated_at sincronizado en cada UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pitches_resultados_set_updated_at on public.pitches_resultados;

create trigger trg_pitches_resultados_set_updated_at
  before update on public.pitches_resultados
  for each row
  execute function public.set_updated_at();

-- =============================================================================
-- (Opcional) Habilitar RLS si tu proyecto lo usa. Por defecto la dejamos
-- abierta a usuarios autenticados; ajusta políticas según tu modelo.
-- =============================================================================

alter table public.pitches_resultados enable row level security;

drop policy if exists "pitches_resultados_select_authenticated" on public.pitches_resultados;
create policy "pitches_resultados_select_authenticated"
  on public.pitches_resultados
  for select
  to authenticated
  using (true);

drop policy if exists "pitches_resultados_insert_authenticated" on public.pitches_resultados;
create policy "pitches_resultados_insert_authenticated"
  on public.pitches_resultados
  for insert
  to authenticated
  with check (true);

drop policy if exists "pitches_resultados_update_authenticated" on public.pitches_resultados;
create policy "pitches_resultados_update_authenticated"
  on public.pitches_resultados
  for update
  to authenticated
  using (true)
  with check (true);
