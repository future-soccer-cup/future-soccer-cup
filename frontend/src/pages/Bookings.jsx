import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Hotel, Bus, Compass, X } from "lucide-react";
import { toast, Toaster } from "sonner";

const TABS = [
  { key: "hotel", label: "Hoteles", icon: Hotel, endpoint: "hotels" },
  { key: "transport", label: "Transporte", icon: Bus, endpoint: "transports" },
  { key: "tour", label: "Tours", icon: Compass, endpoint: "tours" },
];

export default function Bookings() {
  const [tab, setTab] = useState("hotel");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = TABS.find((x) => x.key === tab);
    api.get(`/${t.endpoint}`).then((r) => setItems(r.data));
  }, [tab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="bookings-page">
      <Toaster position="top-right" />
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Para las familias</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Reservas</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">Selecciona hoteles cerca de las sedes, transporte para los partidos y tours por la ciudad. Tu reserva se confirmará por nuestro equipo.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`bookings-tab-${t.key}`}
            className={`px-5 py-3 text-sm font-bold uppercase tracking-wide flex items-center gap-2 -mb-px border-b-2 ${
              tab === t.key ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Sin opciones disponibles aún.</p>}
        {items.map((it) => (
          <div key={it.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col" data-testid={`booking-item-${it.id}`}>
            <div className="aspect-video bg-slate-100">
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center font-display text-3xl font-black uppercase tracking-tight">{it.name[0]}</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="font-display text-2xl font-black uppercase tracking-tight">{it.name}</div>
              <p className="mt-2 text-sm text-slate-600 flex-1">{it.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-black text-blue-700 tabular-nums">${it.price_per_night ?? it.price}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{tab === "hotel" ? "por noche" : tab === "transport" ? "por viaje" : "por persona"}</div>
                </div>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error("Inicia sesión para reservar");
                      navigate("/login");
                      return;
                    }
                    setSelected({ ...it, _type: tab });
                  }}
                  className="fsc-btn-red px-4 py-2 rounded-md text-xs"
                  data-testid={`reserve-${it.id}-btn`}
                >
                  Reservar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && <BookingModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BookingModal({ item, onClose }) {
  const [form, setForm] = useState({ start_date: "", end_date: "", guests: 1, notes: "", contact_phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/bookings", {
        type: item._type,
        item_id: item.id,
        start_date: form.start_date,
        end_date: form.end_date || null,
        guests: Number(form.guests) || 1,
        notes: form.notes,
        contact_phone: form.contact_phone,
      });
      toast.success("Reserva enviada. Te contactaremos pronto.");
      onClose();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al reservar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-50" data-testid="booking-modal">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-900" aria-label="Cerrar"><X /></button>
        <div className="text-xs uppercase tracking-widest text-blue-700 font-bold">Solicitud de Reserva</div>
        <h3 className="font-display text-3xl font-black uppercase tracking-tight mt-1">{item.name}</h3>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha inicio</span>
              <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="booking-start-date" />
            </label>
            {item._type !== "tour" && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha fin</span>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="booking-end-date" />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Personas</span>
              <input required type="number" min="1" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="booking-guests" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono</span>
              <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="booking-phone" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" rows={3} data-testid="booking-notes" />
          </label>
          <button type="submit" disabled={submitting} className="fsc-btn-primary w-full px-4 py-3 rounded-md disabled:opacity-50" data-testid="booking-submit-btn">
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
}
