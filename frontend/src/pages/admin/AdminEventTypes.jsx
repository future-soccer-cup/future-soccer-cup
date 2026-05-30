import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Save, Calendar } from "lucide-react";
import { toast, Toaster } from "sonner";
import CurrencyInput from "../../components/CurrencyInput";

export default function AdminEventTypes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/event-types");
      setItems(r.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando tipos de evento");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patchLocal = (id, patch) => setItems((arr) => arr.map((c) => c.id === id ? { ...c, ...patch } : c));

  const save = async (c) => {
    try {
      await api.put(`/admin/event-types/${c.id}`, {
        name: c.name, description: c.description, month: c.month,
        registration_fee_per_team: Number(c.registration_fee_per_team || 0),
        sort_order: c.sort_order,
      });
      toast.success("Guardado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error guardando");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar el tipo de evento "${c.name}"?`)) return;
    try {
      await api.delete(`/admin/event-types/${c.id}`);
      toast.success("Eliminado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error eliminando");
    }
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/event-types", creating);
      toast.success("Creado");
      setCreating(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error creando");
    }
  };

  return (
    <div data-testid="admin-event-types">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-2"><Calendar/> Tipos de Evento</h1>
          <p className="text-sm text-slate-500 mt-1">Configura los tipos de evento (Festival, Premier, etc.) que pueden seleccionarse al crear un Evento.</p>
        </div>
        <button onClick={() => setCreating({ name: "", description: "", month: "", registration_fee_per_team: 0, sort_order: items.length })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-event-type-btn">
          <Plus size={16}/> Nuevo tipo de evento
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2 w-32">Mes</th>
              <th className="text-right px-4 py-2 w-44">Inscripción base (COP)</th>
              <th className="text-right px-4 py-2 w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="text-center py-10 text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-400">Sin tipos. Agrega el primero.</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100" data-testid={`event-type-row-${c.id}`}>
                <td className="px-4 py-2">
                  <input value={c.name} onChange={(e) => patchLocal(c.id, { name: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`evt-name-${c.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input value={c.description || ""} onChange={(e) => patchLocal(c.id, { description: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" placeholder="Breve descripción" />
                </td>
                <td className="px-4 py-2">
                  <input value={c.month || ""} onChange={(e) => patchLocal(c.id, { month: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" placeholder="Ej: Octubre" />
                </td>
                <td className="px-4 py-2 text-right">
                  <CurrencyInput value={c.registration_fee_per_team} onChange={(v) => patchLocal(c.id, { registration_fee_per_team: v })} className="w-36 text-sm" data-testid={`evt-fee-${c.id}`} />
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => save(c)} className="text-fsc-azul" data-testid={`evt-save-${c.id}`}><Save size={16}/></button>
                  <button onClick={() => remove(c)} className="text-fsc-rojo" data-testid={`evt-delete-${c.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setCreating(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3" data-testid="evt-create-form">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nuevo tipo de evento</h2>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</span>
              <input required value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Ej: Festival, Premier Par, Copa Sub-12" data-testid="evt-new-name" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <textarea value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mes</span>
                <input value={creating.month} onChange={(e) => setCreating({ ...creating, month: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Octubre" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inscripción base (COP)</span>
                <CurrencyInput value={creating.registration_fee_per_team} onChange={(v) => setCreating({ ...creating, registration_fee_per_team: v })} className="w-full" data-testid="evt-new-fee" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreating(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
              <button type="submit" className="fsc-btn-primary px-4 py-2 rounded-md text-xs" data-testid="evt-new-submit">Crear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
