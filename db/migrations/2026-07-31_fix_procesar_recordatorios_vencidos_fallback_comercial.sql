-- ============================================================================
-- FIX: procesar_recordatorios_vencidos — fallback de comercial_email
--
-- Si el lead no tiene comercial asignado, la notificación va a
-- dcuadrado@mdenglish.us (evita que el cron falle por NOT NULL).
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

create or replace function public.procesar_recordatorios_vencidos()
returns void
language plpgsql
security definer
as $function$
declare
  rec record;
  lead_rec record;
  config_notif_id uuid;
  config_template text;
  descripcion_final text;
  leads_afectados text[];
  v_comercial_email text;
begin
  -- Obtener config de notificación
  select id, descripcion_template into config_notif_id, config_template
  from config_notificaciones
  where tipo = 'Recordatorio programado por ti' and activo = true
  limit 1;

  -- Procesar cada recordatorio vencido
  for rec in
    select r.id, r.lead_id
    from recordatorios r
    where r.estado = 'Programado'
      and r.fecha_programada <= now()
  loop
    -- Marcar como Vencido
    update recordatorios set estado = 'Vencido' where id = rec.id;

    -- Obtener datos del lead
    select card_id, nombre, comercial_email
    into lead_rec
    from leads
    where card_id = rec.lead_id;

    -- Crear notificación (si hay config y lead existe)
    if config_notif_id is not null and lead_rec.card_id is not null then
      v_comercial_email := coalesce(
        nullif(trim(lead_rec.comercial_email), ''),
        'dcuadrado@mdenglish.us'
      );

      descripcion_final := replace(
        coalesce(config_template, 'Recordatorio vencido para {{nombre}}'),
        '{{nombre}}',
        coalesce(lead_rec.nombre, 'Lead')
      );

      -- Evitar notificación duplicada (mismo lead, mismo config, en los últimos 2 minutos)
      if not exists (
        select 1 from notificaciones
        where card_id = rec.lead_id
          and config_id = config_notif_id
          and comercial_email = v_comercial_email
          and created_at > now() - interval '2 minutes'
      ) then
        insert into notificaciones (config_id, card_id, comercial_email, nombre_lead, descripcion, datos_extra)
        values (
          config_notif_id,
          rec.lead_id,
          v_comercial_email,
          lead_rec.nombre,
          descripcion_final,
          '{"tipo": "recordatorio_vencido"}'::jsonb
        );
      end if;
    end if;

    -- Marcar lead como no revisado
    update leads
    set revisado = false,
        fecha_asignacion = now()
    where card_id = rec.lead_id;

    -- Acumular lead afectado
    leads_afectados := array_append(leads_afectados, rec.lead_id);
  end loop;

  -- Para cada lead afectado, verificar si tiene más recordatorios programados
  if leads_afectados is not null then
    update leads
    set recordatorio_activo = false
    where card_id = any(leads_afectados)
      and not exists (
        select 1 from recordatorios
        where lead_id = leads.card_id
          and estado = 'Programado'
      );
  end if;
end;
$function$;
