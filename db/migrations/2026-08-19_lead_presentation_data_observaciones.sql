-- =============================================================================
-- Extiende lead_presentation_data con "observaciones" (propuesta / brochure).
-- Texto libre que el comercial ingresa al generar el resultado.
-- =============================================================================

alter table public.lead_presentation_data
  add column if not exists observaciones text;

comment on column public.lead_presentation_data.observaciones is
  'Observaciones de su asesor. Texto libre al generar la propuesta.';
