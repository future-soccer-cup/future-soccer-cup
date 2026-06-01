import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, UserCircle2, Shield } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Inicio", end: true },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/eventos", label: "Eventos" },
  { to: "/datos-estadisticas", label: "Estadísticas" },
  { to: "/noticias", label: "Noticias" },
  { to: "/contacto", label: "Contacto" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-[13px] font-bold uppercase tracking-[0.18em] transition-colors ${
      isActive ? "text-fsc-azul" : "text-white hover:text-fsc-azul"
    }`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-fsc-negro/95 backdrop-blur-md shadow-lg" : "bg-fsc-negro/85 backdrop-blur-sm"
      }`}
      data-testid="navbar"
    >
      {/* línea dorada inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fsc-azul to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-3 group" data-testid="navbar-logo">
            <div className="border-2 border-fsc-azul rounded-md p-1 group-hover:border-fsc-azul transition-colors">
              <Logo className="h-10 w-10" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display text-lg tracking-widest text-white">FUTURE SOCCER CUP</div>
              <div className="font-cursive text-xs text-fsc-azul leading-none -mt-1">Somos más que un torneo</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass} data-testid={`nav-${n.label.toLowerCase()}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/login" className="text-white hover:text-fsc-azul text-[12px] font-bold uppercase tracking-[0.15em] px-4 py-2.5" data-testid="navbar-login">
                  Ingresar
                </Link>
                <Link to="/registro-equipo" className="fsc-btn-primary px-5 py-2.5 rounded-md text-[12px]" data-testid="navbar-register">
                  Registrarse
                </Link>
              </>
            ) : (
              <>
                {user.role === "admin" && (
                  <Link to="/admin" className="text-fsc-azul hover:text-fsc-azul text-[12px] font-bold uppercase tracking-[0.15em] px-3 py-2 flex items-center gap-1" data-testid="navbar-admin">
                    <Shield size={14}/> Admin
                  </Link>
                )}
                {user.role === "team" && (
                  <Link to="/mi-equipo" className="text-fsc-azul hover:text-fsc-azul text-[12px] font-bold uppercase tracking-[0.15em] px-3 py-2 flex items-center gap-1" data-testid="navbar-myteam">
                    <UserCircle2 size={14}/> Mi Club
                  </Link>
                )}
                <button onClick={handleLogout} className="text-white hover:text-fsc-rojo text-[12px] font-bold uppercase tracking-[0.15em] px-3 py-2 flex items-center gap-1" data-testid="navbar-logout">
                  <LogOut size={14}/> Salir
                </button>
              </>
            )}
          </div>

          <button onClick={() => setOpen((v) => !v)} className="lg:hidden text-white p-2" aria-label="Menu" data-testid="navbar-menu-toggle">
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-fsc-negro border-t border-fsc-azul/30 fsc-fade-up">
          <nav className="max-w-7xl mx-auto px-4 py-4 grid gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 text-sm font-bold uppercase tracking-[0.15em] rounded-md ${
                    isActive ? "text-fsc-azul bg-fsc-azul/10" : "text-white hover:bg-white/5"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="h-px bg-fsc-azul/20 my-2" />
            {!user ? (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-white rounded-md hover:bg-white/5">Ingresar</Link>
                <Link to="/registro-equipo" onClick={() => setOpen(false)} className="fsc-btn-primary py-2.5 rounded-md text-sm text-center">Registrarse</Link>
              </>
            ) : (
              <>
                {user.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-fsc-azul rounded-md hover:bg-fsc-azul/10">Admin</Link>}
                {user.role === "team" && <Link to="/mi-equipo" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-fsc-azul rounded-md hover:bg-fsc-azul/10">Mi Club</Link>}
                <button onClick={handleLogout} className="px-3 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-fsc-rojo rounded-md hover:bg-fsc-rojo/10 text-left">Salir</button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
