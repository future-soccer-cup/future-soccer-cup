import { useEffect, useState } from "react";
import api from "../lib/api";
import { Hotel, Bus, Compass } from "lucide-react";

const TYPE_META = {
  hotel: { icon: Hotel, label: "Hotel", color: "text-blue-700" },
  transport: { icon: Bus, label: "Transporte", color: "text-red-600" },
  tour: { icon: Compass, label: "Tour", color: "text-emerald-600" },
};

const STATUS_META = {
  pendiente: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
  confirmada: { color: "bg-green-100 text-green-800", label: "Confirmada" },
  cancelada: { color: "bg-red-100 text-red-800", label: "Cancelada" },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bookings/mine").then((r) => setBookings(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="my-bookings-page">
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Mi cuenta</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Mis reservas</h1>
      </div>

      {loading && <p className="text-slate-500">Cargando...</p>}
      {!loading && bookings.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">Aún no tienes reservas</p>
          <a href="/reservas" className="inline-block mt-4 fsc-btn-primary px-6 py-3 rounded-md text-sm">Hacer una reserva</a>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const meta = TYPE_META[b.type];
          const Icon = meta.icon;
          const sm = STATUS_META[b.status] || STATUS_META.pendiente;
          return (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-5 grid md:grid-cols-12 gap-4 items-center" data-testid={`booking-row-${b.id}`}>
              <div className="md:col-span-1">
                <Icon className={meta.color} size={28} />
              </div>
              <div className="md:col-span-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">{meta.label}</div>
                <div className="font-display text-xl font-black uppercase tracking-tight">{b.item_name}</div>
              </div>
              <div className="md:col-span-3 text-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Fechas</div>
                <div className="font-semibold">{b.start_date}{b.end_date ? ` → ${b.end_date}` : ""}</div>
              </div>
              <div className="md:col-span-2 text-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Personas</div>
                <div className="font-semibold">{b.guests}</div>
              </div>
              <div className="md:col-span-2 text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${sm.color}`}>{sm.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
