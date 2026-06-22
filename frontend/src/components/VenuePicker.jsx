import { useEffect, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { Plus } from "lucide-react";

/**
 * Selector de cancha con opción "+ Crear nueva".
 * Guarda el NOMBRE de la cancha en la cadena (compatible con el campo match.venue ya existente).
 */
export default function VenuePicker({ value, onChange, testId = "venue-picker", className = "" }) {
  const [venues, setVenues] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", city: "", address: "" });
  const [saving, setSaving] = useState(false);

  const reload = () => api.get("/venues").then((r) => setVenues(r.data || []));
  useEffect(() => { reload(); }, []);

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__create__") {
      setCreating(true);
    } else {
      onChange(v);
    }
  };

  const saveNew = async () => {
    if (!draft.name.trim()) { toast.error("El nombre de la cancha es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await api.post("/venues", draft);
      await reload();
      onChange(res.data.name);
      toast.success("Cancha creada");
      setCreating(false);
      setDraft({ name: "", city: "", address: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "No se pudo crear la cancha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative flex-1 ${className}`} data-testid={testId}>
      <select value={value || ""} onChange={handleSelect} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" data-testid={`${testId}-select`}>
        <option value="">— Sin cancha —</option>
        {venues.map((v) => (
          <option key={v.id} value={v.name}>{v.name}{v.city ? ` (${v.city})` : ""}</option>
        ))}
        {/* Conserva el valor manual si no está en el listado (legacy) */}
        {value && !venues.find((v) => v.name === value) && (
          <option value={value}>{value} (manual)</option>
        )}
        <option value="__create__">＋ Crear nueva cancha…</option>
      </select>

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-testid={`${testId}-modal`} onClick={() => setCreating(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-black uppercase tracking-tight mb-4">Crear cancha</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre *</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid={`${testId}-new-name`} autoFocus />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ciudad</span>
                  <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid={`${testId}-new-city`} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dirección</span>
                  <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid={`${testId}-new-address`} />
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setCreating(false)} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-md text-sm font-bold uppercase tracking-wide hover:bg-slate-50" data-testid={`${testId}-new-cancel`}>Cancelar</button>
                <button onClick={saveNew} disabled={saving} className="flex-1 fsc-btn-red py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid={`${testId}-new-save`}>
                  <Plus size={14}/> {saving ? "..." : "Crear y usar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
