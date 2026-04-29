import { Link, NavLink, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  Users,
  Shirt,
  Calendar,
  Hotel,
  IdCard,
  ClipboardList,
  Wand2,
} from "lucide-react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/equipos", label: "Equipos", icon: Shirt },
  { to: "/admin/jugadores", label: "Jugadores", icon: Users },
  { to: "/admin/partidos", label: "Partidos", icon: Calendar },
  { to: "/admin/generador-fixture", label: "Generar Fixture", icon: Wand2 },
  { to: "/admin/inventario", label: "Inventario", icon: Hotel },
  { to: "/admin/reservas", label: "Reservas", icon: ClipboardList },
  { to: "/admin/carnets", label: "Carnets", icon: IdCard },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-layout">
      <Toaster position="top-right" />
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 fsc-stripe-blue">
        <Link to="/" className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 bg-white">
          <Logo className="h-9 w-9" />
          <div>
            <div className="font-display text-sm font-black text-slate-900">FSC ADMIN</div>
            <div className="text-[10px] text-slate-500 tracking-widest uppercase">Panel</div>
          </div>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`admin-nav-${n.to.split("/").pop()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wide ${
                  isActive ? "bg-blue-700 text-white" : "hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-xs">
          <div className="text-slate-400">Sesión</div>
          <div className="text-white truncate">{user?.email}</div>
          <button onClick={logout} className="mt-2 text-red-400 hover:text-red-300 font-bold uppercase tracking-wide" data-testid="admin-logout">Cerrar sesión</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <Logo showText />
          <Link to="/" className="text-xs uppercase font-bold text-blue-700">Salir admin</Link>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
