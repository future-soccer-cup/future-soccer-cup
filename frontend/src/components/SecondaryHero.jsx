import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";
import { motion } from "framer-motion";

/**
 * Hero reutilizable para todas las páginas secundarias (Nosotros, Eventos, Contacto, Noticias, Estadísticas).
 * Mantiene estructura visual original. Añade animaciones de entrada:
 *  - Imagen de fondo: fade-in suave al cargar.
 *  - Kicker (cursiva): fade-in con micro-delay.
 *  - Título: slide-left + fade-in.
 *  - Subtítulo/body: fade-in con delay respecto al título.
 */
export default function SecondaryHero({ kicker, title, body, bgUrl = "", overlay = "blue", testIdPrefix = "secondary-hero" }) {
  const overlayColor = overlay === "red" ? RED : BLUE;
  const overlayRgba = overlay === "red" ? "rgba(227, 31, 39, 0.7)" : "rgba(6, 64, 200, 0.7)";
  const safeBg = bgUrl ? imgSrc(bgUrl) : "";

  return (
    <section className="relative overflow-hidden text-white" data-testid={`${testIdPrefix}-section`} style={{ background: "#000000" }}>
      {/* Imagen de fondo opcional, fade-in al cargar */}
      {safeBg && (
        <motion.img
          src={safeBg}
          alt=""
          loading="eager"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 35%", willChange: "opacity" }}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="italic text-2xl text-white/95"
            style={{ ...CURSIVE, willChange: "opacity" }}
            data-testid={`${testIdPrefix}-kicker`}
          >
            {kicker}
          </motion.div>
        )}
        <motion.h1
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-6xl md:text-8xl font-black leading-[0.9] mt-1"
          style={{ ...PLANE_CRASH, textShadow: "3px 3px 0 rgba(0,0,0,0.25)", willChange: "transform, opacity" }}
          data-testid={`${testIdPrefix}-title`}
        >
          {planeCrashSafe(title || "")}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="h-1 w-24 mt-4 bg-white origin-left"
        />
        {body && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
            className="text-white/90 mt-6 max-w-3xl text-lg leading-relaxed"
            style={{ ...AGENCY_FB, willChange: "transform, opacity" }}
            data-testid={`${testIdPrefix}-body`}
          >
            {body}
          </motion.p>
        )}
      </div>
    </section>
  );
}
