import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";

/**
 * Hero reutilizable para todas las páginas secundarias (Nosotros, Eventos, Contacto, Noticias, Estadísticas).
 * Estructura inspirada en el Hero del Home pero independiente:
 *   - Imagen de fondo opcional (cover) — si está vacía, fondo negro.
 *   - Overlay translúcido configurable (blue|red).
 *   - Kicker en cursiva + título en Plane Crash + body en Agency FB.
 * Todos los textos son editables desde /admin/home.
 */
export default function SecondaryHero({ kicker, title, body, bgUrl = "", overlay = "blue", testIdPrefix = "secondary-hero" }) {
  const overlayColor = overlay === "red" ? RED : BLUE;
  const overlayRgba = overlay === "red" ? "rgba(227, 31, 39, 0.7)" : "rgba(6, 64, 200, 0.7)";
  const safeBg = bgUrl ? imgSrc(bgUrl) : "";

  return (
    <section className="relative overflow-hidden text-white" data-testid={`${testIdPrefix}-section`} style={{ background: "#000000" }}>
      {/* Imagen de fondo opcional */}
      {safeBg && (
        <img
          src={safeBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 35%" }}
          data-testid={`${testIdPrefix}-bg-image`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      {/* Overlay translúcido del color elegido */}
      <div className="absolute inset-0 mix-blend-multiply pointer-events-none" style={{ background: overlayRgba }} data-testid={`${testIdPrefix}-overlay`} />
      {/* Gradiente sutil a la izquierda para legibilidad del texto */}
      <div className="absolute inset-y-0 left-0 w-2/3 pointer-events-none" style={{ background: `linear-gradient(to right, ${overlayColor}, transparent)` }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        {kicker && (
          <div className="italic text-2xl text-white/95" style={CURSIVE} data-testid={`${testIdPrefix}-kicker`}>{kicker}</div>
        )}
        <h1 className="text-6xl md:text-8xl font-black leading-[0.9] mt-1" style={{ ...PLANE_CRASH, textShadow: "3px 3px 0 rgba(0,0,0,0.25)" }} data-testid={`${testIdPrefix}-title`}>
          {planeCrashSafe(title || "")}
        </h1>
        <div className="h-1 w-24 mt-4 bg-white" />
        {body && (
          <p className="text-white/90 mt-6 max-w-3xl text-lg leading-relaxed" style={AGENCY_FB} data-testid={`${testIdPrefix}-body`}>
            {body}
          </p>
        )}
      </div>
    </section>
  );
}
