import { useMemo } from "react";

/**
 * Input numérico formateado en pesos colombianos (es-CO).
 * - Muestra al usuario los valores con separadores de miles por puntos (1.500.000).
 * - Sin decimales.
 * - Sin ceros a la izquierda (escribir "1500000" muestra "1.500.000", no "01.500.000").
 * - Devuelve un Number al padre vía onChange.
 *
 * Props:
 *  value: number (interno)
 *  onChange: (number) => void
 *  placeholder, className, disabled, "data-testid", min (default 0)
 */
export default function CurrencyInput({ value, onChange, placeholder = "0", className = "", disabled = false, min = 0, ...rest }) {
  const display = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return "";
    return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  }, [value]);

  const handleChange = (e) => {
    // Strip everything except digits.
    const digits = (e.target.value || "").replace(/[^0-9]/g, "");
    if (!digits) {
      onChange(0);
      return;
    }
    let n = parseInt(digits, 10);
    if (Number.isNaN(n)) n = 0;
    if (typeof min === "number" && n < min) n = min;
    onChange(n);
  };

  return (
    <div className={`relative ${disabled ? "opacity-60" : ""}`}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`pl-6 pr-2 py-1 border border-slate-200 rounded text-right tabular-nums ${className}`}
        {...rest}
      />
    </div>
  );
}
