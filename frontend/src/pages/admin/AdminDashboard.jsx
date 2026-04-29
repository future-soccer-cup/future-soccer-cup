import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Users, Shirt, Calendar, ClipboardList } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ teams: 0, players: 0, matches: 0, bookings: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/teams"),
      api.get("/players"),
      api.get("/matches"),
      api.get("/bookings"),
    ]).then(([t, p, m, b]) => {
      setStats({ teams: t.data.length, players: p.data.length, matches: m.data.length, bookings: b.data.length });
    });
  }, []);

  const items = [
    { label: "Equipos", value: stats.teams, icon: Shirt, color: "bg-blue-700", to: "/admin/equipos" },
    { label: "Jugadores", value: stats.players, icon: Users, color: "bg-red-600", to: "/admin/jugadores" },
    { label: "Partidos", value: stats.matches, icon: Calendar, color: "bg-slate-900", to: "/admin/partidos" },
    { label: "Reservas", value: stats.bookings, icon: ClipboardList, color: "bg-emerald-600", to: "/admin/reservas" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">Resumen general del torneo.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className={`${it.color} text-white rounded-xl p-5 fsc-card-shadow`}>
            <it.icon size={28} />
            <div className="font-display text-5xl font-black mt-3 leading-none">{it.value}</div>
            <div className="text-xs uppercase tracking-widest font-bold mt-1 opacity-90">{it.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Acciones rápidas</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Link to="/admin/equipos" className="px-4 py-3 bg-blue-50 rounded-md font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-100">+ Nuevo equipo</Link>
            <Link to="/admin/jugadores" className="px-4 py-3 bg-red-50 rounded-md font-bold uppercase tracking-wide text-red-700 hover:bg-red-100">+ Nuevo jugador</Link>
            <Link to="/admin/generador-fixture" className="px-4 py-3 bg-slate-900 text-white rounded-md font-bold uppercase tracking-wide hover:bg-slate-800">⚡ Generar fixture</Link>
            <Link to="/admin/inventario" className="px-4 py-3 bg-emerald-50 rounded-md font-bold uppercase tracking-wide text-emerald-700 hover:bg-emerald-100">+ Hotel/Tour</Link>
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-6 fsc-stripe-blue">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Tip del día</h3>
          <p className="mt-3 text-sm text-slate-300">Después de cargar partidos, registra los resultados desde la sección de Partidos para que la tabla de posiciones y goleadores se actualicen automáticamente.</p>
        </div>
      </div>
    </div>
  );
}
