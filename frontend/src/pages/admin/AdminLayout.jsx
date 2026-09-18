import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Shirt,
  Calendar,
  Hotel,
  IdCard,
  Wand2,
  Trophy,
  CheckSquare,
  FileUp,
  Receipt,
  Wallet,
  KeyRound,
  ListChecks,
  Image as ImageIcon,
  Home as HomeIcon,
  Inbox,
  Tag,
  Menu,
  Settings,
} from "lucide-react";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/home", label: "Home", icon: HomeIcon },
  { to: "/admin/galeria", label: "Galería", icon: ImageIcon },
  { to: "/admin/mensajes", label: "Mensajes", icon: Inbox },
  { to: "/admin/categorias", label: "Categorías", icon: Tag },
  { to: "/admin/tipos-evento", label: "Tipos de evento", icon: Calendar },
  { to: "/admin/torneos", label: "Eventos", icon: ListChecks },
  { to: "/admin/inventario", label: "Paquetes", icon: Hotel },
  { to: "/admin/cotizaciones", label: "Cotizaciones", icon: Receipt },
  { to: "/admin/pagos", label: "Pagos", icon: Wallet },
  { to: "/admin/clubes", label: "Clubes", icon: Shirt },
  { to: "/admin/jugadores", label: "Jugadores", icon: Users },
  { to: "/admin/carga-masiva", label: "Carga masiva", icon: FileUp },
  { to: "/admin/carnets", label: "Carnets", icon: IdCard },
  { to: "/admin/aprobaciones", label: "Aprobaciones", icon: CheckSquare },
  { to: "/admin/partidos", label: "Partidos", icon: Calendar },
  { to: "/admin/generador-fixture", label: "Generar Fixture", icon: Wand2 },
  { to: "/admin/bracket", label: "Bracket", icon: Trophy },
  { to: "/admin/recuperaciones", label: "Recuperar clave", icon: KeyRound },
  { to: "/admin/usuarios-config", label: "Usuarios Config.", icon: Settings, adminOnly: true },
];

// El rol "content_admin" solo puede ver/editar Home y Galería — se filtra el menú y se
// bloquea la navegación directa a cualquier otra ruta de /admin.
const CONTENT_ADMIN_ALLOWED_PATHS = ["/admin/home", "/admin/galeria"];

// Lista de navegación reutilizada tanto en el sidebar fijo (desktop, ≥lg) como en el
// drawer deslizable (mobile/tablet, <lg). `onNavigate` cierra el drawer al elegir un link.
function AdminNavList({ onNavigate, items }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
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
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const isContentAdmin = user?.role === "content_admin";
  // El rol Configuración solo ve Home y Galería en el menú; el Admin ve todo. El guard
  // de abajo además bloquea el acceso real si de algún modo llega a otra ruta (ej. bookmark viejo).
  const visibleNav = isContentAdmin
    ? NAV.filter((n) => CONTENT_ADMIN_ALLOWED_PATHS.includes(n.to))
    : NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  const isBlocked = isContentAdmin && !CONTENT_ADMIN_ALLOWED_PATHS.includes(location.pathname);

  useEffect(() => {
    if (isBlocked) toast.error("No tienes permiso para acceder a esa sección");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (isBlocked) {
    return <Navigate to="/admin/home" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-layout">
      <Toaster position="top-right" />
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 fsc-stripe-blue">
        <Link to="/" className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 bg-white">
          <Logo className="h-9 w-9" />
          <div>
            <div className="font-display text-sm font-black text-slate-900">FSC ADMIN</div>
            <div className="text-[10px] text-slate-500 tracking-widest uppercase">{isContentAdmin ? "Configuración" : "Panel"}</div>
          </div>
        </Link>
        <AdminNavList items={visibleNav} />
        <div className="p-3 border-t border-slate-800 text-xs">
          <div className="text-slate-400">Sesión</div>
          <div className="text-white truncate">{user?.email}</div>
          <button onClick={logout} className="mt-2 text-red-400 hover:text-red-300 font-bold uppercase tracking-wide" data-testid="admin-logout">Cerrar sesión</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700"
                  data-testid="admin-mobile-menu-toggle"
                >
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col bg-slate-900 text-slate-300 fsc-stripe-blue w-72">
                <Link to="/" onClick={() => setNavOpen(false)} className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 bg-white">
                  <Logo className="h-9 w-9" />
                  <div>
                    <div className="font-display text-sm font-black text-slate-900">FSC ADMIN</div>
                    <div className="text-[10px] text-slate-500 tracking-widest uppercase">Panel</div>
                  </div>
                </Link>
                <AdminNavList onNavigate={() => setNavOpen(false)} items={visibleNav} />
                <div className="p-3 border-t border-slate-800 text-xs">
                  <div className="text-slate-400">Sesión</div>
                  <div className="text-white truncate">{user?.email}</div>
                  <button onClick={logout} className="mt-2 text-red-400 hover:text-red-300 font-bold uppercase tracking-wide" data-testid="admin-logout-mobile">Cerrar sesión</button>
                </div>
              </SheetContent>
            </Sheet>
            <Logo showText />
          </div>
          <Link to="/" className="text-xs uppercase font-bold text-blue-700">Salir admin</Link>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
