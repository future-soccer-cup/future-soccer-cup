// Matrices fijas de fixture por número de equipos (posiciones 1-based).
// "D" = posición DESCANSA (equipo sintético que representa "no juega").
// Se aplican SOLO cuando el admin escoge una sola vuelta (rounds=1). Para
// rondas adicionales se puede repetir la matriz (ida-vuelta) invirtiendo local/visitante.
//
// Cada matriz devuelve una lista de objetos { matchday, home_pos, away_pos }.

const M4 = [
  { matchday: 1, home_pos: 1, away_pos: 4 },
  { matchday: 1, home_pos: 2, away_pos: 3 },
  { matchday: 2, home_pos: 4, away_pos: 3 },
  { matchday: 2, home_pos: 1, away_pos: 2 },
  { matchday: 3, home_pos: 2, away_pos: 4 },
  { matchday: 3, home_pos: 3, away_pos: 1 },
];

// 5 equipos → posiciones 1..5 + DESCANSA (índice 6). El backend ignora partidos con posiciones > team_ids.length.
const M5 = [
  { matchday: 1, home_pos: 1, away_pos: 6 }, // D
  { matchday: 1, home_pos: 2, away_pos: 5 },
  { matchday: 1, home_pos: 3, away_pos: 4 },
  { matchday: 2, home_pos: 6, away_pos: 4 }, // D
  { matchday: 2, home_pos: 5, away_pos: 3 },
  { matchday: 2, home_pos: 1, away_pos: 2 },
  { matchday: 3, home_pos: 2, away_pos: 6 }, // D
  { matchday: 3, home_pos: 3, away_pos: 1 },
  { matchday: 3, home_pos: 4, away_pos: 5 },
  { matchday: 4, home_pos: 6, away_pos: 5 }, // D
  { matchday: 4, home_pos: 1, away_pos: 4 },
  { matchday: 4, home_pos: 2, away_pos: 3 },
  { matchday: 5, home_pos: 3, away_pos: 6 }, // D
  { matchday: 5, home_pos: 4, away_pos: 2 },
  { matchday: 5, home_pos: 5, away_pos: 1 },
];

const M6 = [
  { matchday: 1, home_pos: 1, away_pos: 6 },
  { matchday: 1, home_pos: 2, away_pos: 5 },
  { matchday: 1, home_pos: 3, away_pos: 4 },
  { matchday: 2, home_pos: 6, away_pos: 4 },
  { matchday: 2, home_pos: 5, away_pos: 3 },
  { matchday: 2, home_pos: 1, away_pos: 2 },
  { matchday: 3, home_pos: 2, away_pos: 6 },
  { matchday: 3, home_pos: 3, away_pos: 1 },
  { matchday: 3, home_pos: 4, away_pos: 5 },
  { matchday: 4, home_pos: 6, away_pos: 5 },
  { matchday: 4, home_pos: 1, away_pos: 4 },
  { matchday: 4, home_pos: 2, away_pos: 3 },
  { matchday: 5, home_pos: 3, away_pos: 6 },
  { matchday: 5, home_pos: 4, away_pos: 2 },
  { matchday: 5, home_pos: 5, away_pos: 1 },
];

