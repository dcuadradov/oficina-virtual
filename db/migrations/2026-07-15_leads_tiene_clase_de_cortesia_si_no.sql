-- =============================================================================
-- Normalizar tiene_clase_de_cortesia: 'TRUE'/'FALSE' → 'Si'/'No'.
-- Default nuevo: 'No'. Ejecutar en staging y producción si ya corriste la
-- migración anterior con TRUE/FALSE.
-- =============================================================================

begin;

update public.leads
set tiene_clase_de_cortesia = case
  when upper(trim(tiene_clase_de_cortesia)) in ('TRUE', 'SI', 'SÍ') then 'Si'
  else 'No'
end;

alter table public.leads
  alter column tiene_clase_de_cortesia set default 'No';

comment on column public.leads.tiene_clase_de_cortesia is
  'Si si el lead tiene clase de cortesía; No por defecto. Buscador: palabra Cortesía.';

notify pgrst, 'reload schema';

commit;
