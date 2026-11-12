-- =============================================================================
-- Contacto: LNE. / MNE. = número errado.
-- Entran a contacto_intento (prioridad 0, pierden ante LNC/MNC).
-- No son contestación ni “no contestó”. El heatmap no los usa.
--
-- Idempotente. Ejecutar a mano en staging y producción. Después:
--   select public.fn_contacto_materializar(
--     '2026-11-04',
--     (timezone('America/Bogota', now()))::date
--   );
-- =============================================================================

begin;

create or replace function public.fn_contacto_prioridad(p_resultado text)
returns integer
language sql
immutable
as $$
  select case p_resultado
    when 'LA.' then 3
    when 'MA.' then 3
    when 'LC.' then 2
    when 'MC.' then 2
    when 'LNC.' then 1
    when 'MNC.' then 1
    when 'LNE.' then 0
    when 'MNE.' then 0
    else -1
  end;
$$;

create or replace function public.fn_contacto_materializar(p_desde date, p_hasta date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde_ts timestamptz;
  v_hasta_ts timestamptz;
  v_filas integer := 0;
begin
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    return 0;
  end if;

  v_desde_ts := p_desde::timestamp at time zone 'America/Bogota';
  v_hasta_ts := (p_hasta + 1)::timestamp at time zone 'America/Bogota';

  delete from public.contacto_intento
  where fecha >= p_desde and fecha <= p_hasta;

  insert into public.contacto_intento (
    fecha, hora, dia_semana, lead_id, seguimiento_id,
    canal, resultado, autor_email, origen, fuente_id, intentado_at
  )
  select
    (timezone('America/Bogota', src.created_at))::date,
    extract(hour from timezone('America/Bogota', src.created_at))::smallint,
    extract(isodow from timezone('America/Bogota', src.created_at))::smallint,
    src.lead_id,
    src.seguimiento_id,
    canal.canal,
    canal.resultado,
    src.autor_email,
    src.origen,
    src.fuente_id,
    src.created_at
  from (
    select
      c.id::text as fuente_id,
      'comentario'::text as origen,
      c.id::text as seguimiento_id,
      c.lead_id,
      c.autor_email,
      c.llamada,
      c.mensaje,
      c.created_at
    from public.comentarios c
    where (c.llamada is not null or c.mensaje is not null)
      and c.created_at >= v_desde_ts
      and c.created_at < v_hasta_ts

    union all

    select
      r.id::text as fuente_id,
      'recordatorio'::text as origen,
      r.id::text as seguimiento_id,
      r.lead_id,
      r.creado_por,
      r.llamada,
      r.mensaje,
      r.created_at
    from public.recordatorios r
    where (r.llamada is not null or r.mensaje is not null)
      and r.created_at >= v_desde_ts
      and r.created_at < v_hasta_ts
      and not exists (
        select 1
        from public.comentarios c
        where c.lead_id = r.lead_id
          and c.texto is not distinct from r.observacion
          and abs(extract(epoch from (c.created_at - r.created_at))) <= 60
          and (c.llamada is not null or c.mensaje is not null)
      )
  ) src
  cross join lateral (
    values
      ('llamada'::text, src.llamada),
      ('mensaje'::text, src.mensaje)
  ) as canal(canal, resultado)
  where canal.resultado is not null
    and public.fn_contacto_prioridad(canal.resultado) >= 0;

  get diagnostics v_filas = row_count;

  delete from public.contacto_diario
  where fecha >= p_desde and fecha <= p_hasta;

  insert into public.contacto_diario (
    fecha, lead_id, canal, resultado, autor_email, intentos, seguimientos
  )
  select
    i.fecha,
    i.lead_id,
    i.canal,
    (array_agg(i.resultado order by public.fn_contacto_prioridad(i.resultado) desc, i.hora desc))[1],
    (array_agg(i.autor_email order by public.fn_contacto_prioridad(i.resultado) desc, i.hora desc))[1],
    count(*)::integer,
    count(distinct i.seguimiento_id)::integer
  from public.contacto_intento i
  where i.fecha >= p_desde and i.fecha <= p_hasta
  group by i.fecha, i.lead_id, i.canal;

  return v_filas;
end;
$$;

notify pgrst, 'reload schema';

commit;
