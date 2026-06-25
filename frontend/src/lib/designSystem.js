// Sistema de diseño compartido FSC v2.
// Centraliza tipografías, helper de normalización y paleta de colores
// para que todas las páginas hereden el mismo look & feel del Home.

// === Tipografías ===
export const PLANE_CRASH = {
  fontFamily: "'Plane Crash', 'Anton', 'Barlow Condensed', sans-serif",
  letterSpacing: "0.01em",
};

export const AGENCY_FB = {
  fontFamily: "'Agency FB', 'AgencyFB', 'Oswald', 'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif",
};

export const NEO_SANS = {
  fontFamily: "'Neo Sans Std', 'Neo Sans', 'Exo 2', 'Barlow', 'Inter', sans-serif",
};

export const STENCIL = {
  fontFamily: "'Anton', 'Barlow Condensed', sans-serif",
  letterSpacing: "0.01em",
};

export const CURSIVE = {
  fontFamily: "'Natura Script', 'Allura', 'Dancing Script', cursive",
};

/**
 * Normaliza un string para que se renderice correctamente con la fuente Plane Crash:
 * lowercase + sin diacríticos (la fuente solo tiene glifos para minúsculas/dígitos).
 */
export function planeCrashSafe(str) {
  return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// === Paleta de colores oficiales FSC ===
export const COLORS = {
  RED: "#e31f27",
  BLUE: "#0640c8",
  BLACK: "#000000",
  WHITE: "#FFFFFF",
  GRAY: "#dedfe0",
};

// Aliases sueltos por comodidad.
export const RED = COLORS.RED;
export const BLUE = COLORS.BLUE;
export const BLACK = COLORS.BLACK;
export const WHITE = COLORS.WHITE;
export const GRAY = COLORS.GRAY;
