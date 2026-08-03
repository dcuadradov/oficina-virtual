-- =============================================================================
-- Extiende lead_presentation_data con "beneficio" (slide Embajadores).
-- Número que el comercial ingresa sobre la línea amarilla.
-- =============================================================================

alter table public.lead_presentation_data
  add column if not exists beneficio text;

comment on column public.lead_presentation_data.beneficio is
  'Número de contactos / beneficio del Programa de Embajadores (slide 34).';
