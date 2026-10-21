import { useMemo, useState } from "react";

/**
 * Input numérico formateado en pesos colombianos (es-CO), con separadores de miles
 * mientras se escribe (1.500.000) y sin ceros a la izquierda.
 *
 * Props:
 *  value: number (interno)
 *  onChange: (number) => void
 *  placeholder, className, disabled, "data-testid", min (default 0)
 *  decimals: cantidad de decimales permitidos (default 0 = solo pesos enteros, como
 *            siempre se usó este componente). Pasar decimals={2} para montos en USD
 *            u otros casos que necesiten centavos.
 */
export default function CurrencyInput({ value, onChange, placeholder = "0", className = "", disabled = false, min = 0, decimals = 0, ...rest }) {
  // Mientras el usuario escribe, mostramos su texto crudo (para no perder un "." final
  // o ceros decimales en progreso al reformatear en cada tecla); al perder el foco,
  // volvemos a mostrar el valor formateado canónico.
  const [rawText, setRawText] = useState(null);

  const formatted = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return "";
    return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }, [value, decimals]);

  const display = rawText !== null ? rawText : formatted;

  const handleChange = (e) => {
    let cleaned = (e.target.value || "").replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    if (decimals <= 0) {
      cleaned = cleaned.replace(/\./g, "");
    } else {
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
        const [intPart, fracPart] = cleaned.split(".");
        cleaned = `${intPart}.${fracPart.slice(0, decimals)}`;
      }
    }
    setRawText(cleaned);
    if (cleaned === "" || cleaned === ".") {
      onChange(0);
      return;
    }
    let n = parseFloat(cleaned);
    if (Number.isNaN(n)) n = 0;
    if (typeof min === "number" && n < min) n = min;
    onChange(n);
  };

  const handleBlur = () => setRawText(null);

  return (
    <div className={`relative ${disabled ? "opacity-60" : ""}`}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`pl-6 pr-2 py-1 border border-slate-200 rounded text-right tabular-nums ${className}`}
        {...rest}
      />
    </div>
  );
}
