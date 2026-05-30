import { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Save, Trash2, Hotel, Utensils, Bus, Map, RefreshCw } from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";

const TYPES = [
  { id: "lodging", label: "Paquetes hospedaje", icon: Hotel },
  { id: "meal_addon", label: "Alimentación adicional", icon: Utensils },
  { id: "transport", label: "Transporte", icon: Bus },
  { id: "tour", label: "Tours", icon: Map },
];

const CLASSIFICATIONS = ["ESMERALD", "SAPPHIRE", "DIAMOND", "GOLD", "SILVER", "BRONZE"];
const ACCOMMODATION_TYPES = ["Múltiple", "Triple", "Doble"];
const MEAL_TYPES = ["DESAYUNO", "ALMUERZO", "CENA"];

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
    const m = { lodging: [], meal: [], meal_addon: [], transport: [], tour: [] };
    rows.forEach((r) => m[r.type]?.push(r));
    return m;
  }, [rows]);

  const patchLocal = (id, type, patch) => {
    setRows((rs) => rs.map((r) => (r.id === id && r.type === type ? { ...r, ...patch } : r)));
  };

  const persist = async (row) => {
    setSaving(`${row.type}:${row.id}`);
    try {
      const body = buildBody(row);
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
      await api.post(`/admin/catalog/${creating.type}`, creating.body);
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
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Paquetes / Catálogo</h1>
          <p className="text-sm text-slate-500 mt-1">Paquetes, alimentación, transporte y tours que aparecen en <span className="font-semibold">/cotizar</span>. Los cambios se reflejan en vivo.</p>
        </div>
        <button onClick={load} className="text-xs font-bold uppercase tracking-wide px-3 py-2 border border-slate-200 rounded-md flex items-center gap-2 hover:bg-slate-50" data-testid="inv-refresh"><RefreshCw size={12}/> Recargar</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === t.id ? "bg-fsc-azul text-white border-fsc-azul" : "bg-white border-slate-200 text-slate-700"}`} data-testid={`inv-tab-${t.id}`}>
            <t.icon size={14}/> {t.label}
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 tabular-nums">{byType[t.id]?.length || 0}</span>
          </button>
        ))}
      </div>

      {tab === "lodging" && <LodgingTab rows={byType.lodging} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "lodging", body: { name: "", description: "", base_5_nights: 0, additional_night: 0, available: true, no_lodging: false, classification: "", accommodation_type: "" } })} />}
      {tab === "meal_addon" && <MealAddonTab rows={byType.meal_addon} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "meal_addon", body: { name: "", meal_type: "", classification: "", cost: 0 } })} />}
      {tab === "transport" && <SimpleTab type="transport" label="Transporte" rows={byType.transport} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "transport", body: { name: "", price: 0 } })} />}
      {tab === "tour" && <TourTab rows={byType.tour} onChange={patchLocal} onSave={persist} onDelete={remove} saving={saving} onAdd={() => setCreating({ type: "tour", body: { name: "", description: "", price: 0 } })} />}

      {creating && (
        <CreateModal creating={creating} setCreating={setCreating} onSubmit={createNew} />
      )}
    </div>
  );
}

function buildBody(row) {
  if (row.type === "lodging") {
    return {
      name: row.name,
      description: row.description || "",
      base_5_nights: Number(row.base_5_nights || 0),
      additional_night: Number(row.additional_night || 0),
      available: row.available !== false,
      no_lodging: !!row.no_lodging,
      classification: row.classification || "",
      accommodation_type: row.accommodation_type || "",
    };
  }
  if (row.type === "meal_addon") {
    return {
      name: row.name,
      meal_type: row.meal_type || "",
      classification: row.classification || "",
      cost: Number(row.cost || 0),
    };
  }
  if (row.type === "tour") {
    return { name: row.name, description: row.description || "", price: Number(row.price || 0) };
  }
  return { name: row.name, price: Number(row.price || 0) };
}

function LodgingTab({ rows, onChange, onSave, onDelete, saving, onAdd }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-slate-500">Precio <span className="font-bold">por persona</span>: valor del paquete + valor por noche adicional.</p>
        <button onClick={onAdd} className="fsc-btn-red px-3 py-1.5 rounded-md text-xs flex items-center gap-2" data-testid="inv-add-lodging"><Plus size={12}/> Nuevo paquete</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-3" data-testid="inv-lodging-list">
        {rows.map((r) => {
          const isSaving = saving === `lodging:${r.id}`;
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`inv-lodging-${r.id}`}>
              <div className="flex items-center justify-between mb-2">
                <input value={r.name} onChange={(e) => onChange(r.id, "lodging", { name: e.target.value })} className="font-display text-xl font-black uppercase tracking-tight bg-transparent border-b-2 border-transparent focus:border-fsc-azul outline-none" />
                <div className="flex gap-1">
                  <button onClick={() => onSave(r)} disabled={isSaving} className="text-fsc-azul disabled:opacity-50 p-1" data-testid={`inv-save-lodging-${r.id}`}><Save size={14}/></button>
                  <button onClick={() => onDelete(r)} className="text-fsc-rojo p-1" data-testid={`inv-delete-lodging-${r.id}`}><Trash2 size={14}/></button>
                </div>
              </div>
              <textarea value={r.description || ""} onChange={(e) => onChange(r.id, "lodging", { description: e.target.value })} rows={2} className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2" placeholder="Descripción..." />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clasificación</span>
                  <select value={r.classification || ""} onChange={(e) => onChange(r.id, "lodging", { classification: e.target.value })} className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`inv-lodging-class-${r.id}`}>
                    <option value="">— Sin clasificación —</option>
                    {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Acomodación</span>
                  <select value={r.accommodation_type || ""} onChange={(e) => onChange(r.id, "lodging", { accommodation_type: e.target.value })} className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm" data-testid={`inv-lodging-acc-${r.id}`} disabled={r.no_lodging}>
                    <option value="">— Selecciona —</option>
                    {ACCOMMODATION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor Paquete (COP)</span>
                  <CurrencyInput value={r.base_5_nights} onChange={(v) => onChange(r.id, "lodging", { base_5_nights: v })} disabled={r.no_lodging} className="w-full text-sm" data-testid={`inv-lodging-base-${r.id}`} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Noche adicional (COP)</span>
                  <CurrencyInput value={r.additional_night} onChange={(v) => onChange(r.id, "lodging", { additional_night: v })} disabled={r.no_lodging} className="w-full text-sm" data-testid={`inv-lodging-add-${r.id}`} />
                </label>
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={r.available !== false} onChange={(e) => onChange(r.id, "lodging", { available: e.target.checked })} className="accent-fsc-azul" />
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

function MealAddonTab({ rows, onChange, onSave, onDelete, saving, onAdd }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-slate-500">Tabla de alimentación adicional: comida × clasificación × costo (COP por persona).</p>
        <button onClick={onAdd} className="fsc-btn-red px-3 py-1.5 rounded-md text-xs flex items-center gap-2" data-testid="inv-add-meal_addon"><Plus size={12}/> Nueva alimentación</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm" data-testid="inv-meal_addon-list">
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-left px-3 py-2">Comida</th>
              <th className="text-left px-3 py-2">Clasificación</th>
              <th className="text-right px-3 py-2">Costo (COP)</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="5" className="text-center text-slate-400 py-8">Sin registros. Agrega la primera fila.</td></tr>}
            {rows.map((r) => {
              const isSaving = saving === `meal_addon:${r.id}`;
              return (
                <tr key={r.id} className="border-t border-slate-100" data-testid={`inv-meal_addon-${r.id}`}>
                  <td className="px-3 py-2">
                    <input value={r.name || ""} onChange={(e) => onChange(r.id, "meal_addon", { name: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Ej: Desayuno extra" data-testid={`inv-meal_addon-name-${r.id}`} />
                  </td>
                  <td className="px-3 py-2">
                    <select value={r.meal_type || ""} onChange={(e) => onChange(r.id, "meal_addon", { meal_type: e.target.value })} className="px-2 py-1 border border-slate-200 rounded text-xs" data-testid={`inv-meal_addon-type-${r.id}`}>
                      <option value="">—</option>
                      {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select value={r.classification || ""} onChange={(e) => onChange(r.id, "meal_addon", { classification: e.target.value })} className="px-2 py-1 border border-slate-200 rounded text-xs" data-testid={`inv-meal_addon-class-${r.id}`}>
                      <option value="">—</option>
                      {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <CurrencyInput value={r.cost} onChange={(v) => onChange(r.id, "meal_addon", { cost: v })} className="w-32 text-sm" data-testid={`inv-meal_addon-cost-${r.id}`} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onSave(r)} disabled={isSaving} className="text-fsc-azul disabled:opacity-50 p-1" data-testid={`inv-save-meal_addon-${r.id}`}><Save size={14}/></button>
                    <button onClick={() => onDelete(r)} className="text-fsc-rojo p-1 ml-1" data-testid={`inv-delete-meal_addon-${r.id}`}><Trash2 size={14}/></button>
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
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
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
                    <CurrencyInput value={r.price} onChange={(v) => onChange(r.id, type, { price: v })} className="w-32 text-sm" data-testid={`inv-price-${r.id}`} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onSave(r)} disabled={isSaving} className="text-fsc-azul disabled:opacity-50 p-1" data-testid={`inv-save-${type}-${r.id}`}><Save size={14}/></button>
                    <button onClick={() => onDelete(r)} className="text-fsc-rojo p-1 ml-1" data-testid={`inv-delete-${type}-${r.id}`}><Trash2 size={14}/></button>
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

function TourTab({ rows, onChange, onSave, onDelete, saving, onAdd }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-slate-500">Tours opcionales con nombre, descripción y precio por persona.</p>
        <button onClick={onAdd} className="fsc-btn-red px-3 py-1.5 rounded-md text-xs flex items-center gap-2" data-testid="inv-add-tour"><Plus size={12}/> Nuevo tour</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-3" data-testid="inv-tour-list">
        {rows.length === 0 && <div className="col-span-full text-center text-slate-400 py-8 bg-white border border-slate-200 rounded-xl">Sin registros. Agrega el primero.</div>}
        {rows.map((r) => {
          const isSaving = saving === `tour:${r.id}`;
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`inv-tour-${r.id}`}>
              <div className="flex items-center justify-between mb-2">
                <input value={r.name} onChange={(e) => onChange(r.id, "tour", { name: e.target.value })} className="font-display text-xl font-black uppercase tracking-tight bg-transparent border-b-2 border-transparent focus:border-fsc-azul outline-none flex-1" />
                <div className="flex gap-1 ml-2">
                  <button onClick={() => onSave(r)} disabled={isSaving} className="text-fsc-azul disabled:opacity-50 p-1" data-testid={`inv-save-tour-${r.id}`}><Save size={14}/></button>
                  <button onClick={() => onDelete(r)} className="text-fsc-rojo p-1" data-testid={`inv-delete-tour-${r.id}`}><Trash2 size={14}/></button>
                </div>
              </div>
              <label className="block mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Descripción</span>
                <textarea value={r.description || ""} onChange={(e) => onChange(r.id, "tour", { description: e.target.value })} rows={3} className="mt-1 w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2" placeholder="¿Qué incluye este tour?" data-testid={`inv-tour-desc-${r.id}`} />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Precio (COP por persona)</span>
                <CurrencyInput value={r.price} onChange={(v) => onChange(r.id, "tour", { price: v })} className="w-full text-sm" data-testid={`inv-price-${r.id}`} />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateModal({ creating, setCreating, onSubmit }) {
  const isLodging = creating.type === "lodging";
  const isMealAddon = creating.type === "meal_addon";
  const isTour = creating.type === "tour";
  const setBody = (patch) => setCreating({ ...creating, body: { ...creating.body, ...patch } });
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setCreating(null)} data-testid="inv-create-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nuevo {creating.type.replace("_", " ")}</h2>
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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clasificación</span>
                <select value={creating.body.classification || ""} onChange={(e) => setBody({ classification: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-classification">
                  <option value="">— Sin clasificación —</option>
                  {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Acomodación</span>
                <select value={creating.body.accommodation_type || ""} onChange={(e) => setBody({ accommodation_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-accommodation">
                  <option value="">— Selecciona —</option>
                  {ACCOMMODATION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor Paquete (COP)</span>
                <CurrencyInput value={creating.body.base_5_nights || 0} onChange={(v) => setBody({ base_5_nights: v })} className="w-full" data-testid="inv-new-base" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noche adicional (COP)</span>
                <CurrencyInput value={creating.body.additional_night || 0} onChange={(v) => setBody({ additional_night: v })} className="w-full" data-testid="inv-new-add" />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!creating.body.no_lodging} onChange={(e) => setBody({ no_lodging: e.target.checked })} />
              Sin hospedaje (domicilio)
            </label>
          </>
        )}

        {isMealAddon && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Comida</span>
              <select value={creating.body.meal_type || ""} onChange={(e) => setBody({ meal_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-meal-type">
                <option value="">—</option>
                {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clasificación</span>
              <select value={creating.body.classification || ""} onChange={(e) => setBody({ classification: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-meal-class">
                <option value="">—</option>
                {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Costo (COP por persona)</span>
              <CurrencyInput value={creating.body.cost || 0} onChange={(v) => setBody({ cost: v })} className="w-full" data-testid="inv-new-cost" />
            </label>
          </div>
        )}

        {isTour && (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <textarea value={creating.body.description || ""} onChange={(e) => setBody({ description: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-new-tour-desc" placeholder="¿Qué incluye este tour?" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Precio (COP por persona)</span>
              <CurrencyInput value={creating.body.price || 0} onChange={(v) => setBody({ price: v })} className="w-full" data-testid="inv-new-price" />
            </label>
          </>
        )}

        {!isLodging && !isMealAddon && !isTour && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Precio (COP por persona)</span>
            <CurrencyInput value={creating.body.price || 0} onChange={(v) => setBody({ price: v })} className="w-full" data-testid="inv-new-price" />
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
