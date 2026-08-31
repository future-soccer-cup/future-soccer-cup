/**
 * Modal de Ingreso (Iter68, extendido Iter75). Aparece encima de la página actual con overlay
 * oscuro. Se cierra al hacer click fuera o en X. El link REGÍSTRATE cierra el
 * modal y navega a /registro-equipo. Lógica de autenticación intacta.
 *
 * Iter75: "¿Olvidaste tu contraseña?" ya NO navega a otra página — el mismo modal
 * cambia de vista internamente (login -> forgot -> reset -> login) sin cerrarse.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLoginModal } from "../context/LoginModalContext";
import api, { formatApiError, imgSrc } from "../lib/api";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, X, KeyRound, ArrowLeft, ArrowRight } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, renderPlaneCrash } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function LoginModal() {
  const { open, closeLogin } = useLoginModal();
  const [view, setView] = useState("login"); // login | forgot | forgot-sent | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  // Estado del flujo de recuperación (Iter75)
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetPw2, setResetPw2] = useState("");
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

  // Al cerrar el modal, resetea la vista para la próxima vez que se abra.
  useEffect(() => {
    if (open) return;
    setView("login");
    setForgotEmail(""); setResetEmail(""); setResetCode(""); setResetPw(""); setResetPw2("");
  }, [open]);

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

  // Iter75: en vez de navegar, limpia los campos de login y muestra el formulario de "olvidé mi contraseña" en el mismo modal.
  const goForgot = () => {
    setPassword("");
    setForgotEmail(email);
    setView("forgot");
  };

  const backToLogin = () => setView("login");

  const submitForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setView("forgot-sent");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al solicitar recuperación");
    } finally {
      setLoading(false);
    }
  };

  const goReset = () => {
    setResetEmail(forgotEmail);
    setView("reset");
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (resetPw !== resetPw2) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email: resetEmail, code: resetCode.trim(), new_password: resetPw });
      toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
      setEmail(resetEmail);
      setPassword("");
      setView("login");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center px-4 py-8 overflow-y-auto"
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

        {/* Columna izquierda — formulario (cambia según `view`) */}
        <div className="p-10 md:p-12">
          {view === "login" && (
            <>
              <div className="text-white mb-7">
                <div style={{ ...AGENCY_FB, fontWeight: 800, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", lineHeight: 1 }}>Ingresa a</div>
                <div className="italic mt-1" style={{ ...CURSIVE, fontWeight: 500, fontSize: "clamp(1.8rem, 3.2vw, 2.7rem)", lineHeight: 1 }}>tu cuenta</div>
              </div>

              <form onSubmit={submit} className="space-y-5" data-testid="login-modal-form">
                <label className="block">
                  <span className="text-white text-sm sm:text-lg md:text-xl tracking-wide sm:tracking-widest flex items-center gap-2 flex-wrap" style={PLANE_CRASH}>
                    <Mail size={22} className="shrink-0" /> {renderPlaneCrash("ingresa tu correo")} <span>*</span>
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
                    <Lock size={22} className="shrink-0" /> {renderPlaneCrash("ingresa tu contraseña")} <span>*</span>
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
                    {renderPlaneCrash(loading ? "ingresando..." : "iniciar sesion")}
                  </button>
                  <button
                    type="button"
                    onClick={goForgot}
                    className="text-white/90 text-lg md:text-xl underline hover:text-white"
                    data-testid="login-modal-forgot"
                  >
                    ¿OLVIDASTE TU CONTRASEÑA?
                  </button>
                </div>
              </form>

              <div className="my-6 border-t border-white/30" />

              <div className="text-white text-2xl md:text-3xl">
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
            </>
          )}

          {view === "forgot" && (
            <div data-testid="login-modal-forgot-form">
              <button type="button" onClick={backToLogin} className="flex items-center gap-1 text-white/80 hover:text-white text-lg md:text-xl font-bold uppercase tracking-widest mb-6" data-testid="forgot-back-to-login">
                <ArrowLeft size={14} /> Volver a Ingresar
              </button>
              <div className="text-white mb-2" style={{ ...AGENCY_FB, fontWeight: 800, fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.05 }}>
                ¿Olvidaste tu<br />contraseña?
              </div>
              <p className="text-white/85 text-sm md:text-base mt-3">
                Ingresa el correo asociado a tu cuenta. Generaremos un <strong>código de 8 dígitos</strong> que el administrador del torneo te entregará por WhatsApp o teléfono.
              </p>
              <form onSubmit={submitForgot} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Mail size={16} /> Correo electrónico
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="mt-2 w-full px-4 py-3 text-lg rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                    data-testid="login-modal-forgot-email"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-md bg-white transition-transform hover:scale-105 disabled:opacity-60 flex items-center gap-2"
                  style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "0.95rem" }}
                  data-testid="login-modal-forgot-submit"
                >
                  {loading ? "Enviando..." : "Solicitar código"} <ArrowRight size={16} />
                </button>
              </form>
              <button type="button" onClick={goReset} className="block mt-4 text-white/80 hover:text-white text-sm underline" data-testid="login-modal-have-code">
                ¿Ya tienes un código? Ingrésalo aquí →
              </button>
            </div>
          )}

          {view === "forgot-sent" && (
            <div data-testid="login-modal-forgot-sent">
              <button type="button" onClick={backToLogin} className="flex items-center gap-1 text-white/80 hover:text-white text-lg md:text-xl font-bold uppercase tracking-widest mb-6" data-testid="forgot-back-to-login">
                <ArrowLeft size={14} /> Volver a Ingresar
              </button>
              <div className="bg-white/15 border border-white/30 rounded-2xl p-5">
                <KeyRound className="text-white" size={32} />
                <div className="text-white mt-3" style={{ ...AGENCY_FB, fontWeight: 800, fontSize: "1.6rem" }}>Solicitud enviada</div>
                <p className="text-white/85 text-sm mt-2">Si el correo <strong>{forgotEmail}</strong> está registrado, generamos un código.</p>
                <p className="text-white/70 text-xs mt-3">📞 Contacta al administrador del torneo para que te entregue el código. Una vez lo tengas:</p>
                <button
                  type="button"
                  onClick={goReset}
                  className="mt-4 px-5 py-3 rounded-md bg-white flex items-center gap-2"
                  style={{ ...PLANE_CRASH, color: RED, fontSize: "0.9rem" }}
                  data-testid="login-modal-go-reset"
                >
                  Ingresar mi código <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {view === "reset" && (
            <div data-testid="login-modal-reset-form">
              <button type="button" onClick={backToLogin} className="flex items-center gap-1 text-white/80 hover:text-white text-lg md:text-xl font-bold uppercase tracking-widest mb-6" data-testid="reset-back-to-login">
                <ArrowLeft size={14} /> Volver a Ingresar
              </button>
              <div className="text-white mb-2" style={{ ...AGENCY_FB, fontWeight: 800, fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.05 }}>
                Define tu<br />nueva clave
              </div>
              <p className="text-white/85 text-sm md:text-base mt-3">Ingresa el código de 8 dígitos que te entregó el administrador y elige tu nueva contraseña.</p>
              <form onSubmit={submitReset} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Correo</span>
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="mt-2 w-full px-4 py-3 text-lg rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                    data-testid="login-modal-reset-email"
                  />
                </label>
                <label className="block">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Código de recuperación</span>
                  <input
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                    placeholder="Ej. 12345678"
                    inputMode="numeric"
                    className="mt-2 w-full px-4 py-3 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-white font-display text-2xl font-black tracking-[0.4em] text-center tabular-nums"
                    style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                    data-testid="login-modal-reset-code"
                  />
                </label>
                <label className="block">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Nueva contraseña (mín. 6)</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    className="mt-2 w-full px-4 py-3 text-lg rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                    data-testid="login-modal-reset-pw"
                  />
                </label>
                <label className="block">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Confirmar contraseña</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={resetPw2}
                    onChange={(e) => setResetPw2(e.target.value)}
                    className="mt-2 w-full px-4 py-3 text-lg rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                    data-testid="login-modal-reset-pw2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-md bg-white transition-transform hover:scale-105 disabled:opacity-60 flex items-center gap-2"
                  style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "0.95rem" }}
                  data-testid="login-modal-reset-submit"
                >
                  {loading ? "Actualizando..." : renderPlaneCrash("Restablecer contraseña")} <ArrowRight size={16} />
                </button>
              </form>
              <button type="button" onClick={goForgot} className="block mt-4 text-white/80 hover:text-white text-sm underline" data-testid="login-modal-no-code">
                ¿No tienes código? Solicitar uno
              </button>
            </div>
          )}
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
