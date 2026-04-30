import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogOut, UserCircle2, Shield } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/fixture", label: "Fixture" },
  { to: "/posiciones", label: "Posiciones" },
  { to: "/equipos", label: "Equipos" },
  { to: "/jugadores", label: "Jugadores" },
  { to: "/noticias", label: "Noticias" },
  { to: "/cotizar", label: "Cotizar" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const myAreaLink =
    user?.role === "team" ? { to: "/mi-equipo", label: "Mi equipo" } : { to: "/mis-reservas", label: user?.name || "Cuenta" };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center" data-testid="logo-home-link">
          <Logo className="h-10 w-10" showText />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.replace("/", "")}`}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive ? "text-blue-700" : "text-slate-700 hover:text-blue-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  data-testid="admin-panel-link"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-700"
                >
                  <Shield size={16} /> Admin
                </Link>
              )}
              <Link
                to={myAreaLink.to}
                data-testid="my-area-link"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:text-blue-700"
              >
                <UserCircle2 size={16} /> {myAreaLink.label}
              </Link>
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900"
              >
                <LogOut size={16} /> Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="login-link"
                className="px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-900 hover:text-blue-700"
              >
                Ingresar
              </Link>
              <Link
                to="/registro"
                data-testid="register-link"
                className="fsc-btn-primary px-4 py-2 text-sm rounded-md"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-slate-700"
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-toggle"
          aria-label="Menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-700"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="border-t border-slate-200 my-2" />
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-red-600">Admin</Link>
                )}
                <Link to={myAreaLink.to} onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">{myAreaLink.label}</Link>
                <button onClick={handleLogout} className="text-left px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-500">Salir</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-slate-900">Ingresar</Link>
                <Link to="/registro" onClick={() => setOpen(false)} className="fsc-btn-primary px-4 py-2 text-sm rounded-md text-center">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
