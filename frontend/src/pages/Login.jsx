import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-white" data-testid="login-page">
      <Toaster position="top-right" />
      {/* Form (izquierda) */}
      <main className="flex-1 lg:flex-[3] flex items-center justify-center p-6 sm:p-10 lg:p-16 min-w-0">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-fsc-azul-oscuro mb-6">
            <ArrowLeft size={14}/> Volver al inicio
          </Link>

          <div className="font-cursive text-2xl text-fsc-azul-oscuro">bienvenido</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-wider text-fsc-negro">INGRESAR</h1>
          <div className="h-1 w-16 bg-fsc-rojo mt-3 mb-7"/>

          <p className="text-sm text-slate-600 mb-6">
            Accede a tu cuenta para gestionar tu club, inscripciones y cotizaciones.
          </p>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Correo electrónico</span>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none"/>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-md focus:outline-none focus:border-fsc-azul transition-colors"
                  data-testid="login-email-input"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Contraseña</span>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none"/>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-md focus:outline-none focus:border-fsc-azul transition-colors"
                  data-testid="login-password-input"
                />
              </div>
              <div className="text-right mt-2">
                <Link to="/recuperar-clave" className="text-xs font-bold tracking-wider text-fsc-azul-oscuro hover:text-fsc-rojo transition-colors uppercase" data-testid="forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="fsc-btn-primary w-full py-3.5 rounded-md disabled:opacity-50"
              data-testid="login-submit-btn"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Link
            to="/registro-equipo"
            className="fsc-btn-dark w-full py-3 rounded-md flex items-center justify-center"
            data-testid="login-to-register-btn"
          >
            Registrar mi club
          </Link>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Reservado para directores y directores técnicos de club.
          </p>
        </div>
      </main>

      {/* Panel decorativo (derecha) */}
      <aside className="hidden lg:flex lg:flex-[2] relative overflow-hidden bg-fsc-negro items-center justify-center min-h-[600px] min-w-0">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(https://images.pexels.com/photos/32694240/pexels-photo-32694240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1100&w=900)` }} />
        <div className="absolute inset-0 bg-gradient-to-bl from-fsc-negro via-fsc-negro/85 to-fsc-azul-noche/70" />
        <div className="absolute inset-0 fsc-grain pointer-events-none opacity-50" />
        <div className="relative text-center px-10 fsc-fade-up">
          <div className="bg-fsc-negro border-2 border-fsc-azul rounded-2xl p-8 inline-block">
            <img src={FSC_LOGO} alt="FSC" className="h-28 w-28" />
          </div>
          <h2 className="mt-8 font-display text-5xl tracking-wider text-white">FUTURE SOCCER CUP</h2>
          <div className="font-cursive text-2xl text-fsc-azul mt-1">Somos más que un torneo</div>
          <p className="mt-5 text-fsc-gris/90 max-w-sm mx-auto leading-relaxed">
            La plataforma oficial para directores de club y directores técnicos.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-fsc-azul h-2" />
      </aside>
    </div>
  );
}
