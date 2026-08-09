/**
 * Página Ingreso — rediseño Iter66. Card roja con formulario a la izquierda +
 * imagen de mascota KOW (editable via CMS auth_login_image_url) a la derecha.
 * Toda la lógica de autenticación se mantiene sin cambios.
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, imgSrc } from "../lib/api";
import { toast, Toaster } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/home-settings").then((r) => {
      const d = r.data || {};
      setImageUrl(d.auth_login_image_url || "");
      setHeroBgUrl(d.home_hero_bg_url || "");
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bienvenido, ${u.name}`);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "team") nav("/mi-equipo");
      else nav("/mis-cotizaciones");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 overflow-hidden" data-testid="login-page" style={AGENCY_FB}>
      {/* Fondo con el hero del inicio */}
      <div className="absolute inset-0">
        {heroBgUrl && <img src={imgSrc(heroBgUrl)} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: `${BLUE}CC` }} />
        {/* Watermark EDICIÓN */}
        <div
          className="absolute top-6 left-4 md:left-10 leading-none pointer-events-none select-none"
          style={{
            ...PLANE_CRASH,
            color: "rgba(255,255,255,0.18)",
            fontSize: "clamp(3rem, 8vw, 7rem)",
            letterSpacing: "0.05em",
          }}
        >
          {planeCrashSafe("edicion")}
        </div>
      </div>

      {/* Card roja */}
      <div
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: RED }}
        data-testid="login-card"
      >
        <div className="p-8 md:p-10">
          <div className="text-white mb-6">
            <div style={{ fontFamily: "'Dancing Script', 'Allura', cursive", fontWeight: 700, fontSize: "clamp(2rem, 3.6vw, 3rem)", lineHeight: 1 }}>Ingresa a</div>
            <div className="italic mt-1" style={{ fontFamily: "'Dancing Script', 'Allura', cursive", fontWeight: 500, fontSize: "clamp(1.6rem, 2.8vw, 2.4rem)", lineHeight: 1 }}>tu cuenta</div>
          </div>

          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <label className="block">
              <span className="text-white text-xs tracking-widest flex items-center gap-1.5" style={PLANE_CRASH}>
                <Mail size={14} /> {planeCrashSafe("ingresa tu correo")} <span>*</span>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="CORREO ELECTRONICO"
                className="mt-1 w-full px-3 py-2.5 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
                data-testid="login-email"
              />
            </label>
            <label className="block">
              <span className="text-white text-xs tracking-widest flex items-center gap-1.5" style={PLANE_CRASH}>
                <Lock size={14} /> {planeCrashSafe("ingresa tu contraseña")} <span>*</span>
              </span>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="CONTRASEÑA"
                  className="w-full px-3 py-2.5 pr-10 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
                  data-testid="login-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 p-1" aria-label="Mostrar contraseña">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-md bg-white transition-transform hover:scale-105 disabled:opacity-60"
                style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "0.95rem" }}
                data-testid="login-submit"
              >
                {planeCrashSafe(loading ? "ingresando..." : "iniciar sesion")}
              </button>
              <Link to="/recuperar" className="text-white/90 text-xs underline hover:text-white" data-testid="login-forgot">
                ¿OLVIDASTE TU CONTRASEÑA?
              </Link>
            </div>
          </form>

          <div className="my-6 border-t border-white/30" />

          <div className="text-white text-sm">
            <span>¿ERES NUEVO? </span>
            <Link to="/registro" className="font-black hover:underline" style={{ color: BLUE }} data-testid="login-to-register">
              REGÍSTRATE
            </Link>
          </div>
        </div>

        {/* Imagen KOW derecha */}
        <div className="relative min-h-[300px] md:min-h-full bg-slate-900" data-testid="login-image-side">
          {imageUrl ? (
            <img src={imgSrc(imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm" style={AGENCY_FB}>
              Imagen no configurada
            </div>
          )}
        </div>
      </div>

      <Toaster richColors position="top-center" />
    </div>
  );
}
