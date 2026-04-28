-- ============================================================================
-- Vista unificada para el calendario "Mis Pitch".
--
-- Resuelve el conflicto de doble pintado cuando un lead está en fase Pitch
-- (340566951) y a la vez tiene un registro en pitches_resultados.
--
-- Reglas:
--   1) historial  → pitches_resultados de leads que YA salieron de la fase
--                   Pitch. Se pinta usando pitches_resultados.fecha_pitch.
--   2) agendado   → leads actualmente en fase Pitch (340566951) con
--                   fecha_pitch no nulo. Se pinta usando leads.fecha_pitch.
--
-- El frontend lee de la vista y nunca tiene que aplicar la regla manualmente.
-- ============================================================================

begin;

-- 1) Índices de soporte en `leads` para que la vista escale.
--    `if not exists` los hace idempotentes; si ya existen no pasa nada.
create index if not exists idx_leads_fase_id_pipefy
  on public.leads (fase_id_pipefy);

create index if not exists idx_leads_comercial_email
  on public.leads (comercial_email);

create index if not exists idx_leads_fecha_pitch
  on public.leads (fecha_pitch)
  where fecha_pitch is not null;

-- 2) Vista del calendario.
--    Usa `l.*` para exponer toda la fila del lead → el click en una tarjeta
--    puede abrir el LeadSidebar sin queries adicionales.
--    `fecha_pitch_calendario` es la fecha que el calendario debe usar para
--    pintar (historial = fecha del registro, agendado = fecha próxima).
--
--    Nota: las columnas que vienen de `pitches_resultados` se aliasan con
--    el prefijo `resultado_` porque `leads` ya tiene columnas con los mismos
--    nombres (attended, pitch_stage, pitch_result, rescheduled) por
--    sincronización histórica con Pipefy. Aliasarlas evita el error
--    "column specified more than once" y deja claro de dónde viene cada dato.
--
--    Usamos `drop` + `create` (en lugar de `create or replace`) porque al
--    cambiar nombres de columnas Postgres no permite `replace` directamente.
drop view if exists public.vw_pitches_calendario;

create view public.vw_pitches_calendario as
select
  l.*,
  'historial'::text       as origen,
  pr.id                   as pitch_resultado_id,
  pr.pitch_numero,
  pr.attended             as resultado_attended,
  pr.pitch_stage          as resultado_pitch_stage,
  pr.pitch_result         as resultado_pitch_result,
  pr.rescheduled          as resultado_rescheduled,
  pr.estado               as resultado_estado,
  pr.fecha_pitch          as fecha_pitch_calendario
from public.pitches_resultados pr
join public.leads l on l.card_id = pr.card_id
where l.fase_id_pipefy <> '340566951'
  and pr.fecha_pitch is not null

union all

select
  l.*,
  'agendado'::text        as origen,
  null::uuid              as pitch_resultado_id,
  l.pitch_intentos        as pitch_numero,
  null::text              as resultado_attended,
  null::text              as resultado_pitch_stage,
  null::text              as resultado_pitch_result,
  null::text              as resultado_rescheduled,
  null::text              as resultado_estado,
  l.fecha_pitch           as fecha_pitch_calendario
from public.leads l
where l.fase_id_pipefy = '340566951'
  and l.fecha_pitch is not null;

-- 3) Permisos. La vista hereda RLS de las tablas base (leads y
--    pitches_resultados), por lo que cualquier policy aplicada a esas
--    tablas también se aplica a la vista.
grant select on public.vw_pitches_calendario to authenticated;

commit;

-- ============================================================================
-- VERIFICACIÓN (correr suelto en la consola de SQL):
--
-- 1) Estructura
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'vw_pitches_calendario'
-- order by ordinal_position;
--
-- 2) Conteo por origen
-- select origen, count(*)
-- from public.vw_pitches_calendario
-- group by origen;
--
-- 3) Cardinalidad esperada del calendario para el mes en curso
-- select origen, count(*)
-- from public.vw_pitches_calendario
-- where fecha_pitch_calendario >= date_trunc('month', now())
--   and fecha_pitch_calendario <  date_trunc('month', now()) + interval '1 month'
-- group by origen;
--
-- 4) Plan de ejecución (debe usar idx_leads_fase_id_pipefy y el
--    idx_pitches_resultados_card_id_fecha_pitch existente)
-- explain analyze
-- select * from public.vw_pitches_calendario
-- where comercial_email = 'algun.correo@dominio.com'
--   and fecha_pitch_calendario >= now() - interval '7 days'
--   and fecha_pitch_calendario <= now() + interval '14 days';
-- ============================================================================
