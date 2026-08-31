/**
 * Texto cursivo (Natura Script) que ocupa EXACTAMENTE el ancho disponible del
 * contenedor — sin `scaleX` (deforma los trazos) y sin `letter-spacing` (rompe las
 * uniones entre letras del script, que debe verse "pegado" tal como es la fuente).
 * En su lugar se ajusta el `font-size` de forma uniforme (escala ancho y alto por
 * igual, preserva la forma exacta de la letra) hasta que el texto llegue al borde.
 */
import { useEffect, useRef } from "react";
import { CURSIVE } from "../lib/designSystem";

const BASE_PX = 32;

export function StretchedTagline({ text, color, className = "", testId }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const fit = () => {
      txt.style.fontSize = `${BASE_PX}px`;
      const containerWidth = el.offsetWidth;
      const naturalWidth = txt.scrollWidth;
      if (containerWidth > 0 && naturalWidth > 0) {
        txt.style.fontSize = `${BASE_PX * (containerWidth / naturalWidth)}px`;
      }
    };

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let raf = null;
    const ro = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(el);
    return () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); };
  }, [text]);

  return (
    <div ref={containerRef} className={`hidden md:block flex-1 min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        data-testid={testId}
        className="inline-block whitespace-nowrap italic leading-none"
        style={{ ...CURSIVE, color, fontSize: `${BASE_PX}px` }}
      >
        {text}
      </span>
    </div>
  );
}
