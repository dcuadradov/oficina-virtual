-- =============================================================================
-- Identificador opcional de WhatsApp en leads.
-- tiene_usuario_whatsapp: true si el lead se creó (o se identifica) por usuario
-- de WhatsApp en lugar de teléfono. false por defecto en filas existentes.
-- usuario_whatsapp: handle sin @; null cuando no aplica.
--
-- Idempotente. Ejecutar manualmente en Supabase (staging y producción).
-- El portal no escribe estas columnas al crear: las llena n8n desde el webhook
-- creacion_leads_portal (llaves tiene_usuario_whatsapp y usuario_whatsapp).
-- =============================================================================

begin;

alter table public.leads
  add column if not exists tiene_usuario_whatsapp boolean not null default false;

alter table public.leads
  add column if not exists usuario_whatsapp text;

comment on column public.leads.tiene_usuario_whatsapp is
  'true si el lead se identificó con usuario de WhatsApp en lugar de teléfono.';

comment on column public.leads.usuario_whatsapp is
  'Usuario de WhatsApp sin @. Null o vacío cuando tiene_usuario_whatsapp es false.';

notify pgrst, 'reload schema';

commit;
