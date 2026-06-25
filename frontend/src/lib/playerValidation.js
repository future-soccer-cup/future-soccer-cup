// Reglas comunes de validación de jugadores.

// Año del torneo actual. Se usa como fallback para derivar el año permitido
// desde categorías "Sub-X" (ej. Sub-12 en 2026 → 2014).
const TOURNAMENT_YEAR = 2026;

/**
 * Extrae el año mínimo permitido para un equipo.
 * Estrategia (en orden):
 *   1) team.birth_year (si > 0).
 *   2) Año (1900-2099) hallado en team.category (ej. "2008", "Sub-12 (2014)").
 *   3) Año (1900-2099) hallado en team.name (ej. "AMERICA FC 2010").
 *   4) "Sub-X" en team.category → TOURNAMENT_YEAR - X (ej. Sub-12 → 2014).
 *   Devuelve null si nada aplica.
 */
export function teamAllowedYear(team) {
  if (!team) return null;
  const direct = Number(team.birth_year || 0);
  if (direct > 0) return direct;
  const cat = String(team.category || team.designation || "");
  const name = String(team.name || "");
  const yearRe = /\b(19|20)\d{2}\b/;
  const inCat = cat.match(yearRe);
  if (inCat) return Number(inCat[0]);
  const inName = name.match(yearRe);
  if (inName) return Number(inName[0]);
  const subMatch = cat.match(/sub[\s-]*(\d{1,2})/i) || name.match(/sub[\s-]*(\d{1,2})/i);
  if (subMatch) {
    const sub = Number(subMatch[1]);
    if (sub > 0 && sub < 30) return TOURNAMENT_YEAR - sub;
  }
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
