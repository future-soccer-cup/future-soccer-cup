import { useEffect, useState } from "react";

/**
 * Carrusel de imágenes con crossfade automático.
 * - 0 imágenes → no renderiza nada.
 * - 1 imagen → renderiza un `<img>` "transparente" sin wrapper (mismas props que un img normal).
 * - 2+ imágenes → wrapper absoluto con todos los frames superpuestos, crossfade automático.
 *
 * Cuando hay 2+ imágenes, el wrapper hereda `className`/`style` del prop. Cada `<img>`
 * recibe `imgClassName`/`imgStyle`. Cuando hay 1 sola, la `<img>` directamente recibe
 * el `className` y un `style` que combina `style` + `imgStyle` (para mantener compat
 * con la API anterior basada en un solo `<img>`).
 *
 * Props:
 *  - images: string[] (URLs)
 *  - intervalMs: tiempo entre cambios (default 4500)
 *  - fadeMs: duración del crossfade (default 1000)
 *  - alt, className, style, imgClassName, imgStyle, testId
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

  // Caso 1 imagen: render directamente un `<img>` con las clases y estilos combinados,
  // sin wrapper. Mismo comportamiento exacto que un `<img>` plano (compat 100% con el
  // markup anterior basado en `<img src={s.hero_foreground_url} ...>`).
  if (list.length === 1) {
    return (
      <img
        src={list[0]}
        alt={alt}
        loading="eager"
        className={[className, imgClassName].filter(Boolean).join(" ")}
        style={{ ...style, ...imgStyle }}
        data-testid={testId}
      />
    );
  }

  // Caso 2+ imágenes: wrapper con className/style del usuario intactos
  // (incluyendo `absolute` de Tailwind si aplica). Inner div con position:relative
  // sirve como contexto de posicionamiento para las imágenes superpuestas.
  return (
    <div className={className} style={style} data-testid={testId}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
    </div>
  );
}
