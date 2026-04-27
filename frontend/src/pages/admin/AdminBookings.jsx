import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";

const STATUS = ["pendiente", "confirmada", "cancelada"];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);

  const load = () => api.get("/bookings").then((r) => setBookings(r.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status?status=${status}`);
      toast.success("Estado actualizado");
      load();
    } catch (err) {
      toast.error("Error");
    }
  };

  return (
    <div data-testid="admin-bookings">
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter mb-6">Solicitudes de reserva</h1>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Familia</th>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-left px-4 py-2">Fechas</th>
              <th className="text-left px-4 py-2">Personas</th>
              <th className="text-left px-4 py-2">Contacto</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && <tr><td colSpan="8" className="text-center py-12 text-slate-400">Sin solicitudes</td></tr>}
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-slate-100" data-testid={`admin-booking-${b.id}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{b.user_name}</div>
                  <div className="text-xs text-slate-500">{b.user_email}</div>
                </td>
                <td className="px-4 py-2 capitalize">{b.type}</td>
                <td className="px-4 py-2 font-semibold">{b.item_name}</td>
                <td className="px-4 py-2">{b.start_date}{b.end_date ? ` → ${b.end_date}` : ""}</td>
                <td className="px-4 py-2">{b.guests}</td>
                <td className="px-4 py-2 text-slate-500">{b.contact_phone || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${b.status === "confirmada" ? "bg-green-100 text-green-800" : b.status === "cancelada" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{b.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <select value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded" data-testid={`status-select-${b.id}`}>
                    {STATUS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
