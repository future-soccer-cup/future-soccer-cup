import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Animación de entrada one-shot al hacer scroll hasta el elemento.
 * Se dispara UNA sola vez por sesión (no se repite al volver a entrar al viewport).
 *
 * Variantes disponibles:
 *  - "slide-left": entra desde la izquierda con fade
 *  - "slide-up": entra desde abajo con fade
 *  - "fade": solo fade-in
 *  - "scale-up": escala 0.5 → 1 con fade
 *  - "zoom-in": escala 0.5 → 1, similar a scale-up
 *
 * Props:
 *  - variant: una de las anteriores (default: "slide-up")
 *  - delay: segundos (default 0)
 *  - duration: segundos (default 0.6)
 *  - distance: px de desplazamiento para slide-* (default 32)
 *  - amount: 0..1 — porción del elemento visible para disparar (default 0.2)
 *  - as: tag HTML (default "div")
 *  - className, style, children, ...rest
 */
export default function AnimateIn({
  variant = "slide-up",
  delay = 0,
  duration = 0.6,
  distance = 32,
  amount = 0.2,
  as = "div",
  className,
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount });

  const initial = computeInitial(variant, distance);
  const animate = inView ? computeAnimate(variant) : initial;

  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{ willChange: "transform, opacity", ...style }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

function computeInitial(variant, distance) {
  switch (variant) {
    case "slide-left": return { opacity: 0, x: -distance };
    case "slide-right": return { opacity: 0, x: distance };
    case "slide-up": return { opacity: 0, y: distance };
    case "slide-down": return { opacity: 0, y: -distance };
    case "scale-up":
    case "zoom-in": return { opacity: 0, scale: 0.5 };
    case "fade":
    default: return { opacity: 0 };
  }
}

function computeAnimate(variant) {
  if (variant === "scale-up" || variant === "zoom-in") return { opacity: 1, scale: 1 };
  if (variant.startsWith("slide-")) return { opacity: 1, x: 0, y: 0 };
  return { opacity: 1 };
}