const M10 = [
  { matchday: 1, home_pos: 1, away_pos: 10 },
  { matchday: 1, home_pos: 2, away_pos: 9 },
  { matchday: 1, home_pos: 3, away_pos: 8 },
  { matchday: 1, home_pos: 4, away_pos: 7 },
  { matchday: 1, home_pos: 5, away_pos: 6 },
  { matchday: 2, home_pos: 10, away_pos: 6 },
  { matchday: 2, home_pos: 7, away_pos: 5 },
  { matchday: 2, home_pos: 8, away_pos: 4 },
  { matchday: 2, home_pos: 9, away_pos: 3 },
  { matchday: 2, home_pos: 1, away_pos: 2 },
  { matchday: 3, home_pos: 2, away_pos: 10 },
  { matchday: 3, home_pos: 3, away_pos: 1 },
  { matchday: 3, home_pos: 4, away_pos: 9 },
  { matchday: 3, home_pos: 5, away_pos: 8 },
  { matchday: 3, home_pos: 6, away_pos: 7 },
  { matchday: 4, home_pos: 10, away_pos: 7 },
  { matchday: 4, home_pos: 8, away_pos: 6 },
  { matchday: 4, home_pos: 9, away_pos: 5 },
  { matchday: 4, home_pos: 1, away_pos: 4 },
  { matchday: 4, home_pos: 2, away_pos: 3 },
  { matchday: 5, home_pos: 3, away_pos: 10 },
  { matchday: 5, home_pos: 4, away_pos: 2 },
  { matchday: 5, home_pos: 5, away_pos: 1 },
  { matchday: 5, home_pos: 6, away_pos: 9 },
  { matchday: 5, home_pos: 7, away_pos: 8 },
  { matchday: 6, home_pos: 10, away_pos: 8 },
  { matchday: 6, home_pos: 9, away_pos: 7 },
  { matchday: 6, home_pos: 1, away_pos: 6 },
  { matchday: 6, home_pos: 2, away_pos: 5 },
  { matchday: 6, home_pos: 3, away_pos: 4 },
  { matchday: 7, home_pos: 4, away_pos: 10 },
  { matchday: 7, home_pos: 5, away_pos: 3 },
  { matchday: 7, home_pos: 6, away_pos: 2 },
  { matchday: 7, home_pos: 7, away_pos: 1 },
  { matchday: 7, home_pos: 8, away_pos: 9 },
  { matchday: 8, home_pos: 10, away_pos: 9 },
  { matchday: 8, home_pos: 1, away_pos: 8 },
  { matchday: 8, home_pos: 2, away_pos: 7 },
  { matchday: 8, home_pos: 3, away_pos: 6 },
  { matchday: 8, home_pos: 4, away_pos: 5 },
  { matchday: 9, home_pos: 5, away_pos: 10 },
  { matchday: 9, home_pos: 6, away_pos: 4 },
  { matchday: 9, home_pos: 7, away_pos: 3 },
  { matchday: 9, home_pos: 8, away_pos: 2 },
  { matchday: 9, home_pos: 9, away_pos: 1 },
];

const FIXED = { 4: M4, 5: M5, 6: M6, 10: M10 };

// Round-robin genérico (círculo, posición 1 fija). Devuelve la matriz de posiciones para N equipos.
// Si N es impar, agrega una posición sintética D (= N+1) que representa DESCANSA.
export function genericRoundRobinMatrix(n) {
  if (n < 2) return [];
  const positions = [];
  for (let i = 1; i <= n; i++) positions.push(i);
  let effective = n;
  if (n % 2 === 1) {
    positions.push(n + 1); // D
    effective = n + 1;
  }
  const matrix = [];
  const arr = positions.slice();
  for (let r = 0; r < effective - 1; r++) {
    for (let i = 0; i < effective / 2; i++) {
      const home = arr[i];
      const away = arr[effective - 1 - i];
      // Alterna local/visitante por jornada para balancear (opcional; se mantiene simple aquí).
      matrix.push({ matchday: r + 1, home_pos: home, away_pos: away });
    }
    // rota manteniendo arr[0] fijo
    const rotated = [arr[0], arr[arr.length - 1], ...arr.slice(1, -1)];
    for (let i = 0; i < arr.length; i++) arr[i] = rotated[i];
  }
  return matrix;
}

/**
 * Devuelve la matriz de emparejamientos para N equipos.
 * - Si hay matriz fija (4/5/6/10), la usa exactamente como fue definida.
 * - Si no, genera un round-robin con posición 1 fija y agrega DESCANSA si N es impar.
 * Cada item: { matchday, home_pos, away_pos } con posiciones 1-based.
 * DESCANSA (si aplica) es la posición N+1.
 */
export function getFixtureMatrix(n) {
  if (FIXED[n]) return FIXED[n];
  return genericRoundRobinMatrix(n);
}

/**
 * Aplica `rounds` (vueltas) a una matriz. Para rounds > 1 repite las jornadas
 * intercalando local ↔ visitante para simular ida y vuelta.
 */
export function withRounds(matrix, rounds) {
  const R = Math.max(1, Number(rounds || 1));
  if (R <= 1) return matrix;
  const distinct = Array.from(new Set(matrix.map((m) => m.matchday))).sort((a, b) => a - b);
  const perMd = distinct.length;
  const out = [];
  for (let pass = 0; pass < R; pass++) {
    for (const it of matrix) {
      const mdShift = pass * perMd;
      out.push({
        matchday: it.matchday + mdShift,
        home_pos: pass % 2 === 0 ? it.home_pos : it.away_pos,
        away_pos: pass % 2 === 0 ? it.away_pos : it.home_pos,
      });
    }
  }
  return out;
}
