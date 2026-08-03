-- =============================================================================
-- Extiende lead_presentation_data con campos del slide 29 (Confirmación clínica)
-- =============================================================================

alter table public.lead_presentation_data
  add column if not exists inquietudes_pendientes   text,
  add column if not exists hallazgos_relevantes     text,
  add column if not exists confirmacion_diagnostica text,
  add column if not exists contraindicaciones       text,
  add column if not exists conducta_propuesta       text;

comment on column public.lead_presentation_data.inquietudes_pendientes is
  'Slide 29 — Inquietudes pendientes';
comment on column public.lead_presentation_data.hallazgos_relevantes is
  'Slide 29 — Hallazgos relevantes';
comment on column public.lead_presentation_data.confirmacion_diagnostica is
  'Slide 29 — Confirmación diagnóstica';
comment on column public.lead_presentation_data.contraindicaciones is
  'Slide 29 — Contraindicaciones';
comment on column public.lead_presentation_data.conducta_propuesta is
  'Slide 29 — Conducta propuesta';
