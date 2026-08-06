/**
 * FSC EN LA HISTORIA — Sección de timeline navegable en /nosotros.
 * - 6 fotos flotantes alrededor del texto central "FSC · EN LA HISTORIA":
 *     idx 0 (sup-izq),   idx 1 (sup-centro GRANDE con overlay),   idx 2 (sup-der),
 *     idx 3 (inf-izq),   idx 4 (inf-centro),                       idx 5 (inf-der pequeña).
 * - Al cambiar de hito: fade suave. La foto principal (idx 1) muestra overlay con la
 *   "pregunta" del hito + botón "LEE AQUÍ" que abre modal con la respuesta completa.
 * - Franja azul inferior con puntos + labels de años.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

// Slots relativos (izquierda%, top%, ancho%, alto en px, rotación).
// Matchean el wireframe: 3 arriba + 3 abajo, la superior-centro es la grande.
const SLOTS = [
  { label: "sup-izq",    left: "3%",  top: "6%",  width: "22%", h: 170, rotate: -2 },
  { label: "sup-centro", left: "34%", top: "0%",  width: "32%", h: 260, rotate: 1.5, isMain: true },
  { label: "sup-der",    left: "76%", top: "8%",  width: "21%", h: 170, rotate: 2 },
  { label: "inf-izq",    left: "5%",  top: "58%", width: "22%", h: 170, rotate: -2 },
  { label: "inf-centro", left: "36%", top: "68%", width: "26%", h: 180, rotate: -1 },
  { label: "inf-der",    left: "78%", top: "60%", width: "18%", h: 140, rotate: 2.5 },
];

export default function FSCHistorySection({ settings }) {
  const timeline = useMemo(() => {
    const arr = settings?.nosotros_history_timeline;
    return Array.isArray(arr) && arr.length ? arr : [];
  }, [settings]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  // Fase de transición: "in" (visible) o "out" (fade out). Cambiar de hito hace out → set active → in.
  const [phase, setPhase] = useState("in");

  useEffect(() => {
    // Al cambiar activeIdx, si estamos en "in" no hacemos nada; el helper `goTo` maneja la fase.
    if (phase === "out") {
      const t = setTimeout(() => setPhase("in"), 30);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!timeline.length) return null;
  const active = timeline[activeIdx] || timeline[0];

  const goTo = (newIdx) => {
    if (newIdx === activeIdx) return;
    setPhase("out");
    setTimeout(() => setActiveIdx(newIdx), 180);
  };
  const goPrev = () => goTo(activeIdx > 0 ? activeIdx - 1 : timeline.length - 1);
  const goNext = () => goTo(activeIdx < timeline.length - 1 ? activeIdx + 1 : 0);

  const title = settings?.nosotros_history_title || "FSC EN LA HISTORIA";
  const [top, ...rest] = title.split(/\s+/);
  const bottom = rest.join(" ");

  const photos = active.photos || [];
  const hasBody = !!(active.body && active.body.trim());
  const question = (active.question || "").trim();

  return (
    <section className="relative bg-white" data-testid="history-section">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ minHeight: "min(88vh, 780px)" }}>
        {/* Área central con fotos flotantes + texto */}
        <div className="relative w-full" style={{ minHeight: "min(76vh, 680px)" }}>
          {/* Fotos flotantes (desktop) — con fade in/out */}
          <div
            className={`hidden md:block absolute inset-0 transition-opacity duration-200 ${phase === "in" ? "opacity-100" : "opacity-0"}`}
            data-testid="history-photos-layer"
          >
            {SLOTS.map((slot, i) => {
              const p = photos[i];
              if (!p) return null;
              const isMain = slot.isMain;
              return (
                <div
                  key={`${active.key}-${i}`}
                  className="absolute"
                  style={{
                    left: slot.left,
                    top: slot.top,
                    width: slot.width,
                    transform: `rotate(${slot.rotate}deg)`,
                    zIndex: isMain ? 5 : 3,
                  }}
                  data-testid={`history-photo-${i}`}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      border: "3px solid #ffffff",
                      boxShadow: isMain ? "0 20px 44px rgba(0,0,0,0.28)" : "0 12px 28px rgba(0,0,0,0.16)",
                    }}
                  >
                    <img
                      src={imgSrc(p)}
                      alt=""
                      className="w-full object-cover block"
                      style={{ height: slot.h }}
                      loading="lazy"
                    />
                    {/* Overlay solo en la foto principal (idx 1): pregunta + botón LEE AQUÍ */}
                    {isMain && (question || hasBody) && (
                      <div
                        className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-3 pb-4 pt-16 text-center"
                        style={{
                          background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
                        }}
                        data-testid="history-main-overlay"
                      >
                        {question && (
                          <div
                            className="text-white leading-tight mb-3"
                            style={{
                              ...PLANE_CRASH,
                              fontSize: "clamp(1.6rem, 2.4vw, 2.6rem)",
                              textShadow: "2px 2px 0 rgba(0,0,0,0.6)",
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
                            className="px-6 py-2 bg-white rounded-sm shadow-md transition-transform hover:scale-105"
                            style={{
                              ...PLANE_CRASH,
                              color: RED,
                              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                              letterSpacing: "0.05em",
                            }}
                            data-testid="history-read-btn"
                          >
                            {planeCrashSafe("lee aquí")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Texto central FSC · EN LA HISTORIA — detrás de las fotos, siempre visible */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none"
            style={{ zIndex: 1 }}
          >
            <div
              className="leading-[0.85]"
              style={{
                ...PLANE_CRASH,
                color: RED,
                fontSize: "clamp(5rem, 15vw, 13rem)",
              }}
              data-testid="history-title-top"
            >
              {planeCrashSafe(top || "fsc")}
            </div>
            {bottom && (
              <div
                className="leading-none mt-1"
                style={{
                  ...PLANE_CRASH,
                  color: RED,
                  fontSize: "clamp(1.2rem, 3vw, 2.8rem)",
                  letterSpacing: "0.03em",
                }}
                data-testid="history-title-bottom"
              >
                {planeCrashSafe(bottom)}
              </div>
            )}
          </div>

          {/* Mobile: grid de fotos + overlay simplificado en la primera foto */}
          <div className={`md:hidden relative pt-4 pb-4 transition-opacity duration-200 ${phase === "in" ? "opacity-100" : "opacity-0"}`}>
            {photos.length > 0 && (
              <div className="relative w-full h-56 mb-3">
                {photos[1] || photos[0] ? (
                  <div className="relative w-full h-56 overflow-hidden" style={{ border: "3px solid #ffffff", boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>
                    <img src={imgSrc(photos[1] || photos[0])} alt="" className="w-full h-full object-cover" />
                    {(question || hasBody) && (
                      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-3 pb-3 pt-14 text-center" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
                        {question && (
                          <div className="text-white leading-tight mb-2 text-xl" style={{ ...PLANE_CRASH, textShadow: "1px 1px 0 rgba(0,0,0,0.6)" }}>
                            {planeCrashSafe(question)}
                          </div>
                        )}
                        {hasBody && (
                          <button type="button" onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-white rounded-sm shadow" style={{ ...PLANE_CRASH, color: RED, fontSize: "0.95rem" }} data-testid="history-read-btn-mobile">
                            {planeCrashSafe("lee aquí")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {photos.filter((_, i) => i !== 1).slice(0, 5).map((p, i) => (
                <div key={`m-${active.key}-${i}`} className="overflow-hidden" style={{ border: "2px solid #ffffff", boxShadow: "0 3px 10px rgba(0,0,0,0.15)" }}>
                  <img src={imgSrc(p)} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </div>
              ))}
            </div>
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

      {/* Franja azul con línea de tiempo */}
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
          <div className="flex items-baseline gap-3">
            <span
              className="text-white/80 uppercase tracking-widest text-xs"
              style={AGENCY_FB}
            >
              {label}
            </span>
            <span
              className="text-white leading-none"
              style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.9rem)" }}
              data-testid="history-modal-title"
            >
              {planeCrashSafe(question || "historia fsc")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
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
