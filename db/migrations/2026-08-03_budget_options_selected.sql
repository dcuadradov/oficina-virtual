-- Selección única de plan (alternativas / fila extra) + flag de modalidad de contado.
-- sort_order admite hasta 4 filas (3 alternativas + 1 bajo modalidad).

alter table public.lead_presentation_budget_options
  add column if not exists selected boolean not null default false;

alter table public.lead_presentation_budget
  add column if not exists modalidad_selected boolean not null default false;

alter table public.lead_presentation_budget_options
  drop constraint if exists lead_presentation_budget_options_sort_check;

alter table public.lead_presentation_budget_options
  add constraint lead_presentation_budget_options_sort_check
  check (sort_order >= 1 and sort_order <= 4);

comment on column public.lead_presentation_budget_options.selected is
  'TRUE si esta fila es el plan elegido para el link de pago (solo una por draft/run).';

comment on column public.lead_presentation_budget.modalidad_selected is
  'TRUE si eligió Modalidad de contado (Elite/Platinum) en lugar de una alternativa.';
