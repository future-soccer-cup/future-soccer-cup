import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, UserCircle2, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "INICIO", end: true },
  { to: "/nosotros", label: "NOSOTROS" },
  { to: "/eventos", label: "EVENTOS" },
  { to: "/datos-estadisticas", label: "ESTADÍSTICAS" },
  { to: "/noticias", label: "NOTICIAS" },
  { to: "/contacto", label: "CONTÁCTO" },
];

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate("/"); };

  // No mostrar la navbar pública en rutas de admin
  const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  if (isAdmin) return null;

  return (
    <header className="w-full" style={{ fontFamily: "'Barlow', 'Inter', sans-serif" }} data-testid="public-navbar">
      {/* Fila 1: Logo + tagline cursivo (sobre fondo transparente) */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4" data-testid="nav-logo-link">
            <img
              src="https://customer-assets.emergentagent.com/job_fixture-stats-pro/artifacts/y4ulg6l9_FUTRE%20SOCCER%20CUP%202025_Mesa%20de%20trabajo%201.png"
              alt="Future Soccer Cup"
              className="h-14 md:h-16 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span className="hidden sm:inline-block font-black uppercase leading-[0.85]" style={{ fontFamily: "'Anton', sans-serif", color: BLUE, fontSize: "clamp(20px, 2.4vw, 32px)" }}>
              FUTUR<br/>SOCCER<br/>CUP
            </span>
          </Link>
          <span className="hidden md:inline-block italic text-2xl lg:text-4xl" style={{ fontFamily: "'Allura', 'Dancing Script', cursive", color: BLUE }} data-testid="nav-tagline">
            Torneo Internacional
          </span>
          {/* Botón mobile */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-slate-700" aria-label="Menú" data-testid="nav-mobile-toggle">
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Fila 2: Menú estilo wireframe — fondo blanco, links rojos en bold uppercase */}
      <nav className={`bg-white border-b-2 border-slate-100 ${open ? "block" : "hidden"} md:block`}>
        <div className="max-w-7xl mx-auto px-6 py-1 md:py-2 flex flex-col md:flex-row md:items-stretch md:justify-between gap-1">
          <div className="flex flex-col md:flex-row md:items-stretch gap-0">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base transition ${
                  isActive ? "text-white" : "hover:opacity-80"
                }`}
                style={({ isActive }) => ({
                  background: isActive ? BLUE : "transparent",
                  color: isActive ? "#fff" : RED,
                })}
                data-testid={`nav-link-${n.label.toLowerCase()}`}
              >
                {n.label}
              </NavLink>
            ))}
          </div>
          <div className="flex flex-col md:flex-row md:items-stretch md:gap-1">
            {user ? (
              <>
                {user.role === "admin" && (
                  <NavLink to="/admin" onClick={() => setOpen(false)} className="px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base flex items-center gap-1.5 hover:opacity-80" style={{ color: BLUE }} data-testid="nav-link-admin">
                    <Shield size={16}/> ADMIN
                  </NavLink>
                )}
                {user.role === "team" && (
                  <NavLink to="/mi-equipo" onClick={() => setOpen(false)} className="px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base flex items-center gap-1.5 hover:opacity-80" style={{ color: RED }} data-testid="nav-link-mi-equipo">
                    <UserCircle2 size={16}/> MI EQUIPO
                  </NavLink>
                )}
                <button onClick={handleLogout} className="px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base flex items-center gap-1.5 hover:opacity-80" style={{ color: RED }} data-testid="nav-logout">
                  <LogOut size={16}/> SALIR
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)} className="px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base hover:opacity-80" style={{ color: RED }} data-testid="nav-link-ingreso">
                  INGRESO
                </NavLink>
                <NavLink to="/registro-equipo" onClick={() => setOpen(false)} className="px-4 md:px-5 py-3 font-black uppercase tracking-wider text-sm md:text-base hover:opacity-80" style={{ color: BLUE }} data-testid="nav-link-registro">
                  REGISTRO
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
