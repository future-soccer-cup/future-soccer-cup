import { useEffect, useState } from "react";

/**
 * Carrusel de imágenes con crossfade automático.
 * - Si `images` tiene 0 elementos: no renderiza nada.
 * - Si tiene 1 elemento: muestra esa imagen fija, sin rotación.
 * - Si tiene 2+ elementos: rota cada `intervalMs` (default 4500ms) con un crossfade de `fadeMs` (default 1000ms).
 *
 * Props:
 *  - images: string[] — URLs (puede ser raw o procesadas con imgSrc por el padre)
 *  - intervalMs: tiempo entre cambios (default 4500)
 *  - fadeMs: duración del crossfade (default 1000)
 *  - alt, className, style, testId
 *  - imgClassName, imgStyle: aplicados a cada <img>
 */
export default function ImageCarousel({
  images = [],
  intervalMs = 4500,
  fadeMs = 1000,
  alt = "",
  className,
  style,
  imgClassName,
  imgStyle,
  testId,
}) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      setActive((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [list.length, intervalMs]);

  if (list.length === 0) return null;

  // Caso 1 imagen: render simple (sin overlap ni transición), siempre visible.
  if (list.length === 1) {
    return (
      <div className={className} style={style} data-testid={testId}>
        <img src={list[0]} alt={alt} loading="eager" className={imgClassName} style={imgStyle} />
      </div>
    );
  }

  // Caso 2+ imágenes: overlap absoluto + crossfade vía opacity.
  return (
    <div className={className} style={{ position: "relative", ...style }} data-testid={testId}>
      {list.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          loading={i === 0 ? "eager" : "lazy"}
          className={imgClassName}
          style={{
            ...imgStyle,
            position: "absolute",
            inset: 0,
            opacity: i === active ? 1 : 0,
            transition: `opacity ${fadeMs}ms ease-in-out`,
            willChange: "opacity",
          }}
        />
      ))}
    </div>
  );
}
