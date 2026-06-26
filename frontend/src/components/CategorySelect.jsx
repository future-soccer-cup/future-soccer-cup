import { useEffect, useState } from "react";
import api from "../lib/api";

let cached = null;
/**
 * Devuelve siempre un array de strings (nombres de categoría) para compatibilidad
 * con consumidores antiguos. Si el backend devuelve objetos `{name, color, ...}`
 * se extrae el campo `name`; si devuelve strings, se pasa tal cual.
 */
export function useCategories() {
  const [cats, setCats] = useState(cached || []);
  useEffect(() => {
    if (cached) return;
    api.get("/categories").then((r) => {
      const arr = Array.isArray(r.data) ? r.data : [];
      const names = arr.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
      cached = names;
      setCats(names);
    });
  }, []);
  return cats;
}

export default function CategorySelect({ value, onChange, required, testId = "category-select", allowed = null }) {
  const cats = useCategories();
  const list = allowed && allowed.length ? cats.filter((c) => allowed.includes(c)) : cats;
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría (por edad)</span>
      <select
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
        data-testid={testId}
      >
        <option value="">Seleccionar...</option>
        {list.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
