/**
 * Texto cursivo que se estira para ocupar exactamente el ancho disponible del
 * contenedor padre — pero SIN deformar las letras (evita `scaleX`, que rompe los
 * trazos del script/cursiva). En su lugar calcula el `letter-spacing` necesario
 * para que el texto, a tamaño normal, llegue exactamente al borde derecho.
 */
import { useEffect, useRef } from "react";
import { CURSIVE } from "../lib/designSystem";

export function StretchedTagline({ text, color, className = "", testId }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const fit = () => {
      txt.style.letterSpacing = "normal";
      const containerWidth = el.offsetWidth;
      const naturalWidth = txt.scrollWidth;
      const chars = text.length;
      const fontSizePx = parseFloat(getComputedStyle(txt).fontSize) || 32;
      const maxSpacing = fontSizePx * 0.16; // tope para que el cursivo no se vea "roto" por exceso de espacio
      if (containerWidth > 0 && naturalWidth > 0 && containerWidth > naturalWidth && chars > 1) {
        const extra = Math.min((containerWidth - naturalWidth) / chars, maxSpacing);
        txt.style.letterSpacing = `${extra}px`;
      }
    };

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`hidden md:flex flex-1 min-w-0 overflow-hidden items-center justify-center ${className}`}>
      <span
        ref={textRef}
        data-testid={testId}
        className="inline-block whitespace-nowrap italic leading-none"
        style={{ ...CURSIVE, color, fontSize: "clamp(2.2rem, 3.8vw, 4rem)" }}
      >
        {text}
      </span>
    </div>
  );
}
