-- =============================================================================
-- Contacto: intentos y resumen diario de llamadas / mensajes.
-- Una persona × día × canal = un resultado (LA > LC > LNC, MA > MC > MNC).
-- El heatmap lee cada intento con hora Colombia.
--
-- Idempotente. Ejecutar a mano en staging y producción.
-- Backfill una vez:
--   select public.fn_contacto_materializar('2026-11-04', (timezone('America/Bogota', now()))::date);
-- =============================================================================

begin;

create table if not exists public.contacto_intento (
  id bigint generated always as identity primary key,
  fecha date not null,
  hora smallint not null,
  dia_semana smallint not null,
  lead_id text not null,
  seguimiento_id text not null,
  canal text not null check (canal in ('llamada', 'mensaje')),
  resultado text not null,
  autor_email text,
  origen text not null check (origen in ('comentario', 'recordatorio')),
  fuente_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists contacto_intento_fuente_canal_uidx
  on public.contacto_intento (origen, fuente_id, canal);

create index if not exists contacto_intento_fecha_autor_idx
  on public.contacto_intento (fecha, autor_email);

create index if not exists contacto_intento_fecha_hora_idx
  on public.contacto_intento (fecha, dia_semana, hora);

create table if not exists public.contacto_diario (
  fecha date not null,
  lead_id text not null,
  canal text not null check (canal in ('llamada', 'mensaje')),
  resultado text not null,
  autor_email text,
  intentos integer not null default 1,
  seguimientos integer not null default 1,
  primary key (fecha, lead_id, canal)
);

create index if not exists contacto_diario_fecha_autor_idx
  on public.contacto_diario (fecha, autor_email);

alter table public.contacto_intento enable row level security;
alter table public.contacto_diario enable row level security;

drop policy if exists "Select contacto_intento autenticado" on public.contacto_intento;
create policy "Select contacto_intento autenticado"
  on public.contacto_intento for select to authenticated using (true);

drop policy if exists "Select contacto_diario autenticado" on public.contacto_diario;
create policy "Select contacto_diario autenticado"
  on public.contacto_diario for select to authenticated using (true);

grant select on public.contacto_intento to authenticated;
grant select on public.contacto_diario to authenticated;

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
    else 0
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
    canal, resultado, autor_email, origen, fuente_id
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
    src.fuente_id
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
    and public.fn_contacto_prioridad(canal.resultado) > 0;

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

revoke all on function public.fn_contacto_materializar(date, date) from public;
grant execute on function public.fn_contacto_materializar(date, date) to authenticated;

comment on table public.contacto_intento is
  'Cada llamada o mensaje registrado, con hora Colombia. Sirve al heatmap de Contacto.';
comment on table public.contacto_diario is
  'Una persona por día y canal. Gana el resultado más cerca del agendamiento, no el último.';
comment on function public.fn_contacto_materializar(date, date) is
  'Arma contacto_intento y contacto_diario entre dos fechas Colombia (inclusive).';

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'contacto-materializar'
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'contacto-materializar',
    '0 5 * * *',
    $cron$select public.fn_contacto_materializar(
      (timezone('America/Bogota', now()))::date - 7,
      (timezone('America/Bogota', now()))::date
    );$cron$
  );
exception
  when undefined_table then
    raise notice 'pg_cron no está activo; corre fn_contacto_materializar a mano.';
  when undefined_function then
    raise notice 'pg_cron no está activo; corre fn_contacto_materializar a mano.';
end;
$$;

notify pgrst, 'reload schema';

commit;
