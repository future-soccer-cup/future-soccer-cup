import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Cuenta numérica animada con easing.
 * Inicia en 0 y termina en `value` cuando el elemento entra al viewport (una sola vez).
 *
 * Props:
 *  - value: número final (puede ser string ej. "+1K" — se extrae el número y se respetan prefijos/sufijos)
 *  - duration: ms (default 1600)
 *  - prefix: string opcional antes del número
 *  - suffix: string opcional después del número
 *  - decimals: cantidad de decimales (default 0)
 *  - as: tag HTML (default "span")
 */
export default function Counter({
  value,
  duration = 1600,
  prefix = "",
  suffix = "",
  decimals = 0,
  as: Tag = "span",
  className,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  // Si llega un string como "+1K", "+10K", "+100" lo desempacamos.
  const { num, autoPrefix, autoSuffix } = parseValue(value);
  const finalPrefix = prefix || autoPrefix;
  const finalSuffix = suffix || autoSuffix;

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(num * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, num, duration]);

  const formatted = display.toLocaleString("es-CO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

  return (
    <Tag ref={ref} className={className} style={{ willChange: "contents", ...style }} {...rest}>
      {finalPrefix}{formatted}{finalSuffix}
    </Tag>
  );
}

function parseValue(v) {
  if (typeof v === "number") return { num: v, autoPrefix: "", autoSuffix: "" };
  if (typeof v !== "string") return { num: 0, autoPrefix: "", autoSuffix: "" };

  // Captura prefijo no-numérico ("+", etc.), número (con K/M opcional) y sufijo
  const m = v.match(/^([^\d.,-]*)(-?[\d.,]+)([Kk])?([Mm])?(.*)$/);
  if (!m) return { num: 0, autoPrefix: v, autoSuffix: "" };
  const rawNum = parseFloat(m[2].replace(/,/g, "")) || 0;
  // Si tiene sufijo K/M, conservamos el sufijo como texto y animamos el número visible (1, 10, 100)
  const suffix = (m[3] ? m[3].toUpperCase() : "") + (m[4] ? m[4].toUpperCase() : "") + (m[5] || "");
  return { num: rawNum, autoPrefix: m[1] || "", autoSuffix: suffix };
}
