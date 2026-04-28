-- =============================================================================
-- Migración: contadores de Pitch en leads + columnas extra en
-- pitches_resultados + trigger de incremento + backfill histórico
--
-- Idempotente: usa `if not exists` para columnas y `not exists` para
-- los inserts. Se puede correr más de una vez sin duplicar tarjetas.
--
-- Las tarjetas creadas en backfill se distinguen por estado='backfill'
-- para poderlas identificar después si se necesita corregir manualmente.
-- =============================================================================

begin;

-- =============================================================================
-- 1) NUEVAS COLUMNAS
-- =============================================================================

-- 1.1) Contadores en leads
alter table public.leads
  add column if not exists pitch_intentos     integer not null default 0,
  add column if not exists pitch_seguimientos integer not null default 0;

-- 1.2) Columnas adicionales en pitches_resultados
alter table public.pitches_resultados
  add column if not exists fecha_pitch  timestamptz,
  add column if not exists pitch_numero integer,
  add column if not exists estado       text not null default 'registrado';

-- 1.3) Índice por (card_id, fecha_pitch) para búsquedas eficientes desde la UI
create index if not exists idx_pitches_resultados_card_id_fecha_pitch
  on public.pitches_resultados (card_id, fecha_pitch);

-- =============================================================================
-- 2) TRIGGER: incrementar leads.pitch_intentos cada vez que un lead entra
--    a la fase Pitch (340566951). El webhook de Pipefy hace UPDATE de
--    fase_id_pipefy → este trigger reacciona y mantiene el contador.
-- =============================================================================
create or replace function public.fn_increment_pitch_intentos()
returns trigger
language plpgsql
as $$
begin
  if new.fase_id_pipefy = '340566951'
     and (old.fase_id_pipefy is distinct from new.fase_id_pipefy) then
    new.pitch_intentos := coalesce(old.pitch_intentos, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_increment_pitch_intentos on public.leads;
create trigger trg_leads_increment_pitch_intentos
  before update of fase_id_pipefy on public.leads
  for each row
  execute function public.fn_increment_pitch_intentos();

-- =============================================================================
-- 3) BACKFILL — leads con fecha_pitch que ya pasaron por Pitch
--    Reglas confirmadas con el equipo (2026-04-27)
-- =============================================================================

-- 3.1) 340484139, 341775176 → asistió pero no se matriculó
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'Si', null, 'No matrícula', 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy in ('340484139', '341775176')
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy in ('340484139', '341775176');

-- 3.2) 340859031 → no asistió y reprogramó
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'No', null, null, 'Si',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy = '340859031'
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy = '340859031';

-- 3.3) 340483950 → asistió, etapa 5, interés futuro
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'Si', '5', 'Interés futuro', 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy = '340483950'
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy = '340483950';

-- 3.4) 339756299, 341769763 → matrícula confirmada
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'Si', '5', 'Matrícula', 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy in ('339756299', '341769763')
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy in ('339756299', '341769763');

-- 3.5) 340643642 → asistió, pago pendiente
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'Si', '5', 'Pago pendiente', 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy = '340643642'
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy = '340643642';

-- 3.6) 340643263 → asistió, posible matrícula
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'Si', '5', 'Posible matrícula', 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy = '340643263'
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy = '340643263';

-- 3.7) 340855086 → no asistió y NO reprogramó
insert into public.pitches_resultados (
  card_id, attended, pitch_stage, pitch_result, rescheduled,
  pitch_numero, fecha_pitch, estado
)
select l.card_id, 'No', null, null, 'No',
       1, l.fecha_pitch, 'backfill'
from public.leads l
where l.fecha_pitch is not null
  and l.fase_id_pipefy = '340855086'
  and not exists (
    select 1 from public.pitches_resultados pr where pr.card_id = l.card_id
  );

update public.leads
set pitch_intentos = 1, pitch_seguimientos = 1
where fecha_pitch is not null
  and fase_id_pipefy = '340855086';

-- 3.8) 340566951 (fase Pitch activa) → SIN tarjeta. Solo contadores
--      pitch_intentos=1, pitch_seguimientos=0 para que el form quede HABILITADO.
update public.leads
set pitch_intentos = 1, pitch_seguimientos = 0
where fecha_pitch is not null
  and fase_id_pipefy = '340566951';

commit;

-- =============================================================================
-- 4) VERIFICACIÓN — corre estas queries DESPUÉS de la migración
-- =============================================================================

-- 4.1) Resumen por fase: leads con fecha_pitch + sus contadores + tarjetas
-- select
--   l.fase_id_pipefy,
--   l.fase_nombre_pipefy,
--   count(*) as total_leads,
--   sum(case when l.pitch_intentos     > 0 then 1 else 0 end) as con_intentos,
--   sum(case when l.pitch_seguimientos > 0 then 1 else 0 end) as con_seguimientos,
--   count(distinct pr.id) as tarjetas_existentes
-- from public.leads l
-- left join public.pitches_resultados pr on pr.card_id = l.card_id
-- where l.fecha_pitch is not null
-- group by l.fase_id_pipefy, l.fase_nombre_pipefy
-- order by total_leads desc;

-- 4.2) Tarjetas creadas en este backfill (estado='backfill')
-- select fase_resumen.fase_id_pipefy, fase_resumen.fase_nombre_pipefy,
--        count(*) as tarjetas_backfill
-- from public.pitches_resultados pr
-- join public.leads l on l.card_id = pr.card_id
-- cross join lateral (
--   select l.fase_id_pipefy, l.fase_nombre_pipefy
-- ) fase_resumen
-- where pr.estado = 'backfill'
-- group by fase_resumen.fase_id_pipefy, fase_resumen.fase_nombre_pipefy
-- order by tarjetas_backfill desc;
