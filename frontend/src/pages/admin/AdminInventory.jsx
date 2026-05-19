import { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Save, Trash2, Hotel, Utensils, Bus, Map, RefreshCw } from "lucide-react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

const TYPES = [
  { id: "lodging", label: "Paquetes hospedaje", icon: Hotel },
  { id: "meal", label: "Comidas (matriz por paquete)", icon: Utensils },
  { id: "transport", label: "Transporte", icon: Bus },
  { id: "tour", label: "Tours", icon: Map },
];

export default function AdminInventory() {
  const [tab, setTab] = useState("lodging");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(null);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/catalog");
      setRows(r.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando catálogo");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const byType = useMemo(() => {
    const m = { lodging: [], meal: [], transport: [], tour: [] };
    rows.forEach((r) => m[r.type]?.push(r));
    return m;
  }, [rows]);

  // Helpers to update a row locally (controlled inputs).
  const patchLocal = (id, type, patch) => {
    setRows((rs) => rs.map((r) => (r.id === id && r.type === type ? { ...r, ...patch } : r)));
  };

  const persist = async (row) => {
    setSaving(`${row.type}:${row.id}`);
    try {
      const body = {
        name: row.name,
        description: row.description || "",
        ...(row.type === "lodging" && {
          base_5_nights: Number(row.base_5_nights || 0),
          additional_night: Number(row.additional_night || 0),
          available: row.available !== false,
          no_lodging: !!row.no_lodging,
        }),
        ...(row.type === "meal" && { per_day_by_tier: row.per_day_by_tier || {} }),
        ...(row.type === "transport" || row.type === "tour" ? { price: Number(row.price || 0) } : {}),
      };
      await api.put(`/admin/catalog/${row.type}/${row.id}`, body);
      toast.success("Guardado");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error guardando");
    } finally {
      setSaving(null);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`¿Eliminar "${row.name}"? Las cotizaciones nuevas ya no podrán seleccionarlo.`)) return;
    try {
      await api.delete(`/admin/catalog/${row.type}/${row.id}`);
      toast.success("Eliminado");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo eliminar");
    }
  };

  const createNew = async (e) => {
    e.preventDefault();
    try {
      const body = creating.body;
      await api.post(`/admin/catalog/${creating.type}`, body);
      toast.success("Creado");
      setCreating(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error creando ítem");
    }
  };

  return (
    <div data-testid="admin-inventory">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Inventario / Catálogo</h1>
          <p className="text-sm text-slate-500 mt-1">Paquetes, comidas, transporte y tours que aparecen en <span className="font-semibold">/cotizar</span>. Los cambios se reflejan en vivo.</p>
        </div>
        <button onClick={load} className="text-xs font-bold uppercase tracking-wide px-3 py-2 border border-slate-200 rounded-md flex items-center gap-2 hover:bg-slate-50" data-testid="inv-refresh"><RefreshCw size={12}/> Recargar</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === t.id ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200 text-slate-700"}`} data-testid={`inv-tab-${t.id}`}>
            <t.icon size={14}/> {t.label}
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 tabular-nums">{byType[t.id]?.length || 0}</span>
          </button>
        ))}
      </div>

      {tab === "lodging" && <LodgingTab rows={byType.lodging} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "lodging", body: { name: "", description: "", base_5_nights: 0, additional_night: 0, available: true, no_lodging: false } })} />}
      {tab === "meal" && <MealTab rows={byType.meal} tiers={byType.lodging} onChange={patchLocal} onSave={persist} saving={saving} />}
      {tab === "transport" && <SimpleTab type="transport" label="Transporte" rows={byType.transport} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "transport", body: { name: "", price: 0 } })} />}
      {tab === "tour" && <SimpleTab type="tour" label="Tour" rows={byType.tour} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "tour", body: { name: "", price: 0 } })} />}

      {creating && (
        <CreateModal creating={creating} setCreating={setCreating} onSubmit={createNew} tiers={byType.lodging} />
      )}
    </div>
  );
}

