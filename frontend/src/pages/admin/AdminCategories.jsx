import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Save, Tag } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/categories");
      setItems(r.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando categorías");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patchLocal = (id, patch) => setItems((arr) => arr.map((c) => c.id === id ? { ...c, ...patch } : c));

  const save = async (c) => {
    try {
      await api.put(`/admin/categories/${c.id}`, { name: c.name, sort_order: c.sort_order, color: c.color || "" });
      toast.success("Guardado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error guardando");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"? Los registros existentes no se borran, pero ya no podrá seleccionarse.`)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      toast.success("Eliminada");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error eliminando");
    }
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/categories", creating);
      toast.success("Creada");
      setCreating(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error creando");
    }
  };

  return (
    <div data-testid="admin-categories">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-2"><Tag/> Categorías</h1>
          <p className="text-sm text-slate-500 mt-1">Catálogo de categorías que el admin puede usar al crear eventos, equipos y jugadores.</p>
        </div>
        <button onClick={() => setCreating({ name: "", sort_order: items.length, color: "#1d4ed8" })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-category-btn">
          <Plus size={16}/> Nueva categoría
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2 w-32">Orden</th>
              <th className="text-left px-4 py-2 w-40">Color carnet</th>
              <th className="text-right px-4 py-2 w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="4" className="text-center py-10 text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-400">Sin categorías. Agrega la primera.</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100" data-testid={`category-row-${c.id}`}>
                <td className="px-4 py-2">
                  <input value={c.name} onChange={(e) => patchLocal(c.id, { name: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`cat-name-${c.id}`} />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={c.sort_order || 0} onChange={(e) => patchLocal(c.id, { sort_order: Number(e.target.value) })} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm tabular-nums" />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={c.color || "#1d4ed8"}
                      onChange={(e) => patchLocal(c.id, { color: e.target.value })}
                      className="h-8 w-12 border border-slate-200 rounded cursor-pointer"
                      title="Color del carnet para esta categoría"
                      data-testid={`cat-color-${c.id}`}
                    />
                    <input
                      type="text"
                      value={c.color || ""}
                      onChange={(e) => patchLocal(c.id, { color: e.target.value })}
                      placeholder="#1d4ed8"
                      className="w-24 px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      data-testid={`cat-color-text-${c.id}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => save(c)} className="text-fsc-azul" data-testid={`cat-save-${c.id}`}><Save size={16}/></button>
                  <button onClick={() => remove(c)} className="text-fsc-rojo" data-testid={`cat-delete-${c.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setCreating(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3" data-testid="cat-create-form">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nueva categoría</h2>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</span>
              <input required value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Ej: Sub-12, Femenino, Libre" data-testid="cat-new-name" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orden (opcional)</span>
              <input type="number" value={creating.sort_order} onChange={(e) => setCreating({ ...creating, sort_order: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Color del carnet</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={creating.color || "#1d4ed8"}
                  onChange={(e) => setCreating({ ...creating, color: e.target.value })}
                  className="h-9 w-14 border border-slate-200 rounded cursor-pointer"
                  data-testid="cat-new-color"
                />
                <input
                  type="text"
                  value={creating.color || ""}
                  onChange={(e) => setCreating({ ...creating, color: e.target.value })}
                  placeholder="#1d4ed8"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm font-mono"
                  data-testid="cat-new-color-text"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Se usará como fondo en el carnet de jugadores y cuerpo técnico de esta categoría.</p>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreating(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
              <button type="submit" className="fsc-btn-primary px-4 py-2 rounded-md text-xs" data-testid="cat-new-submit">Crear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
