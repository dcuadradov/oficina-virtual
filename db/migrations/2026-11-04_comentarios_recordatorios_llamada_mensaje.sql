-- =============================================================================
-- llamada y mensaje en comentarios y recordatorios.
-- Texto libre (más etiquetas después). Se guarda en mayúsculas y con punto
-- final: LNC., LC., LA. / MC., MNC., MA.
--
-- Idempotente. Ejecutar manualmente en Supabase (staging y producción).
-- En Postgres 13 o anterior, cambia execute function por execute procedure.
-- =============================================================================

begin;

alter table public.comentarios
  add column if not exists llamada text,
  add column if not exists mensaje text;

alter table public.recordatorios
  add column if not exists llamada text,
  add column if not exists mensaje text;

create or replace function public.normalizar_seguimiento_siglas()
returns trigger
language plpgsql
as $$
begin
  if new.llamada is not null then
    new.llamada := upper(btrim(new.llamada));
    new.llamada := rtrim(new.llamada, '.');
    if new.llamada = '' then
      new.llamada := null;
    else
      new.llamada := new.llamada || '.';
    end if;
  end if;

  if new.mensaje is not null then
    new.mensaje := upper(btrim(new.mensaje));
    new.mensaje := rtrim(new.mensaje, '.');
    if new.mensaje = '' then
      new.mensaje := null;
    else
      new.mensaje := new.mensaje || '.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalizar_seguimiento_siglas on public.comentarios;
create trigger trg_normalizar_seguimiento_siglas
  before insert or update of llamada, mensaje
  on public.comentarios
  for each row
  execute function public.normalizar_seguimiento_siglas();

drop trigger if exists trg_normalizar_seguimiento_siglas on public.recordatorios;
create trigger trg_normalizar_seguimiento_siglas
  before insert or update of llamada, mensaje
  on public.recordatorios
  for each row
  execute function public.normalizar_seguimiento_siglas();

comment on column public.comentarios.llamada is
  'Etiqueta libre de llamada (LNC., LC., LA., …). Se guarda en mayúsculas con punto.';
comment on column public.comentarios.mensaje is
  'Etiqueta libre de mensaje (MC., MNC., MA., …). Se guarda en mayúsculas con punto.';
comment on column public.recordatorios.llamada is
  'Etiqueta libre de llamada (LNC., LC., LA., …). Se guarda en mayúsculas con punto.';
comment on column public.recordatorios.mensaje is
  'Etiqueta libre de mensaje (MC., MNC., MA., …). Se guarda en mayúsculas con punto.';

notify pgrst, 'reload schema';

commit;
