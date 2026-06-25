/**
 * Filtro de "dueño" del módulo Mis Pitch sobre una query de Supabase.
 *
 * - Setter: acota por leads.setter_email = userEmail (pitch que agendó).
 *   Como vw_pitches_calendario puede no exponer setter_email (vista creada
 *   antes de la columna), se puede pasar setterCardIds precargado desde leads.
 *   Si además puedeVerTodos y hay selectedComercial, también filtra comercial_email.
 * - Comercial / admin: regla histórica por comercial_email.
 */
export function applyPitchScopeFilter(query, {
  esSetter,
  userEmail,
  selectedComercial,
  puedeVerTodos,
  setterCardIds = undefined,
}) {
  if (esSetter) {
    if (setterCardIds !== undefined) {
      // card_ids del setter (desde leads.setter_email); vacío → sin resultados.
      query = query.in('card_id', setterCardIds.length > 0 ? setterCardIds : ['__no_match__']);
    } else if (userEmail) {
      query = query.eq('setter_email', userEmail);
    }
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
