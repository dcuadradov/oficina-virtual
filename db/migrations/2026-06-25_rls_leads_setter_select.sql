-- =============================================================================
-- RLS: permitir que los usuarios con rol 'setter' lean los leads que ellos
-- agendaron (leads.setter_email = su correo), aunque el comercial asignado
-- sea otro. Necesario para que el módulo "Mis Pitch" del setter vea los pitch
-- que agendó a otros comerciales.
--
-- Las políticas SELECT permisivas se combinan con OR, por lo que esta política
-- SUMA acceso a la política existente ("Select leads autenticados") sin
-- modificarla: comercial propio / admin (existente) OR setter dueño (nueva).
--
-- Idempotente: drop + create.
-- =============================================================================

begin;

drop policy if exists "Select leads del setter" on public.leads;

create policy "Select leads del setter"
on public.leads
for select
to authenticated
using (
  setter_email = auth.email()
  and exists (
    select 1
    from public.usuarios u
    where u.email = auth.email()
      and lower(u.rol) = 'setter'
  )
);

commit;
