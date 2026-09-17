/**
 * Texto cursivo (Natura Script) que ocupa EXACTAMENTE el ancho disponible del
 * contenedor — sin `scaleX` (deforma los trazos) y sin `letter-spacing` (rompe las
 * uniones entre letras del script, que debe verse "pegado" tal como es la fuente).
 * En su lugar se ajusta el `font-size` de forma uniforme (escala ancho y alto por
 * igual, preserva la forma exacta de la letra) hasta que el texto llegue al borde.
 * Se mantiene oculto hasta que la fuente Natura Script termine de cargar, para
 * evitar el parpadeo (FOUT) de ver primero una fuente de reemplazo.
 */
import { useEffect, useRef, useState } from "react";
import { CURSIVE } from "../lib/designSystem";

const BASE_PX = 32;

export function StretchedTagline({ text, color, className = "", testId }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const fit = () => {
      txt.style.fontSize = `${BASE_PX}px`;
      const containerWidth = el.offsetWidth;
      const naturalWidth = txt.scrollWidth;
      if (containerWidth > 0 && naturalWidth > 0) {
        // Margen de seguridad: Natura Script tiene rasgos/florituras que se salen de la
        // caja del glifo (ej. la "l" final) — sin este margen, overflow-hidden las recorta.
        // También deja un poco de aire a la izquierda para correr el texto hacia la derecha.
        const SAFETY = 0.85;
        txt.style.fontSize = `${BASE_PX * (containerWidth / naturalWidth) * SAFETY}px`;
      }
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { fit(); setReady(true); });
    } else {
      fit();
      setReady(true);
    }
    let raf = null;
    const ro = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(el);
    return () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); };
  }, [text]);

  return (
    <div ref={containerRef} className={`flex-1 min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        data-testid={testId}
        className="inline-block whitespace-nowrap italic leading-none ml-10 md:ml-16 transition-opacity duration-300"
        style={{ ...CURSIVE, color, fontWeight: 100, fontSize: `${BASE_PX}px`, opacity: ready ? 1 : 0 }}
      >
        {text}
      </span>
    </div>
  );
}
