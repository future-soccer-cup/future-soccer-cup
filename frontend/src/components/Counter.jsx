import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Cuenta numérica animada con easing.
 * Inicia en 0 y termina en `value` cuando el elemento entra al viewport (una sola vez).
 *
 * Props:
 *  - value: número o string (ej. "+1K", "+10K", "+100", "11"). Si tiene sufijo K/M se preserva como texto.
 *  - duration: ms (default 1600)
 *  - prefix: string opcional antes del número (sobrescribe el detectado en value)
 *  - suffix: string opcional después del número (sobrescribe el detectado en value)
 *  - decimals: cantidad de decimales (default 0)
 *  - transform: función opcional aplicada al string final completo (ej. planeCrashSafe)
 *  - as: tag HTML (default "span")
 */
export default function Counter({
  value,
  duration = 1600,
  prefix = "",
  suffix = "",
  decimals = 0,
  transform,
  as: Tag = "span",
  className,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

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
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, num, duration]);

  // Al finalizar la animación, renderizamos el texto ORIGINAL exacto (sin riesgo de
  // que el formateo numérico difiera del valor original). Antes, el formato durante
  // la animación usaba toLocaleString.
  const raw = done
    ? `${finalPrefix}${formatNumber(num, decimals)}${finalSuffix}`
    : `${finalPrefix}${formatNumber(display, decimals)}${finalSuffix}`;
  const out = transform ? transform(raw) : raw;

  return (
    <Tag ref={ref} className={className} style={{ willChange: "contents", ...style }} {...rest}>
      {out}
    </Tag>
  );
}

function formatNumber(n, decimals) {
  return n.toLocaleString("es-CO", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function parseValue(v) {
  if (typeof v === "number") return { num: v, autoPrefix: "", autoSuffix: "" };
  if (typeof v !== "string") return { num: 0, autoPrefix: "", autoSuffix: "" };

  // Captura prefijo no-numérico ("+", etc.), número (con K/M opcional) y sufijo
  const m = v.match(/^([^\d.,-]*)(-?[\d.,]+)([Kk])?([Mm])?(.*)$/);
  if (!m) return { num: 0, autoPrefix: v, autoSuffix: "" };
  const rawNum = parseFloat(m[2].replace(/,/g, "")) || 0;
  // Conservamos sufijo K/M tal cual venía en la entrada (preserve case)
  const suffix = (m[3] || "") + (m[4] || "") + (m[5] || "");
  return { num: rawNum, autoPrefix: m[1] || "", autoSuffix: suffix };
}
