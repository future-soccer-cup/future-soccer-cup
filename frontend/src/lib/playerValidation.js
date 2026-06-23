// Reglas comunes de validación de jugadores.

/**
 * Devuelve un mensaje de error si el jugador es MAYOR a la categoría del equipo.
 * Regla: birth_year (del jugador) >= team.birth_year. Si alguno falta, no valida.
 * @param {string} birthDate - 'YYYY-MM-DD' (del jugador)
 * @param {object} team - objeto del equipo con `birth_year`
 * @returns {string|null} mensaje de error o null si todo OK
 */
export function validatePlayerBirthVsTeam(birthDate, team) {
  if (!birthDate || !team) return null;
  const tYear = Number(team.birth_year || 0);
  if (!tYear) return null;
  const pYear = Number(String(birthDate).slice(0, 4));
  if (!pYear) return null;
  if (pYear < tYear) {
    return `El jugador nacido en ${pYear} es mayor a la categoría del equipo (año permitido: ${tYear} en adelante).`;
  }
  return null;
}
