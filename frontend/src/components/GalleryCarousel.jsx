import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Carrusel de galería "3-up" (imagen central más grande, laterales más chicas)
 * con flechas circulares a los costados y auto-rotación — mismo estilo que la
 * galería de "FINALES" en Inicio. Reutilizable para Escenarios/Premiación en Eventos.
 *
 * Props:
 *  - images: string[] (URLs ya resueltas, ej. con imgSrc())
 *  - testIdPrefix: string, para generar data-testid únicos (ej. "scenarios")
 *  - accentColor: color del ring/flechas del item central (default azul FSC)
 *  - autoRotateMs: intervalo de auto-avance (default 5000, solo si hay >3 imágenes)
 */
export default function GalleryCarousel({ images = [], testIdPrefix = "gallery", accentColor = "#0640c8", autoRotateMs = 5000 }) {
  const list = images.filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const advance = (dir) => {
    setDirection(dir);
    setIdx((i) => {
      const len = Math.max(list.length, 1);
      return ((i + dir) % len + len) % len;
    });
  };

  useEffect(() => {
    if (list.length <= 3) return;
    const t = setInterval(() => {
      setDirection(1);
      setIdx((i) => (i + 1) % list.length);
    }, autoRotateMs);
    return () => clearInterval(t);
  }, [list.length, autoRotateMs]);

  if (list.length === 0) {
    return (
      <div className="w-full h-48 md:h-64 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm italic" data-testid={`${testIdPrefix}-empty`}>
        Aún no hay fotos configuradas.
      </div>
    );
  }

  const visible = [0, 1, 2].map((i) => list[(idx + i) % list.length]);

  return (
    <div className="relative" data-testid={`${testIdPrefix}-carousel`}>
      <button
        type="button"
        onClick={() => advance(-1)}
        disabled={list.length < 2}
        className="absolute -left-2 lg:-left-8 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
        aria-label="Anterior"
        data-testid={`${testIdPrefix}-prev`}
        style={{ color: accentColor }}
      >
        <ChevronLeft size={32} strokeWidth={3} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {visible.map((src, i) => {
          const isMiddle = i === 1;
          const colSpan = isMiddle ? "md:col-span-6" : "md:col-span-3";
          const aspect = isMiddle ? "aspect-[16/11]" : "aspect-[4/3]";
          const ringExtra = isMiddle ? "shadow-2xl ring-4" : "shadow-md opacity-70";
          return (
            <div
              key={`slot-${i}`}
              className={`${colSpan} ${aspect} ${ringExtra} rounded-lg overflow-hidden relative`}
              style={{ background: accentColor, ...(isMiddle ? { "--tw-ring-color": "#ffffff" } : {}) }}
              data-testid={`${testIdPrefix}-item-${i}`}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.img
                  key={`${src}-${i}-${idx}`}
                  src={src}
                  alt=""
                  loading="lazy"
                  custom={direction}
                  initial={(d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0.6 })}
                  animate={{ x: 0, opacity: isMiddle ? 1 : 0.85 }}
                  exit={(d) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0.6 })}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ willChange: "transform, opacity" }}
                  draggable={false}
                />
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => advance(1)}
        disabled={list.length < 2}
        className="absolute -right-2 lg:-right-8 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
        aria-label="Siguiente"
        data-testid={`${testIdPrefix}-next`}
        style={{ color: accentColor }}
      >
        <ChevronRight size={32} strokeWidth={3} />
      </button>
    </div>
  );
}
