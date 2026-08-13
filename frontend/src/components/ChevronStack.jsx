/**
 * Stack de 5 chevrones apilados apuntando hacia arriba (o abajo).
 * Estilo decorativo inspirado en flechas tipo "navegación" con líneas finas y opacidad decreciente.
 * Color totalmente configurable por sección (blanco / azul / rojo).
 *
 * Props:
 *  - color: CSS color (e.g. "#ffffff", "#0640c8", "#e31f27")
 *  - size: ancho total en px (default 56)
 *  - direction: "up" | "down" (default "up")
 *  - count: nº de chevrones (default 5)
 *  - testId
 */
export default function ChevronStack({ color = "#ffffff", size = 56, direction = "up", count = 5, testId }) {
  // Cada chevron es un <svg> con dos líneas formando una "V" invertida.
  // Vamos a generar `count` chevrones con opacidad decreciente del 1 al ~0.4.
  const items = Array.from({ length: count });
  const rotation = direction === "down" ? 180 : 0;
  return (
    <div
      className="inline-flex flex-col items-center"
      style={{ transform: `rotate(${rotation}deg)` }}
      data-testid={testId}
      aria-hidden="true"
    >
      {items.map((_, i) => {
        const opacity = Math.max(0.4, 1 - i * 0.13);
        // Cada chevron ocupa size de ancho y ~0.45*size de alto.
        // Strokes ligeramente más delgados hacia abajo, y el ancho también se reduce
        // levemente hacia abajo para lograr el efecto de "embudo" del ejemplo del usuario
        // (el chevron de arriba es el más grande/marcado, el de abajo el más chico/tenue).
        const stroke = Math.max(2, 5 - i * 0.5);
        const scale = Math.max(0.62, 1 - i * 0.09);
        return (
          <svg
            key={i}
            width={size * scale}
            height={size * scale * 0.42}
            viewBox="0 0 100 42"
            style={{ opacity, marginTop: i === 0 ? 0 : -size * scale * 0.18 }}
          >
            <polyline
              points="6,36 50,8 94,36"
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
