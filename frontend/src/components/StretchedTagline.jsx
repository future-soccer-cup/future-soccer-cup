/**
 * Texto cursivo que se ESTIRA horizontalmente (scaleX) para ocupar exactamente
 * el ancho disponible del contenedor padre — igual que cuando se arrastra una caja
 * de texto en una herramienta de diseño (Illustrator/Canva). Se usa para el tagline
 * "Torneo Internacional" que debe abarcar desde el lado del logo hasta el final del menú.
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
      txt.style.transform = "scaleX(1)";
      const containerWidth = el.offsetWidth;
      const naturalWidth = txt.scrollWidth;
      if (containerWidth > 0 && naturalWidth > 0) {
        txt.style.transform = `scaleX(${containerWidth / naturalWidth})`;
      }
    };

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`hidden md:block flex-1 min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        data-testid={testId}
        className="inline-block whitespace-nowrap italic origin-left leading-none"
        style={{ ...CURSIVE, color, fontSize: "clamp(1.6rem, 2.8vw, 2.8rem)" }}
      >
        {text}
      </span>
    </div>
  );
}
