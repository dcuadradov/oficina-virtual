/**
 * Filtro de "dueño" del módulo Mis Pitch sobre una query de Supabase.
 *
 * - Setter: acota por leads.setter_email = userEmail (pitch que agendó).
 *   Si además puedeVerTodos y hay selectedComercial, también filtra comercial_email.
 * - Comercial / admin: regla histórica por comercial_email.
 */
export function applyPitchScopeFilter(query, { esSetter, userEmail, selectedComercial, puedeVerTodos }) {
  if (esSetter) {
    if (userEmail) query = query.eq('setter_email', userEmail);
    if (puedeVerTodos && selectedComercial) {
      query = query.eq('comercial_email', selectedComercial);
    }
  } else if (selectedComercial) {
    query = query.eq('comercial_email', selectedComercial);
  } else if (!puedeVerTodos && userEmail) {
    query = query.eq('comercial_email', userEmail);
  }
  return query;
}
