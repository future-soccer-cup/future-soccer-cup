import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";
import ImageUpload from "../../components/ImageUpload";

const TABS = [
  { key: "hotels", label: "Hoteles", priceField: "price_per_night", priceLabel: "Precio por noche" },
  { key: "transports", label: "Transportes", priceField: "price", priceLabel: "Precio" },
  { key: "tours", label: "Tours", priceField: "price", priceLabel: "Precio" },
];

export default function AdminInventory() {
  const [tab, setTab] = useState("hotels");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const t = TABS.find((x) => x.key === tab);

  const load = () => api.get(`/${tab}`).then((r) => setItems(r.data));
  useEffect(() => { load(); }, [tab]);

  const newItem = () => {
    if (tab === "hotels") setEditing({ name: "", description: "", address: "", price_per_night: 0, image_url: "", capacity: 4 });
    else if (tab === "transports") setEditing({ name: "", description: "", type: "bus", price: 0, image_url: "", capacity: 10 });
    else setEditing({ name: "", description: "", duration: "", price: 0, image_url: "" });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editing };
      if (payload.price_per_night) payload.price_per_night = Number(payload.price_per_night);
      if (payload.price) payload.price = Number(payload.price);
      if (payload.capacity) payload.capacity = Number(payload.capacity);
      if (editing.id) await api.put(`/${tab}/${editing.id}`, payload);
      else await api.post(`/${tab}`, payload);
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar?")) return;
    await api.delete(`/${tab}/${id}`);
    load();
  };

  return (
    <div data-testid="admin-inventory">
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter mb-2">Inventario</h1>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {TABS.map((tt) => (
          <button key={tt.key} onClick={() => setTab(tt.key)} className={`px-4 py-3 text-sm font-bold uppercase tracking-wide -mb-px border-b-2 ${tab === tt.key ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600"}`} data-testid={`inventory-tab-${tt.key}`}>
            {tt.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={newItem} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2 my-1" data-testid="add-inventory-btn"><Plus size={16}/> Nuevo</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Sin elementos</p>}
        {items.map((it) => (
          <div key={it.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="aspect-video bg-slate-100">{it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}</div>
            <div className="p-4">
              <div className="font-display text-lg font-black uppercase tracking-tight">{it.name}</div>
              <div className="text-xs text-slate-500 mt-1">{it.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-display text-2xl font-black text-blue-700">${it[t.priceField]}</div>
                <div className="space-x-2">
                  <button onClick={() => setEditing({ ...it })} className="text-blue-700"><Pencil size={16}/></button>
                  <button onClick={() => remove(it.id)} className="text-red-600"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? `Editar ${t.label}` : `Nuevo ${t.label}`}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <textarea required value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" rows={3} />
            </label>
            {tab === "hotels" && <Field label="Dirección" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} />}
            {tab === "transports" && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</span>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                  <option value="bus">Bus</option><option value="van">Van</option><option value="taxi">Taxi</option>
                </select>
              </label>
            )}
            {tab === "tours" && <Field label="Duración" value={editing.duration} onChange={(v) => setEditing({ ...editing, duration: v })} />}
            <Field label={t.priceLabel} type="number" required value={editing[t.priceField]} onChange={(v) => setEditing({ ...editing, [t.priceField]: v })} />
            {(tab === "hotels" || tab === "transports") && <Field label="Capacidad" type="number" value={editing.capacity} onChange={(v) => setEditing({ ...editing, capacity: v })} />}
            <ImageUpload value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} label="Imagen" testId="inventory-image-upload" />
            <button className="fsc-btn-primary w-full py-2 rounded-md">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
