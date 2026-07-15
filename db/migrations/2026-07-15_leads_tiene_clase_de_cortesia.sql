-- =============================================================================
-- Columna tiene_clase_de_cortesia en leads (texto 'Si' / 'No').
-- Por defecto 'No' para filas existentes y nuevas; se actualiza a 'Si'
-- cuando el lead tiene clase de cortesía.
--
-- El buscador del portal filtra por palabra clave "Cortesía" cuando el valor
-- es 'Si' (ver Dashboard.jsx). Si ya corriste esta migración con TRUE/FALSE,
-- aplica también 2026-07-15_leads_tiene_clase_de_cortesia_si_no.sql.
--
-- Idempotente. Ejecutar manualmente en Supabase (staging y producción).
-- =============================================================================

begin;

alter table public.leads
  add column if not exists tiene_clase_de_cortesia text not null default 'No';

-- Por si la columna ya existía sin default o con nulls.
update public.leads
set tiene_clase_de_cortesia = 'No'
where tiene_clase_de_cortesia is null
   or trim(tiene_clase_de_cortesia) = '';

comment on column public.leads.tiene_clase_de_cortesia is
  'Si si el lead tiene clase de cortesía; No por defecto. Buscador: palabra Cortesía.';

notify pgrst, 'reload schema';

commit;
