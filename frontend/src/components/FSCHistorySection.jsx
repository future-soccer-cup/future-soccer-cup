/**
 * FSC EN LA HISTORIA — Sección de timeline navegable en /nosotros.
 * Wireframe: fotos flotantes alrededor de un texto grande rojo "FSC · EN LA HISTORIA"
 * + franja azul inferior con puntos blancos por hito + botones circulares ← →.
 * Contenido y fotos por hito vienen del CMS (home_settings.nosotros_history_timeline).
 */
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

// Posiciones fijas para las fotos flotantes (matchean el wireframe).
// tl=top-left, tc=top-center, tr=top-right, bl=bottom-left, bc=bottom-center, br=bottom-right
const FLOAT_SLOTS = [
  { className: "hidden md:block absolute top-4 left-4 md:left-10 lg:left-16 w-56 md:w-64 lg:w-72", rotate: -1.5 },
  { className: "hidden md:block absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 md:-translate-y-4 w-64 md:w-80 lg:w-96", rotate: 2 },
  { className: "hidden md:block absolute top-6 right-4 md:right-10 lg:right-16 w-56 md:w-64 lg:w-72", rotate: 1 },
  { className: "hidden md:block absolute bottom-8 left-4 md:left-10 lg:left-24 w-56 md:w-64 lg:w-72", rotate: -2 },
  { className: "hidden md:block absolute bottom-2 left-1/2 -translate-x-[35%] w-56 md:w-64 lg:w-72", rotate: -1 },
  { className: "hidden md:block absolute bottom-10 right-4 md:right-14 lg:right-20 w-56 md:w-64 lg:w-72", rotate: 2.5 },
];

export default function FSCHistorySection({ settings }) {
  const timeline = useMemo(() => {
    const arr = settings?.nosotros_history_timeline;
    return Array.isArray(arr) && arr.length ? arr : [];
  }, [settings]);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!timeline.length) return null;
  const active = timeline[activeIdx] || timeline[0];
  const goPrev = () => setActiveIdx((i) => (i > 0 ? i - 1 : timeline.length - 1));
  const goNext = () => setActiveIdx((i) => (i < timeline.length - 1 ? i + 1 : 0));

  const title = settings?.nosotros_history_title || "FSC EN LA HISTORIA";
  // "FSC" grande (línea 1) + "EN LA HISTORIA" pequeño (línea 2). Split de "FSC ":
  const [top, ...rest] = title.split(/\s+/);
  const bottom = rest.join(" ");

  const photos = (active.photos || []).slice(0, FLOAT_SLOTS.length);

  return (
    <section className="relative bg-white" data-testid="history-section">
      {/* Área central con fotos flotantes + texto */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ minHeight: "min(78vh, 720px)" }}>
        {/* Fotos flotantes */}
        <div className="relative w-full h-full" style={{ minHeight: "inherit" }}>
          {photos.map((p, i) => {
            const slot = FLOAT_SLOTS[i];
            if (!slot) return null;
            return (
              <div
                key={`${active.key}-${i}`}
                className={slot.className}
                style={{ transform: `rotate(${slot.rotate}deg)` }}
                data-testid={`history-photo-${i}`}
              >
                <div className="relative overflow-hidden shadow-xl" style={{ border: "3px solid #ffffff", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
                  <img src={imgSrc(p)} alt="" className="w-full h-40 md:h-44 lg:h-48 object-cover block" loading="lazy" />
                </div>
              </div>
            );
          })}

          {/* Mobile fallback grid — cuando no hay space para las flotantes */}
          {photos.length > 0 && (
            <div className="md:hidden grid grid-cols-2 gap-3 pt-4 pb-6">
              {photos.map((p, i) => (
                <div key={`m-${active.key}-${i}`} className="overflow-hidden rounded-md shadow" style={{ border: "2px solid #ffffff" }}>
                  <img src={imgSrc(p)} alt="" className="w-full h-32 object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* Texto central FSC · EN LA HISTORIA */}
          <div className="relative md:absolute md:inset-0 flex flex-col items-center justify-center text-center pointer-events-none py-10 md:py-0">
            <div
              className="leading-[0.85] select-none"
              style={{
                ...PLANE_CRASH,
                color: RED,
                fontSize: "clamp(6rem, 18vw, 16rem)",
                textShadow: "1px 1px 0 rgba(0,0,0,0.05)",
              }}
              data-testid="history-title-top"
            >
              {planeCrashSafe(top || "fsc")}
            </div>
            {bottom && (
              <div
                className="leading-none mt-1 md:mt-2"
                style={{
                  ...PLANE_CRASH,
                  color: RED,
                  fontSize: "clamp(1.6rem, 4vw, 3.4rem)",
                  letterSpacing: "0.03em",
                }}
                data-testid="history-title-bottom"
              >
                {planeCrashSafe(bottom)}
              </div>
            )}

            {/* Texto del hito (si existe) */}
            {active.body && active.key !== "intro" && (
              <div
                className="mt-6 md:mt-8 max-w-2xl px-4 text-slate-800 text-sm md:text-base leading-relaxed bg-white/85 backdrop-blur-sm rounded-md py-3 pointer-events-auto"
                style={AGENCY_FB}
                data-testid={`history-body-${active.key}`}
              >
                {active.body}
              </div>
            )}
          </div>
        </div>

        {/* Botones ← → circulares */}
        <div className="flex justify-end gap-3 pr-2 md:pr-8 pt-4 pb-6 md:absolute md:bottom-4 md:right-8 md:pt-0 md:pb-0">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
            style={{ background: RED }}
            aria-label="Hito anterior"
            data-testid="history-prev-btn"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
            style={{ background: RED }}
            aria-label="Siguiente hito"
            data-testid="history-next-btn"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Franja azul con línea de tiempo */}
      <div className="w-full" style={{ background: BLUE }} data-testid="history-timeline-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Línea horizontal blanca con puntos */}
          <div className="relative">
            <div className="h-[3px] w-full bg-white/80 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-between">
              {timeline.map((m, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className="relative flex items-center justify-center transition-transform hover:scale-110"
                    aria-label={m.label}
                    data-testid={`history-dot-${m.key}`}
                  >
                    <span
                      className="block rounded-full"
                      style={{
                        width: isActive ? 22 : 16,
                        height: isActive ? 22 : 16,
                        background: isActive ? "#ffffff" : BLUE,
                        border: "3px solid #ffffff",
                        transition: "all 0.2s ease",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          {/* Labels bajo cada punto */}
          <div className="flex items-center justify-between mt-4">
            {timeline.map((m, i) => (
              <button
                key={`lbl-${m.key}`}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="text-white uppercase tracking-widest text-[10px] sm:text-xs md:text-sm text-center flex-1"
                style={{
                  ...AGENCY_FB,
                  fontWeight: i === activeIdx ? 900 : 500,
                  opacity: i === activeIdx ? 1 : 0.75,
                }}
                data-testid={`history-label-${m.key}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
