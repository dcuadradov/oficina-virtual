-- =============================================================================
-- Refrescar vw_pitches_calendario para incluir columnas nuevas de leads
-- (p. ej. setter_email, setter_nombre) añadidas después de crear la vista.
--
-- En PostgreSQL, SELECT l.* en una vista fija las columnas al momento del
-- CREATE VIEW; no se actualizan solas cuando leads gana columnas nuevas.
--
-- Idempotente: drop + create. Ejecutar en staging y producción.
-- =============================================================================

begin;

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
where (l.fase_id_pipefy is null
       or l.fase_id_pipefy not in ('339756098', '340566951', '340859031'))
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
where l.fase_id_pipefy in ('339756098', '340566951', '340859031')
  and l.fecha_pitch is not null;

grant select on public.vw_pitches_calendario to authenticated;

create index if not exists idx_leads_setter_email
  on public.leads (setter_email)
  where setter_email is not null;

notify pgrst, 'reload schema';

commit;
