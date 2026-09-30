import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Save, MapPin } from "lucide-react";
import { toast, Toaster } from "sonner";

const EMPTY_DRAFT = { name: "", code: "", city: "", address: "", notes: "" };

export default function AdminVenues() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/venues");
      setItems(r.data || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando canchas");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patchLocal = (id, patch) => setItems((arr) => arr.map((v) => v.id === id ? { ...v, ...patch } : v));

  const save = async (v) => {
    if (!v.name.trim()) { toast.error("El nombre de la cancha es obligatorio"); return; }
    try {
      await api.put(`/venues/${v.id}`, { name: v.name, code: v.code || "", city: v.city || "", address: v.address || "", notes: v.notes || "" });
      toast.success("Cancha actualizada");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error guardando");
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`¿Eliminar la cancha "${v.name}"? Los partidos ya programados en ella conservan el nombre guardado, pero ya no podrá elegirse para partidos nuevos.`)) return;
    try {
      await api.delete(`/venues/${v.id}`);
      toast.success("Cancha eliminada");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error eliminando");
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!creating.name.trim()) { toast.error("El nombre de la cancha es obligatorio"); return; }
    try {
      await api.post("/venues", creating);
      toast.success("Cancha creada");
      setCreating(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error creando");
    }
  };

  return (
    <div data-testid="admin-venues">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-2"><MapPin/> Canchas</h1>
          <p className="text-sm text-slate-500 mt-1">Catálogo de canchas/escenarios para programar partidos, fixtures y brackets.</p>
        </div>
        <button onClick={() => setCreating({ ...EMPTY_DRAFT })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-venue-btn">
          <Plus size={16}/> Nueva cancha
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 w-28">Código</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Ciudad</th>
              <th className="text-left px-4 py-2">Dirección</th>
              <th className="text-left px-4 py-2">Notas</th>
              <th className="text-right px-4 py-2 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="text-center py-10 text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="6" className="text-center py-10 text-slate-400">Sin canchas registradas. Agrega la primera.</td></tr>}
            {items.map((v) => (
              <tr key={v.id} className="border-t border-slate-100" data-testid={`venue-row-${v.id}`}>
                <td className="px-4 py-2">
                  <input value={v.code || ""} onChange={(e) => patchLocal(v.id, { code: e.target.value })} placeholder="C1" className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`venue-code-${v.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input value={v.name} onChange={(e) => patchLocal(v.id, { name: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`venue-name-${v.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input value={v.city || ""} onChange={(e) => patchLocal(v.id, { city: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`venue-city-${v.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input value={v.address || ""} onChange={(e) => patchLocal(v.id, { address: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`venue-address-${v.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input value={v.notes || ""} onChange={(e) => patchLocal(v.id, { notes: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`venue-notes-${v.id}`} />
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => save(v)} className="text-fsc-azul" title="Guardar" data-testid={`venue-save-${v.id}`}><Save size={16}/></button>
                  <button onClick={() => remove(v)} className="text-fsc-rojo" title="Eliminar" data-testid={`venue-delete-${v.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setCreating(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3" data-testid="venue-create-form">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nueva cancha</h2>
            <div className="grid grid-cols-3 gap-3">
              <label className="block col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre *</span>
                <input required value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Ej: Cancha Municipal Norte" data-testid="venue-new-name" autoFocus />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Código</span>
                <input value={creating.code} onChange={(e) => setCreating({ ...creating, code: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="C1" data-testid="venue-new-code" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ciudad</span>
                <input value={creating.city} onChange={(e) => setCreating({ ...creating, city: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="venue-new-city" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dirección</span>
                <input value={creating.address} onChange={(e) => setCreating({ ...creating, address: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="venue-new-address" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas (opcional)</span>
              <input value={creating.notes} onChange={(e) => setCreating({ ...creating, notes: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="venue-new-notes" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreating(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
              <button type="submit" className="fsc-btn-primary px-4 py-2 rounded-md text-xs" data-testid="venue-new-submit">Crear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
