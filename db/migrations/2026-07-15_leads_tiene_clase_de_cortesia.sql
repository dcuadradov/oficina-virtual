-- =============================================================================
-- Columna tiene_clase_de_cortesia en leads (texto 'TRUE' / 'FALSE').
-- Por defecto 'FALSE' para filas existentes y nuevas; se actualiza a 'TRUE'
-- cuando el lead tiene clase de cortesía.
--
-- El buscador del portal filtra por palabra clave "Cortesía" cuando el valor
-- es 'TRUE' (ver Dashboard.jsx).
--
-- Idempotente. Ejecutar manualmente en Supabase (staging y producción).
-- =============================================================================

begin;

alter table public.leads
  add column if not exists tiene_clase_de_cortesia text not null default 'FALSE';

-- Por si la columna ya existía sin default o con nulls.
update public.leads
set tiene_clase_de_cortesia = 'FALSE'
where tiene_clase_de_cortesia is null
   or trim(tiene_clase_de_cortesia) = '';

comment on column public.leads.tiene_clase_de_cortesia is
  'TRUE si el lead tiene clase de cortesía; FALSE por defecto. Buscador: palabra Cortesía.';

notify pgrst, 'reload schema';

commit;
