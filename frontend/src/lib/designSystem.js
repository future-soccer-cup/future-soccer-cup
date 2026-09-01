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
  if (!lower.includes("ñ")) {
    return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  // Solo envolvemos en nowrap la(s) palabra(s) que contienen "ñ" (para no partirlas
  // en dos líneas), dejando que el resto del texto siga el wrap normal por espacios.
  // Así una oración larga como "¿En qué año nació...?" sigue ajustándose al ancho
  // del contenedor en vez de desbordarse en una sola línea gigante.
  return lower.split(/(\s+)/).map((token, i) => {
    if (!token.includes("ñ")) {
      return token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    const parts = token.split(/(ñ)/);
    return React.createElement(
      "span",
      { key: `w-${i}`, style: { whiteSpace: "nowrap" } },
      parts.map((part, j) => {
        if (part === "ñ") {
          return React.createElement(
            "span",
            { key: `ntilde-${i}-${j}`, style: { fontFamily: "'Anton', 'Barlow Condensed', sans-serif", fontWeight: 700 } },
            "Ñ"
          );
        }
        return part.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      })
    );
  });
}

/**
 * Convierte un texto a Title Case (solo la primera letra de cada palabra en mayúscula)
 * para usar con fuentes script/cursivas conectadas (ej. "Natura Script"). Estas fuentes
 * están diseñadas para escritura fluida en minúsculas — si el texto viene en MAYÚSCULA
 * SOSTENIDA (como lo puede escribir un admin en el CMS), cada letra se dibuja separada
 * y rompe el efecto de caligrafía conectada. Se normaliza siempre antes de renderizar.
 */
export function toTitleCaseForScript(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
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
