import { useEffect, useState } from "react";
import api, { formatApiError, imgSrc } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2, Hotel, Car, Map } from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import { Modal, Field } from "./AdminTeams";

const TIERS = ["", "diamond", "gold", "silver", "bronze"];
const EMPTY_HOTEL = { name: "", description: "", address: "", price_per_night: 100000, image_url: "", amenities: [], capacity: 4, tier: "", stars: 3 };
const EMPTY_TRANSPORT = { name: "", description: "", type: "bus", price: 50000, image_url: "", capacity: 30 };
const EMPTY_TOUR = { name: "", description: "", duration: "2h", price: 60000, image_url: "" };

const TABS = [
  { id: "hotels", label: "Hoteles", icon: Hotel, empty: EMPTY_HOTEL, endpoint: "/hotels" },
  { id: "transports", label: "Transportes", icon: Car, empty: EMPTY_TRANSPORT, endpoint: "/transports" },
  { id: "tours", label: "Tours", icon: Map, empty: EMPTY_TOUR, endpoint: "/tours" },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function AdminInventory() {
  const [tab, setTab] = useState("hotels");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const current = TABS.find((t) => t.id === tab);

  const load = () => api.get(current.endpoint).then((r) => setItems(r.data));
  useEffect(() => { load(); setEditing(null); /* eslint-disable-next-line */ }, [tab]);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editing };
      if (tab === "hotels") {
        payload.price_per_night = Number(payload.price_per_night || 0);
        payload.capacity = Number(payload.capacity || 0);
        payload.stars = Number(payload.stars || 0);
      } else if (tab === "transports") {
        payload.price = Number(payload.price || 0);
        payload.capacity = Number(payload.capacity || 0);
      } else {
        payload.price = Number(payload.price || 0);
      }
      if (payload.id) await api.put(`${current.endpoint}/${payload.id}`, payload);
      else await api.post(current.endpoint, payload);
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar este ítem?")) return;
    await api.delete(`${current.endpoint}/${id}`);
    load();
  };

  return (
    <div data-testid="admin-inventory">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">Hoteles, transportes y tours disponibles para las cotizaciones.</p>
        </div>
        <button onClick={() => setEditing({ ...current.empty })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="inv-add-btn">
          <Plus size={16}/> Nuevo
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === t.id ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200 text-slate-700"}`} data-testid={`inv-tab-${t.id}`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Sin registros</div>}
        {items.map((it) => (
          <div key={it.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid={`inv-item-${it.id}`}>
            {it.image_url ? (
              <div className="aspect-video bg-slate-100">
                <img src={imgSrc(it.image_url)} alt={it.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center font-display text-4xl font-black uppercase">{it.name?.[0] || "?"}</div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black uppercase tracking-tight">{it.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ ...it })} className="text-blue-700"><Pencil size={14}/></button>
                  <button onClick={() => remove(it.id)} className="text-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{it.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-display text-xl font-black text-blue-700 tabular-nums">
                  {fmt(it.price_per_night || it.price)}<span className="text-[9px] text-slate-400 font-bold ml-1">{tab === "hotels" ? "COP/noche" : "COP"}</span>
                </div>
                {it.tier && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100">{it.tier}</span>}
                {it.type && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100">{it.type}</span>}
                {it.duration && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100">{it.duration}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar" : `Nuevo ${current.label.slice(0, -1)}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <textarea required value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
            <ImageUpload value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} label="Imagen" testId="inv-image" />

            {tab === "hotels" && (
              <>
                <Field label="Dirección" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio / noche (COP)" type="number" required value={editing.price_per_night} onChange={(v) => setEditing({ ...editing, price_per_night: v })} />
                  <Field label="Capacidad" type="number" value={editing.capacity} onChange={(v) => setEditing({ ...editing, capacity: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nivel (tier)</span>
                    <select value={editing.tier || ""} onChange={(e) => setEditing({ ...editing, tier: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="inv-tier-select">
                      <option value="">—</option>
                      <option value="diamond">Diamante</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronce</option>
                    </select>
                  </label>
                  <Field label="Estrellas" type="number" value={editing.stars} onChange={(v) => setEditing({ ...editing, stars: v })} />
                </div>
              </>
            )}

            {tab === "transports" && (
              <>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</span>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                    <option value="bus">Bus</option>
                    <option value="van">Van</option>
                    <option value="taxi">Taxi</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio (COP)" type="number" required value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
                  <Field label="Capacidad" type="number" value={editing.capacity} onChange={(v) => setEditing({ ...editing, capacity: v })} />
                </div>
              </>
            )}

            {tab === "tours" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duración" value={editing.duration} onChange={(v) => setEditing({ ...editing, duration: v })} />
                <Field label="Precio (COP)" type="number" required value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
              </div>
            )}

            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="inv-save-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
