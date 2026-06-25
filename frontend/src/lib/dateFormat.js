// Helpers globales para mostrar fechas en formato dd/mm/aaaa en TODA la app.
// Reglas:
//  - formatDate(v)      → "dd/mm/aaaa"           (solo fecha)
//  - formatDateTime(v)  → "dd/mm/aaaa HH:mm"     (fecha + hora 24h)
//  - formatTime(v)      → "HH:mm"                (solo hora)
//  - formatDateLong(v)  → "dd de mes de aaaa"    (texto en español)
// Si el valor es null/undefined/vacío, devuelve "" (no "Invalid Date").
// Acepta:  Date  |  ISO string  |  "YYYY-MM-DD"  |  "YYYY-MM-DDTHH:MM[:ss][Z]".
//
// Importante: las cadenas "YYYY-MM-DD" se interpretan SIN zona horaria (local)
// para que el día no se desplace al renderizar en navegadores en zonas distintas.

const MONTHS_ES_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad2 = (n) => String(n).padStart(2, "0");

function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  // "YYYY-MM-DD" puro → construir en local para evitar shift UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatDate(value) {
  const d = toDate(value);
  if (!d) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return "";
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatTime(value) {
  const d = toDate(value);
  if (!d) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateLong(value) {
  const d = toDate(value);
  if (!d) return "";
  return `${d.getDate()} de ${MONTHS_ES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

// Default export para imports cortos.
const _api = { formatDate, formatDateTime, formatTime, formatDateLong };
export default _api;
