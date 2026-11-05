-- =============================================================================
-- Copiar llamada/mensaje de recordatorios al comentario que crea el trigger.
-- El historial de Seguimiento lee comentarios; si el trigger no copia esas
-- columnas, el Detalle sale sin (MNC. - LNC.).
--
-- Trigger diferido: corre al commit, después de que el otro trigger inserte
-- el comentario. Backfill para filas ya guardadas.
--
-- Idempotente. Ejecutar manualmente en Supabase (staging y producción).
-- En Postgres 13 o anterior, cambia execute function por execute procedure.
-- =============================================================================

begin;

create or replace function public.fn_copiar_canal_recordatorio_a_comentario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.llamada is null and new.mensaje is null then
    return new;
  end if;

  update public.comentarios c
  set
    llamada = coalesce(new.llamada, c.llamada),
    mensaje = coalesce(new.mensaje, c.mensaje)
  where c.lead_id = new.lead_id
    and c.texto is not distinct from new.observacion
    and c.created_at >= coalesce(new.created_at, now()) - interval '1 minute'
    and c.created_at <= coalesce(new.created_at, now()) + interval '1 minute'
    and (
      c.origen ilike '%recordatorio%'
      or c.origen is null
    );

  return new;
end;
$$;

drop trigger if exists trg_copiar_canal_recordatorio_a_comentario on public.recordatorios;

create constraint trigger trg_copiar_canal_recordatorio_a_comentario
  after insert or update
  on public.recordatorios
  deferrable initially deferred
  for each row
  execute function public.fn_copiar_canal_recordatorio_a_comentario();

update public.comentarios c
set
  llamada = coalesce(c.llamada, r.llamada),
  mensaje = coalesce(c.mensaje, r.mensaje)
from public.recordatorios r
where c.lead_id = r.lead_id
  and c.texto is not distinct from r.observacion
  and (r.llamada is not null or r.mensaje is not null)
  and (c.llamada is distinct from r.llamada or c.mensaje is distinct from r.mensaje)
  and c.origen ilike '%recordatorio%'
  and abs(extract(epoch from (c.created_at - r.created_at))) <= 60;

notify pgrst, 'reload schema';

commit;
