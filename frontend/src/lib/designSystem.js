// Sistema de diseño compartido FSC v2.
// Centraliza tipografías, helper de normalización y paleta de colores
// para que todas las páginas hereden el mismo look & feel del Home.
import React from "react";

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
 * NOTA: esta versión (string plano) convierte "ñ" en "n" porque el glifo de "ñ" en esta
 * fuente es un carácter INVISIBLE (no un fallback a otra fuente) — usarla solo cuando
 * se necesita un string plano (ej. iteración carácter por carácter). Para render normal
 * en JSX, usar `renderPlaneCrash` en su lugar, que sí conserva la "ñ" visible.
 */
export function planeCrashSafe(str) {
  return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Igual que `planeCrashSafe` pero devuelve nodos React (array) en vez de un string plano.
 * La fuente "Plane Crash" no tiene un glifo visible para "ñ" (aparece en blanco), así que
 * esa letra se envuelve en un span forzado a 'Anton' (el fallback ya declarado en
 * PLANE_CRASH) para que "año" se vea como "año" y no como "ano" ni desaparezca.
 * Usar en cualquier lugar donde el resultado se renderice directo como children de JSX.
 */
export function renderPlaneCrash(str) {
  const lower = String(str || "").toLowerCase();
  const parts = lower.split(/(ñ)/);
  if (parts.length === 1) {
    return parts[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  // Envuelve TODO en un único <span> (no un array) para que, dentro de contenedores
  // flex con flex-wrap, la palabra se trate como un solo ítem y no se parta en dos líneas.
  return React.createElement(
    "span",
    { style: { whiteSpace: "nowrap" } },
    parts.map((part, i) => {
      if (part === "ñ") {
        return React.createElement(
          "span",
          { key: `ntilde-${i}`, style: { fontFamily: "'Anton', 'Barlow Condensed', sans-serif", fontWeight: 700 } },
          "Ñ"
        );
      }
      return part.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    })
  );
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
