/**
 * FSC EN LA HISTORIA — Sección de timeline navegable en /nosotros.
 *
 * DOS ESTADOS con TRANSICIÓN suave:
 *  - INTRODUCCIÓN: 6 fotos flotando (1 foto por cada hito, hasta 6 hitos) + texto
 *    "FSC EN LA HISTORIA" SUPERPUESTO (z-index sobre las fotos).
 *  - Al hacer clic en un año, la FOTO principal del hito seleccionado se AGRANDA
 *    (anima inset/rotate) hasta ocupar todo el área. Las OTRAS 5 FOTOS y el texto FSC
 *    hacen fade-out. Sobre la foto grande aparece overlay con la pregunta + botón "LEE AQUÍ".
 *
 * Cada hito tiene 1 sola foto: se usa como principal al seleccionarlo y compone el
 * collage de la introducción junto a las fotos de los demás hitos.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, renderPlaneCrash } from "../lib/designSystem";
import KowWelcome from "./KowWelcome";

const RED = "#e31f27";
const BLUE = "#0640c8";

// Slots relativos para las 6 fotos flotantes en modo INTRO.
// La posición 0 (sup-izq) es la que se expande a banner completo en modo YEAR.
const SLOTS = [
  { left: "3%",  top: "6%",   width: "22%", height: "24%", rotate: -2 },
  { left: "34%", top: "0%",   width: "32%", height: "38%", rotate: 1.5 },
  { left: "76%", top: "8%",   width: "21%", height: "24%", rotate: 2 },
  { left: "5%",  top: "58%",  width: "22%", height: "26%", rotate: -2 },
  { left: "36%", top: "62%",  width: "26%", height: "30%", rotate: -1 },
  { left: "78%", top: "60%",  width: "18%", height: "22%", rotate: 2.5 },
];

// Timing de la flotación independiente por foto (duración en s, delay en s, amplitud en px).
const FLOAT = [
  { duration: 3.4, delay: 0,   amp: -6 },
  { duration: 4.2, delay: 0.6, amp: -8 },
  { duration: 3.8, delay: 1.2, amp: -5 },
  { duration: 4.6, delay: 0.3, amp: -7 },
  { duration: 3.6, delay: 0.9, amp: -6 },
  { duration: 4.0, delay: 1.5, amp: -8 },
];

// Caja de "FSC" — centrada y más angosta que el slot central para que el trazo grueso
// de Plane Crash quede completamente sobre la foto, sin desbordar al fondo blanco.
const FSC_BOX = { left: "37%", top: "16%", width: "26%", height: "32%" };
// Caja de "EN LA HISTORIA" — debajo del slot central, sobre fondo blanco (sin foto detrás).
const SUBTITLE_BOX = { left: "10%", top: "49%", width: "80%", height: "13%" };

// Posición cover completa (usada por la foto principal en modo YEAR).
const COVER = { left: "0%", top: "0%", width: "100%", height: "100%", rotate: 0 };

// Convierte un HEX (#rrggbb) a "r,g,b" para poder aplicarle opacidad con rgba().
function hexToRgbTuple(hex) {
  const clean = (hex || "").replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export default function FSCHistorySection({ settings }) {
  const timeline = useMemo(() => {
    const arr = settings?.nosotros_history_timeline;
    return Array.isArray(arr) && arr.length ? arr : [];
  }, [settings]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  // Delay para el overlay (aparece tras la expansión de la foto).
  const [showOverlay, setShowOverlay] = useState(false);
  // Bienvenida de Kow — visible al montar y cada vez que se vuelve a INTRODUCCIÓN.
  const [showKow, setShowKow] = useState(true);

  const active = timeline[activeIdx] || timeline[0];
  const isIntro = !active || (active.key || "").toLowerCase() === "intro" || activeIdx === 0;

  // Al entrar/volver a modo INTRO mostramos otra vez la bienvenida de Kow.
  useEffect(() => {
    if (isIntro) setShowKow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Collage de INTRO: 1 foto por cada hito (no-intro), hasta 6. Cada foto flotante
  // representa un hito distinto en lugar de exigir 6 fotos en un único hito.
  const introPhotos = useMemo(() => {
    return timeline
      .filter((m) => (m.key || "").toLowerCase() !== "intro")
      .map((m) => (m.photos || [])[0])
      .filter(Boolean)
      .slice(0, 6);
  }, [timeline]);

  // Cada vez que cambiamos a un año, esperamos 420ms antes de mostrar el overlay
  // pregunta + LEE AQUÍ para que la animación de expansión se aprecie.
  useEffect(() => {
    if (isIntro) {
      setShowOverlay(false);
      return;
    }
    const t = setTimeout(() => setShowOverlay(true), 420);
    return () => clearTimeout(t);
  }, [activeIdx, isIntro]);

  if (!timeline.length) return null;

  const goTo = (newIdx) => {
    if (newIdx === activeIdx) return;
    setShowOverlay(false); // oculta overlay durante la transición
    setActiveIdx(newIdx);
  };
  const goPrev = () => goTo(activeIdx > 0 ? activeIdx - 1 : timeline.length - 1);
  const goNext = () => goTo(activeIdx < timeline.length - 1 ? activeIdx + 1 : 0);

  const title = settings?.nosotros_history_title || "FSC EN LA HISTORIA";
  const [topWord, ...rest] = title.split(/\s+/);
  const bottomWords = rest.join(" ");

  const photos = active.photos || [];
  const hasBody = !!(active.body && active.body.trim());
  const question = (active.question || "").trim();

  return (
    <section className="relative bg-white" data-testid="history-section">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ minHeight: "min(88vh, 780px)" }}>
        {/* Área central con posición relativa */}
        <div className="relative w-full overflow-hidden" style={{ minHeight: "min(76vh, 680px)" }}>
          {showKow && (
            <KowWelcome
              imageUrl={settings?.nosotros_kow_image_url || settings?.mascot_image_url}
              text={settings?.nosotros_kow_welcome_text}
              onDone={() => setShowKow(false)}
            />
          )}

          {/* Desktop: 6 fotos absolutamente posicionadas — animan hacia cover en modo YEAR */}
          <div className="hidden md:block absolute inset-0" data-testid="history-photos-wrapper">
            {SLOTS.map((slot, i) => {
              const isMain = i === 0;
              // Slot principal: en INTRO muestra la 1ª foto del collage; en YEAR, la foto del hito activo.
              // Slots 1-5: siempre muestran su foto del collage (una por hito) para que la
              // transición no cambie de imagen, solo se desvanecen en modo YEAR.
              const p = isMain ? (isIntro ? introPhotos[0] : (active.photos || [])[0]) : introPhotos[i];
              if (!p) return null;
              // Si estamos en modo YEAR y esta es la foto principal, la llevamos a cover.
              const target = !isIntro && isMain ? COVER : slot;
              // Otras fotos (no la principal) hacen fade-out en modo YEAR.
              const opacity = !isIntro && !isMain ? 0 : 1;
              // La foto principal en modo YEAR sube z-index y quita border/shadow.
              const zIndex = !isIntro && isMain ? 6 : 3;
              const isCovering = !isIntro && isMain;
              const floatCfg = FLOAT[i] || FLOAT[0];
              const clickable = isIntro;
              return (
                <div
                  key={`slot-${i}`}
                  className="absolute"
                  style={{
                    left: target.left,
                    top: target.top,
                    width: target.width,
                    height: target.height,
                    transform: `rotate(${target.rotate}deg)`,
                    opacity,
                    zIndex,
                    pointerEvents: clickable ? "auto" : "none",
                    cursor: clickable ? "pointer" : "default",
                    transition: "left 0.55s cubic-bezier(0.22,1,0.36,1), top 0.55s cubic-bezier(0.22,1,0.36,1), width 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease",
                  }}
                  onClick={clickable ? () => goTo(i + 1) : undefined}
                  data-testid={`history-photo-${i}`}
                >
                  <div
                    className="relative w-full h-full overflow-hidden"
                    style={{
                      border: isCovering ? "none" : "3px solid #ffffff",
                      boxShadow: isCovering ? "none" : "0 12px 28px rgba(0,0,0,0.18)",
                      transition: "border 0.35s ease, box-shadow 0.35s ease",
                      animation: isIntro ? `fsc-float ${floatCfg.duration}s ease-in-out ${floatCfg.delay}s infinite` : "none",
                      "--float-amp": `${floatCfg.amp}px`,
                    }}
                  >
                    <img src={imgSrc(p)} alt="" className="w-full h-full object-cover block" loading="lazy" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* "FSC" en Plane Crash rojo, SUPERPUESTO sobre la foto central (slot principal) */}
          <div
            className="absolute flex items-center justify-center text-center pointer-events-none select-none"
            style={{
              left: FSC_BOX.left,
              top: FSC_BOX.top,
              width: FSC_BOX.width,
              height: FSC_BOX.height,
              zIndex: 5,
              opacity: isIntro ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
            aria-hidden={!isIntro}
          >
            <div
              className="leading-[0.85]"
              style={{
                ...PLANE_CRASH,
                color: RED,
                fontSize: "clamp(5rem, 15vw, 13rem)",
                textShadow: "0 6px 18px rgba(255,255,255,0.4)",
              }}
              data-testid="history-title-top"
            >
              {renderPlaneCrash(topWord || "fsc")}
            </div>
          </div>

          {/* "EN LA HISTORIA" — debajo de "FSC", sobre el fondo blanco de la sección (sin foto) */}
          {bottomWords && (
            <div
              className="absolute flex items-center justify-center text-center pointer-events-none select-none"
              style={{
                left: SUBTITLE_BOX.left,
                top: SUBTITLE_BOX.top,
                width: SUBTITLE_BOX.width,
                height: SUBTITLE_BOX.height,
                zIndex: 5,
                opacity: isIntro ? 1 : 0,
                transition: "opacity 0.35s ease",
              }}
              aria-hidden={!isIntro}
            >
              <div
                className="leading-none"
                style={{
                  ...PLANE_CRASH,
                  color: RED,
                  fontSize: "clamp(1.2rem, 3vw, 2.8rem)",
                  letterSpacing: "0.03em",
                }}
                data-testid="history-title-bottom"
              >
                {renderPlaneCrash(bottomWords)}
              </div>
            </div>
          )}

          {/* Overlay YEAR: pregunta + LEE AQUÍ (aparece con delay tras la expansión) */}
          {!isIntro && (question || hasBody) && (
            <div
              className="hidden md:flex absolute inset-x-0 bottom-0 flex-col items-center justify-end px-6 pb-16 pt-24 text-center"
              style={{
                zIndex: 8,
                background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)",
                opacity: showOverlay ? 1 : 0,
                transition: "opacity 0.4s ease",
                pointerEvents: showOverlay ? "auto" : "none",
              }}
              data-testid="history-year-overlay"
            >
              {question && (
                <div
                  className="text-white leading-tight mb-4 max-w-xl mx-auto"
                  style={{
                    ...PLANE_CRASH,
                    fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
                    textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
                  }}
                  data-testid="history-question"
                >
                  {renderPlaneCrash(question)}
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
                  {renderPlaneCrash("lee aquí")}
                </button>
              )}
            </div>
          )}

          {/* Mobile: sin animaciones complejas — INTRO muestra grid, YEAR muestra banner */}
          <div className="md:hidden relative pt-4 pb-6">
            {isIntro ? (
              <>
                <div className="text-center mb-4 py-6">
                  <div className="leading-[0.85]" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(4rem, 20vw, 6rem)" }}>
                    {renderPlaneCrash(topWord || "fsc")}
                  </div>
                  {bottomWords && (
                    <div className="leading-none mt-1" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(1rem, 5vw, 1.6rem)" }}>
                      {renderPlaneCrash(bottomWords)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {introPhotos.map((p, i) => (
                    <div key={`m-${i}`} className="overflow-hidden" style={{ border: "2px solid #ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
                      <img src={imgSrc(p)} alt="" className="w-full h-32 object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="relative w-full h-72 overflow-hidden" style={{ border: "2px solid #ffffff" }}>
                {photos[0] ? (
                  <img src={imgSrc(photos[0])} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: BLUE }}>
                    <span className="text-white/60" style={{ ...PLANE_CRASH, fontSize: "2.4rem" }}>{renderPlaneCrash(active.label || "")}</span>
                  </div>
                )}
                {(question || hasBody) && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-3 pb-3 pt-14 text-center" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
                    {question && (
                      <div className="text-white leading-tight mb-2 text-xl" style={{ ...PLANE_CRASH, textShadow: "1px 1px 0 rgba(0,0,0,0.6)" }}>
                        {renderPlaneCrash(question)}
                      </div>
                    )}
                    {hasBody && (
                      <button type="button" onClick={() => setModalOpen(true)} className="px-4 py-1.5 bg-white rounded-sm shadow" style={{ ...PLANE_CRASH, color: RED, fontSize: "0.95rem" }} data-testid="history-read-btn-mobile">
                        {renderPlaneCrash("lee aquí")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botones ← → circulares */}
        <div className="flex justify-end gap-3 pr-2 md:pr-8 pt-6 pb-8 md:absolute md:bottom-4 md:right-8 md:pt-0 md:pb-0" style={{ zIndex: 20 }}>
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
            <div className="absolute inset-0 flex items-center">
              {timeline.map((m, i) => {
                const isActive = i === activeIdx;
                return (
                  <div key={m.key} className="flex-1 flex items-center justify-center">
                    <button
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
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center mt-4">
            {timeline.map((m, i) => (
              <button
                key={`lbl-${m.key}`}
                type="button"
                onClick={() => goTo(i)}
                className="text-white uppercase tracking-widest text-base sm:text-lg md:text-xl lg:text-2xl text-center flex-1"
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

      {/* Modal LEE AQUÍ — alterna azul/rojo según el hito para que no se vean todos iguales */}
      {modalOpen && hasBody && (
        <HistoryReadModal
          question={question}
          body={active.body}
          label={active.label}
          photo={photos[0]}
          overlayColor={activeIdx % 2 === 0 ? RED : BLUE}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

function HistoryReadModal({ question, body, label, photo, overlayColor = RED, onClose }) {
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
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
      data-testid="history-modal"
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fondo: foto del hito (o azul de respaldo) */}
        {photo ? (
          <img src={imgSrc(photo)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: BLUE }} />
        )}
        {/* Velo translúcido encima de la foto (alterna azul/rojo por hito) */}
        <div className="absolute inset-0" style={{ background: `rgba(${hexToRgbTuple(overlayColor)},0.74)` }} />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white/90 hover:text-white bg-black/25 hover:bg-black/45 rounded-full p-2 transition"
          aria-label="Cerrar"
          data-testid="history-modal-close"
        >
          <X size={24} />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center px-6 sm:px-12 py-14 sm:py-16 min-h-[340px] max-h-[85vh] overflow-hidden">
          {label && (
            <span className="text-white/85 uppercase tracking-[0.25em] text-xs sm:text-sm mb-5 font-bold shrink-0" style={AGENCY_FB}>
              {label}
            </span>
          )}
          {question && (
            <div
              className="text-white leading-tight mb-5 max-w-2xl shrink-0"
              style={{ ...PLANE_CRASH, fontSize: "clamp(1.6rem, 3vw, 2.6rem)", textShadow: "2px 2px 0 rgba(0,0,0,0.35)" }}
              data-testid="history-modal-title"
            >
              {renderPlaneCrash(question)}
            </div>
          )}
          <div className="w-full overflow-y-auto flex-1 min-h-0" data-testid="history-modal-body-scroll">
          <div
            className="text-white leading-relaxed whitespace-pre-line max-w-2xl mx-auto font-semibold"
            style={{ ...AGENCY_FB, fontSize: "clamp(1.15rem, 2.1vw, 1.6rem)", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}
            data-testid="history-modal-body"
          >
            {body}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
