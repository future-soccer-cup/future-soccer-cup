import { useCallback, useEffect, useState } from "react";
import { AGENCY_FB } from "../lib/designSystem";
import { imgSrc } from "../lib/api";

const RED = "#e31f27";
const AUTO_DISMISS_MS = 10000;

/**
 * Pantalla de bienvenida de Kow — ocupa solo el área de "FSC en la Historia" (no toda la
 * página), tapando por completo lo que hay detrás (el collage/grid de introducción) hasta
 * que se cierra. Es `position: absolute` dentro de esa sección, así que su alto lo define
 * el contenedor padre — por eso mide su propio contenido (imagen + texto) con
 * ResizeObserver y avisa el resultado vía `onHeightChange`, para que el padre
 * (`FSCHistorySection`) le reserve exactamente ese alto como mínimo y nunca la recorte
 * ni la deje desbordarse sobre lo que sigue en la página.
 */
export default function KowWelcome({ imageUrl, text, onDone, onHeightChange }) {
  const [closing, setClosing] = useState(false);
  const [imgReady, setImgReady] = useState(!imageUrl);
  // Proporción real (ancho/alto) de la imagen, medida al precargarla. Mientras no se
  // conozca usamos 3/4 como valor aproximado, así la imagen reserva espacio desde el
  // primer render y no salta de 0px a su alto real cuando termina de cargar — el texto
  // de al lado, centrado verticalmente, tampoco se corre.
  const [imgRatio, setImgRatio] = useState(0.75);
  const [contentEl, setContentEl] = useState(null);
  const contentRef = useCallback((node) => setContentEl(node), []);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDone, 400);
  };

  // Si no hay ni imagen ni texto configurados, no mostramos una pantalla en blanco.
  useEffect(() => {
    if (!imageUrl && !text) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precarga la imagen de Kow para que no aparezca vacía mientras el navegador la descarga.
  useEffect(() => {
    if (!imageUrl) return;
    setImgReady(false);
    const im = new Image();
    im.onload = () => {
      if (im.naturalWidth && im.naturalHeight) setImgRatio(im.naturalWidth / im.naturalHeight);
      setImgReady(true);
    };
    im.onerror = () => setImgReady(true);
    im.src = imgSrc(imageUrl);
    // Red de seguridad: si tarda demasiado, mostramos igual tras 1.2s.
    const t = setTimeout(() => setImgReady(true), 1200);
    return () => clearTimeout(t);
  }, [imageUrl]);

  useEffect(() => {
    if (!imgReady) return;
    const t = setTimeout(close, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgReady]);

  // Mide el alto real del contenido (imagen + texto) cada vez que cambia — incluido el
  // salto de tamaño cuando la imagen termina de cargar y pasa de 0 a su alto real — y lo
  // reporta hacia arriba para que el padre reserve exactamente ese espacio.
  useEffect(() => {
    if (!contentEl || !onHeightChange) return;
    const report = () => onHeightChange(contentEl.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [contentEl, onHeightChange]);

  if (!imageUrl && !text) return null;

  return (
    <div
      className="absolute inset-0 z-20 bg-white flex items-center justify-center px-4 sm:px-8 cursor-pointer"
      style={{ opacity: closing ? 0 : 1, transition: "opacity 0.4s ease" }}
      onClick={close}
      data-testid="kow-welcome-screen"
    >
      <div
        ref={contentRef}
        className="max-w-5xl w-full flex flex-col sm:flex-row items-center gap-6 sm:gap-10"
        style={{ opacity: imgReady ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        {imageUrl && (
          <img
            src={imgSrc(imageUrl)}
            alt="Kow"
            className="w-56 sm:w-72 md:w-80 lg:w-96 h-auto object-contain flex-shrink-0"
            style={{ aspectRatio: imgRatio }}
            data-testid="kow-welcome-image"
          />
        )}
        <p
          className="text-center sm:text-justify leading-relaxed"
          style={{ ...AGENCY_FB, color: RED, fontSize: "clamp(1.3rem, 2.6vw, 2.2rem)", fontWeight: 600 }}
          data-testid="kow-welcome-text"
        >
          {text}
        </p>
      </div>
    </div>
  );
}
