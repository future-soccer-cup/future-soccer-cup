// Reglas comunes de validación de jugadores.

/**
 * Extrae el año mínimo permitido para un equipo.
 * 1) Si team.birth_year está presente y es > 0, lo usa.
 * 2) Si no, intenta extraer un año (1900-2099) del NOMBRE de la categoría
 *    (ej. "2008", "Sub-12 (2014)", "Sub-13 2010"). Devuelve null si no encuentra.
 */
export function teamAllowedYear(team) {
  if (!team) return null;
  const direct = Number(team.birth_year || 0);
  if (direct > 0) return direct;
  const cat = String(team.category || team.designation || "");
  const match = cat.match(/\b(19|20)\d{2}\b/);
  if (match) return Number(match[0]);
  return null;
}

/**
 * Devuelve un mensaje de error si el jugador es MAYOR a la categoría del equipo.
 * Regla: birth_year (del jugador) >= año permitido del equipo. Si alguno falta, no valida.
 * @param {string} birthDate - 'YYYY-MM-DD' (del jugador)
 * @param {object} team - objeto del equipo con `birth_year` y/o `category`
 * @returns {string|null} mensaje de error o null si todo OK
 */
export function validatePlayerBirthVsTeam(birthDate, team) {
  if (!birthDate || !team) return null;
  const tYear = teamAllowedYear(team);
  if (!tYear) return null;
  const pYear = Number(String(birthDate).slice(0, 4));
  if (!pYear) return null;
  if (pYear < tYear) {
    return `El jugador nacido en ${pYear} es mayor a la categoría del equipo (año permitido: ${tYear} en adelante).`;
  }
  return null;
}
