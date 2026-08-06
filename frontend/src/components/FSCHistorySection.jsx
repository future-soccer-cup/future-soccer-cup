/**
 * FSC EN LA HISTORIA — Sección de timeline navegable en /nosotros.
 *
 * DOS ESTADOS:
 *  - INTRODUCCIÓN (activeIdx=0 / key="intro"): 6 fotos flotantes + texto grande "FSC EN LA HISTORIA".
 *  - Cualquier otro hito: las 6 fotos + el texto FSC desaparecen (fade). Aparece UNA
 *    sola foto grande tipo banner ocupando todo el área, con overlay inferior que muestra
 *    la pregunta en Plane Crash blanco + botón "LEE AQUÍ" (fondo blanco, texto rojo).
 *
 * La franja azul con puntos + años permanece siempre visible. Botones ← → circulares
 * navegan entre hitos.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

// Slots para las 6 fotos flotantes del modo INTRODUCCIÓN.
// Matchean el wireframe: 3 arriba + 3 abajo, con tamaños distintos.
const SLOTS = [
  { left: "3%",  top: "6%",  width: "22%", h: 170, rotate: -2 },
  { left: "34%", top: "0%",  width: "32%", h: 260, rotate: 1.5 },
  { left: "76%", top: "8%",  width: "21%", h: 170, rotate: 2 },
  { left: "5%",  top: "58%", width: "22%", h: 170, rotate: -2 },
  { left: "36%", top: "68%", width: "26%", h: 180, rotate: -1 },
  { left: "78%", top: "60%", width: "18%", h: 140, rotate: 2.5 },
];

export default function FSCHistorySection({ settings }) {
  const timeline = useMemo(() => {
    const arr = settings?.nosotros_history_timeline;
    return Array.isArray(arr) && arr.length ? arr : [];
  }, [settings]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState("in"); // "in" | "out" — para fade entre hitos

  useEffect(() => {
    if (phase === "out") {
      const t = setTimeout(() => setPhase("in"), 30);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!timeline.length) return null;
  const active = timeline[activeIdx] || timeline[0];
  const isIntro = (active.key || "").toLowerCase() === "intro" || activeIdx === 0;

  const goTo = (newIdx) => {
    if (newIdx === activeIdx) return;
    setPhase("out");
    setTimeout(() => setActiveIdx(newIdx), 180);
  };
  const goPrev = () => goTo(activeIdx > 0 ? activeIdx - 1 : timeline.length - 1);
  const goNext = () => goTo(activeIdx < timeline.length - 1 ? activeIdx + 1 : 0);

  const title = settings?.nosotros_history_title || "FSC EN LA HISTORIA";
  const [topWord, ...rest] = title.split(/\s+/);
  const bottomWords = rest.join(" ");

  const photos = active.photos || [];
  const bannerPhoto = photos[0]; // Foto principal del hito (modo "year")
  const hasBody = !!(active.body && active.body.trim());
  const question = (active.question || "").trim();

  return (
    <section className="relative bg-white" data-testid="history-section">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ minHeight: "min(88vh, 780px)" }}>
        {/* Área central */}
        <div className="relative w-full" style={{ minHeight: "min(76vh, 680px)" }}>

          {/* MODO INTRODUCCIÓN: 6 fotos flotantes + texto FSC EN LA HISTORIA */}
          <div
            className={`transition-opacity duration-300 ${isIntro && phase === "in" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-hidden={!isIntro}
            data-testid="history-intro-layer"
          >
            {/* Fotos flotantes (solo desktop) */}
            <div className="hidden md:block absolute inset-0">
              {SLOTS.map((slot, i) => {
                const p = (isIntro ? photos[i] : null);
                if (!p) return null;
                return (
                  <div
                    key={`intro-${i}`}
                    className="absolute"
                    style={{ left: slot.left, top: slot.top, width: slot.width, transform: `rotate(${slot.rotate}deg)`, zIndex: 3 }}
                    data-testid={`history-photo-${i}`}
                  >
                    <div className="relative overflow-hidden" style={{ border: "3px solid #ffffff", boxShadow: "0 12px 28px rgba(0,0,0,0.18)" }}>
                      <img src={imgSrc(p)} alt="" className="w-full object-cover block" style={{ height: slot.h }} loading="lazy" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Texto central FSC · EN LA HISTORIA */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none" style={{ zIndex: 1 }}>
              <div className="leading-[0.85]" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(5rem, 15vw, 13rem)" }} data-testid="history-title-top">
                {planeCrashSafe(topWord || "fsc")}
              </div>
              {bottomWords && (
                <div className="leading-none mt-1" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(1.2rem, 3vw, 2.8rem)", letterSpacing: "0.03em" }} data-testid="history-title-bottom">
                  {planeCrashSafe(bottomWords)}
                </div>
              )}
            </div>

            {/* Mobile: grid de 6 fotos apiladas */}
            <div className="md:hidden relative pt-4 pb-6">
              {isIntro && photos.length > 0 && (
                <>
                  <div className="text-center mb-4 py-8">
                    <div className="leading-[0.85]" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(4rem, 20vw, 6rem)" }}>
                      {planeCrashSafe(topWord || "fsc")}
                    </div>
                    {bottomWords && (
                      <div className="leading-none mt-1" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(1rem, 5vw, 1.6rem)" }}>
                        {planeCrashSafe(bottomWords)}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {photos.slice(0, 6).map((p, i) => (
                      <div key={`m-${i}`} className="overflow-hidden" style={{ border: "2px solid #ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
                        <img src={imgSrc(p)} alt="" className="w-full h-32 object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MODO YEAR: 1 foto banner + overlay pregunta + LEE AQUÍ */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${!isIntro && phase === "in" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            aria-hidden={isIntro}
            data-testid="history-year-layer"
          >
            {!isIntro && (
              <div className="w-full h-full relative" data-testid="history-banner">
                {bannerPhoto ? (
                  <img src={imgSrc(bannerPhoto)} alt="" className="w-full h-full object-cover" style={{ minHeight: "min(76vh, 680px)" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: BLUE, minHeight: "min(76vh, 680px)" }}>
                    <span className="text-white/60" style={{ ...PLANE_CRASH, fontSize: "3rem" }}>{planeCrashSafe(active.label || "")}</span>
                  </div>
                )}
                {/* Overlay inferior */}
                {(question || hasBody) && (
                  <div
                    className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-6 pb-16 pt-40 text-center"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)" }}
                  >
                    {question && (
                      <div
                        className="text-white leading-tight mb-5 max-w-4xl"
                        style={{
                          ...PLANE_CRASH,
                          fontSize: "clamp(2.4rem, 6vw, 5rem)",
                          textShadow: "3px 3px 0 rgba(0,0,0,0.5)",
                        }}
                        data-testid="history-question"
                      >
                        {planeCrashSafe(question)}
                      </div>
                    )}
                    {hasBody && (
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="px-8 py-3 bg-white rounded-sm shadow-lg transition-transform hover:scale-105"
                        style={{
                          ...PLANE_CRASH,
                          color: RED,
                          fontSize: "clamp(1.2rem, 2vw, 1.9rem)",
                          letterSpacing: "0.06em",
                        }}
                        data-testid="history-read-btn"
                      >
                        {planeCrashSafe("lee aquí")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botones ← → circulares */}
        <div className="flex justify-end gap-3 pr-2 md:pr-8 pt-6 pb-8 md:absolute md:bottom-4 md:right-8 md:pt-0 md:pb-0" style={{ zIndex: 10 }}>
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

      {/* Franja azul con línea de tiempo — SIEMPRE visible */}
      <div className="w-full" style={{ background: BLUE }} data-testid="history-timeline-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="relative">
            <div className="h-[3px] w-full bg-white/80 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-between">
              {timeline.map((m, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => goTo(i)}
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
          <div className="flex items-center justify-between mt-4">
            {timeline.map((m, i) => (
              <button
                key={`lbl-${m.key}`}
                type="button"
                onClick={() => goTo(i)}
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

      {/* Modal LEE AQUÍ */}
      {modalOpen && hasBody && (
        <HistoryReadModal
          question={question}
          body={active.body}
          label={active.label}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

function HistoryReadModal({ question, body, label, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
      data-testid="history-modal"
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ background: BLUE }}>
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-white/80 uppercase tracking-widest text-xs" style={AGENCY_FB}>
              {label}
            </span>
            <span
              className="text-white leading-none truncate"
              style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.9rem)" }}
              data-testid="history-modal-title"
            >
              {planeCrashSafe(question || "historia fsc")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10 transition flex-shrink-0"
            aria-label="Cerrar"
            data-testid="history-modal-close"
          >
            <X size={22} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-6 py-6 text-slate-800 leading-relaxed text-base whitespace-pre-line"
          style={AGENCY_FB}
          data-testid="history-modal-body"
        >
          {body}
        </div>
      </div>
    </div>
  );
}
