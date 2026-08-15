/**
 * Modal de Ingreso (Iter68). Aparece encima de la página actual con overlay
 * oscuro. Se cierra al hacer click fuera o en X. El link REGÍSTRATE cierra el
 * modal y navega a /registro-equipo. Lógica de autenticación intacta.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLoginModal } from "../context/LoginModalContext";
import api, { formatApiError, imgSrc } from "../lib/api";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, X } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function LoginModal() {
  const { open, closeLogin } = useLoginModal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  // Cargar imagen KOW del CMS solo cuando el modal se abre por primera vez.
  useEffect(() => {
    if (!open) return;
    api.get("/home-settings").then((r) => {
      setImageUrl(r.data?.auth_login_image_url || "");
    }).catch(() => {});
  }, [open]);

  // Cerrar con Escape + bloquear scroll del body cuando el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") closeLogin(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeLogin]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bienvenido, ${u.name}`);
      closeLogin();
      setEmail(""); setPassword("");
      if (u.role === "admin") nav("/admin");
      else if (u.role === "team") nav("/mi-equipo");
      else nav("/mis-cotizaciones");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => {
    closeLogin();
    nav("/registro-equipo");
  };

  const goForgot = () => {
    closeLogin();
    nav("/recuperar-clave");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 overflow-y-auto"
      style={AGENCY_FB}
      onClick={closeLogin}
      data-testid="login-modal-overlay"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 max-w-5xl w-full rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: RED }}
        onClick={(e) => e.stopPropagation()}
        data-testid="login-modal-card"
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={closeLogin}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-20 text-white/90 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition"
          data-testid="login-modal-close"
        >
          <X size={20} />
        </button>

        {/* Columna izquierda — formulario */}
        <div className="p-10 md:p-12">
          <div className="text-white mb-7">
            <div style={{ ...AGENCY_FB, fontWeight: 800, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", lineHeight: 1 }}>Ingresa a</div>
            <div className="italic mt-1" style={{ ...CURSIVE, fontWeight: 500, fontSize: "clamp(1.8rem, 3.2vw, 2.7rem)", lineHeight: 1 }}>tu cuenta</div>
          </div>

          <form onSubmit={submit} className="space-y-5" data-testid="login-modal-form">
            <label className="block">
              <span className="text-white text-sm sm:text-lg md:text-xl tracking-wide sm:tracking-widest flex items-center gap-2 flex-wrap" style={PLANE_CRASH}>
                <Mail size={22} className="shrink-0" /> {planeCrashSafe("ingresa tu correo")} <span>*</span>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="CORREO ELECTRONICO"
                className="mt-2 w-full px-4 py-4 text-2xl rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
                style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                data-testid="login-modal-email"
              />
            </label>
            <label className="block">
              <span className="text-white text-sm sm:text-lg md:text-xl tracking-wide sm:tracking-widest flex items-center gap-2 flex-wrap" style={PLANE_CRASH}>
                <Lock size={22} className="shrink-0" /> {planeCrashSafe("ingresa tu contraseña")} <span>*</span>
              </span>
              <div className="relative mt-2">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="CONTRASEÑA"
                  className="w-full px-4 py-4 pr-12 text-2xl rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
                  style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                  data-testid="login-modal-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1" aria-label="Mostrar contraseña">
                  {showPw ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </label>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-md bg-white transition-transform hover:scale-105 disabled:opacity-60"
                style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "0.95rem" }}
                data-testid="login-modal-submit"
              >
                {planeCrashSafe(loading ? "ingresando..." : "iniciar sesion")}
              </button>
              <button
                type="button"
                onClick={goForgot}
                className="text-white/90 text-xs underline hover:text-white"
                data-testid="login-modal-forgot"
              >
                ¿OLVIDASTE TU CONTRASEÑA?
              </button>
            </div>
          </form>

          <div className="my-6 border-t border-white/30" />

          <div className="text-white text-base md:text-lg">
            <span>¿ERES NUEVO? </span>
            <button
              type="button"
              onClick={goRegister}
              className="font-black hover:underline"
              style={{ color: BLUE }}
              data-testid="login-modal-to-register"
            >
              REGÍSTRATE
            </button>
          </div>
        </div>

        {/* Columna derecha — imagen KOW */}
        <div className="relative min-h-[300px] md:min-h-full bg-slate-900" data-testid="login-modal-image">
          {imageUrl ? (
            <img src={imgSrc(imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm" style={AGENCY_FB}>
              Imagen no configurada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