function LodgingTab({ rows, onChange, onSave, onDelete, saving, onAdd }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-slate-500">Precio <span className="font-bold">por persona</span>: base 5 noches + valor por noche adicional.</p>
        <button onClick={onAdd} className="fsc-btn-red px-3 py-1.5 rounded-md text-xs flex items-center gap-2" data-testid="inv-add-lodging"><Plus size={12}/> Nuevo paquete</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-3" data-testid="inv-lodging-list">
        {rows.map((r) => {
          const isSaving = saving === `lodging:${r.id}`;
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`inv-lodging-${r.id}`}>
              <div className="flex items-center justify-between mb-2">
                <input value={r.name} onChange={(e) => onChange(r.id, "lodging", { name: e.target.value })} className="font-display text-xl font-black uppercase tracking-tight bg-transparent border-b-2 border-transparent focus:border-blue-700 outline-none" />
                <div className="flex gap-1">
                  <button onClick={() => onSave(r)} disabled={isSaving} className="text-blue-700 disabled:opacity-50 p-1" data-testid={`inv-save-lodging-${r.id}`}><Save size={14}/></button>
                  <button onClick={() => onDelete(r)} className="text-red-600 p-1" data-testid={`inv-delete-lodging-${r.id}`}><Trash2 size={14}/></button>
                </div>
              </div>
              <textarea value={r.description || ""} onChange={(e) => onChange(r.id, "lodging", { description: e.target.value })} rows={2} className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2" placeholder="Descripción..." />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base 5 noches (COP)</span>
                  <input type="number" min="0" value={r.base_5_nights || 0} onChange={(e) => onChange(r.id, "lodging", { base_5_nights: Number(e.target.value) })} className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm tabular-nums" data-testid={`inv-lodging-base-${r.id}`} disabled={r.no_lodging} />
                  <span className="text-[10px] text-slate-400">{fmt(r.base_5_nights || 0)}</span>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Noche adicional (COP)</span>
                  <input type="number" min="0" value={r.additional_night || 0} onChange={(e) => onChange(r.id, "lodging", { additional_night: Number(e.target.value) })} className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm tabular-nums" data-testid={`inv-lodging-add-${r.id}`} disabled={r.no_lodging} />
                  <span className="text-[10px] text-slate-400">{fmt(r.additional_night || 0)}</span>
                </label>
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={r.available !== false} onChange={(e) => onChange(r.id, "lodging", { available: e.target.checked })} className="accent-blue-700" />
                  <span>Disponible</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={!!r.no_lodging} onChange={(e) => onChange(r.id, "lodging", { no_lodging: e.target.checked })} className="accent-amber-500" />
                  <span>Sin hospedaje (Domicilio)</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MealTab({ rows, tiers, onChange, onSave, saving }) {
  // Matrix: rows = meal types, cols = lodging tiers
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <p className="text-xs text-slate-500">Precio <span className="font-bold">por persona × día</span>. Usa <span className="font-bold">0</span> para indicar que la combinación no está disponible (ej.: Silver no incluye almuerzo).</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="inv-meals-matrix">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Comida</th>
              {tiers.map((t) => <th key={t.id} className="text-right px-3 py-2">{t.name}</th>)}
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSaving = saving === `meal:${r.id}`;
              return (
                <tr key={r.id} className="border-t border-slate-100" data-testid={`inv-meal-${r.id}`}>
                  <td className="px-3 py-2 font-display font-black">{r.name}</td>
                  {tiers.map((t) => (
                    <td key={t.id} className="px-2 py-1 text-right">
                      <input
                        type="number" min="0"
                        value={(r.per_day_by_tier || {})[t.id] || 0}
                        onChange={(e) => onChange(r.id, "meal", { per_day_by_tier: { ...(r.per_day_by_tier || {}), [t.id]: Number(e.target.value) } })}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-right text-xs tabular-nums"
                        data-testid={`inv-meal-${r.id}-${t.id}`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => onSave(r)} disabled={isSaving} className="text-blue-700 disabled:opacity-50 p-1" data-testid={`inv-save-meal-${r.id}`}><Save size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleTab({ type, label, rows, onChange, onSave, onDelete, saving, onAdd }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-slate-500">Precio por persona en COP. Las modificaciones se reflejan en vivo en /cotizar.</p>
        <button onClick={onAdd} className="fsc-btn-red px-3 py-1.5 rounded-md text-xs flex items-center gap-2" data-testid={`inv-add-${type}`}><Plus size={12}/> Nuevo {label.toLowerCase()}</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm" data-testid={`inv-${type}-list`}>
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-right px-3 py-2">Precio (COP)</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="3" className="text-center text-slate-400 py-8">Sin registros. Agrega el primero.</td></tr>}
            {rows.map((r) => {
              const isSaving = saving === `${type}:${r.id}`;
              return (
                <tr key={r.id} className="border-t border-slate-100" data-testid={`inv-${type}-${r.id}`}>
                  <td className="px-3 py-2"><input value={r.name} onChange={(e) => onChange(r.id, type, { name: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" /></td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" min="0" value={r.price || 0} onChange={(e) => onChange(r.id, type, { price: Number(e.target.value) })} className="w-32 px-2 py-1 border border-slate-200 rounded text-right text-sm tabular-nums" data-testid={`inv-price-${r.id}`} />
                    <div className="text-[10px] text-slate-400 mt-0.5">{fmt(r.price || 0)}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onSave(r)} disabled={isSaving} className="text-blue-700 disabled:opacity-50 p-1" data-testid={`inv-save-${type}-${r.id}`}><Save size={14}/></button>
                    <button onClick={() => onDelete(r)} className="text-red-600 p-1 ml-1" data-testid={`inv-delete-${type}-${r.id}`}><Trash2 size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateModal({ creating, setCreating, onSubmit, tiers }) {
  const isLodging = creating.type === "lodging";
  const isMeal = creating.type === "meal";
  const setBody = (patch) => setCreating({ ...creating, body: { ...creating.body, ...patch } });
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setCreating(null)} data-testid="inv-create-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nuevo {creating.type}</h2>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</span>
          <input required value={creating.body.name} onChange={(e) => setBody({ name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-name" />
        </label>
        {isLodging && (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <textarea value={creating.body.description || ""} onChange={(e) => setBody({ description: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Base 5 noches</span>
                <input type="number" min="0" value={creating.body.base_5_nights || 0} onChange={(e) => setBody({ base_5_nights: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noche adicional</span>
                <input type="number" min="0" value={creating.body.additional_night || 0} onChange={(e) => setBody({ additional_night: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!creating.body.no_lodging} onChange={(e) => setBody({ no_lodging: e.target.checked })} />
              Sin hospedaje (domicilio)
            </label>
          </>
        )}
        {!isLodging && !isMeal && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Precio (COP por persona)</span>
            <input type="number" min="0" required value={creating.body.price || 0} onChange={(e) => setBody({ price: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="inv-new-price" />
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setCreating(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" className="fsc-btn-primary px-4 py-2 rounded-md text-xs" data-testid="inv-new-submit">Crear</button>
        </div>
      </form>
    </div>
  );
}
