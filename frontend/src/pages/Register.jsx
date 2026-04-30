import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import { Users, Shirt, CheckCircle2 } from "lucide-react";

export default function Register() {
  const [role, setRole] = useState(null); // null | 'family' | 'team'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!consent) { toast.error("Debes aceptar la política de datos"); return; }
    setLoading(true);
    try {
      const r = await api.post("/auth/register", { name, email, password, data_consent: consent });
      setUser(r.data);
      toast.success("Cuenta creada");
      nav("/mis-cotizaciones");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2 bg-white" data-testid="register-page">
      <Toaster position="top-right" />

      {/* Left: Form or Role Selector */}
      <div className="flex items-center justify-center p-6 md:p-10 order-2 md:order-1">
        <div className="w-full max-w-md">
          {!role && (
            <div data-testid="role-selector">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Paso 1 de 2</span>
              <h1 className="mt-1 font-display text-5xl font-black uppercase tracking-tighter">¿Cómo te<br/>registras?</h1>
              <p className="text-sm text-slate-500 mt-2">Elige el tipo de cuenta según tu rol en FSC.</p>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setRole("team")}
                  data-testid="role-dt-btn"
                  className="w-full text-left border-2 border-slate-200 hover:border-red-600 hover:bg-red-50 rounded-2xl p-5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0"><Shirt size={26}/></div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Club / Coach</div>
                      <div className="font-display text-2xl font-black uppercase tracking-tight">Director técnico o gerente</div>
                      <div className="text-xs text-slate-500 mt-1">Registra tu club, carga la plantilla y paga la inscripción del evento.</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRole("family")}
                  data-testid="role-family-btn"
                  className="w-full text-left border-2 border-slate-200 hover:border-blue-700 hover:bg-blue-50 rounded-2xl p-5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0"><Users size={26}/></div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Acompañante</div>
                      <div className="font-display text-2xl font-black uppercase tracking-tight">Familiar</div>
                      <div className="text-xs text-slate-500 mt-1">Cotiza hospedaje, transporte y tours para acompañar al club.</div>
                    </div>
                  </div>
                </button>
              </div>

              <p className="mt-8 text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="text-blue-700 font-bold">Ingresar</Link></p>
            </div>
          )}

          {role === "team" && (
            <div className="text-center" data-testid="role-redirect-team">
              <CheckCircle2 size={56} className="mx-auto text-red-600" />
              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight">Perfecto — eres coach</h2>
              <p className="text-sm text-slate-500 mt-2">Continúa al registro completo del club.</p>
              <Link to="/registro-equipo" className="mt-6 inline-block fsc-btn-red px-6 py-3 rounded-md text-sm" data-testid="go-team-register">Registrar mi equipo →</Link>
              <button onClick={() => setRole(null)} className="mt-4 block mx-auto text-xs text-slate-400 hover:text-slate-700">← Volver</button>
            </div>
          )}

          {role === "family" && (
            <div data-testid="family-form">
              <button onClick={() => setRole(null)} className="text-xs text-slate-400 hover:text-slate-700 mb-3">← Volver</button>
              <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Cuenta familiar</h1>
              <p className="text-sm text-slate-500 mt-1">Acompaña a tu equipo: hospedaje, transporte y más.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre completo</span>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="register-name-input" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="register-email-input" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña (mín. 6)</span>
                  <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="register-password-input" />
                </label>

                <ConsentBlock checked={consent} onChange={setConsent} testId="register-consent" />

                <button type="submit" disabled={loading || !consent} className="fsc-btn-red w-full py-3 rounded-md disabled:opacity-50" data-testid="register-submit-btn">
                  {loading ? "Creando..." : "Crear cuenta"}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="text-blue-700 font-bold">Ingresar</Link></p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Hero */}
      <div className="hidden md:flex relative overflow-hidden bg-blue-700 fsc-stripe-blue items-center justify-center order-1 md:order-2">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)` }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/90 via-blue-800/70 to-transparent" />
        <div className="relative text-center px-12">
          <img src={FSC_LOGO} alt="FSC" className="h-32 mx-auto bg-white rounded-2xl p-3 shadow-2xl" />
          <h2 className="mt-6 font-display text-5xl font-black uppercase text-white tracking-tighter">Únete a FSC</h2>
          <p className="mt-3 text-blue-100 max-w-sm">Cotizaciones, fixture y novedades en un solo lugar.</p>
        </div>
      </div>
    </div>
  );
}

export function ConsentBlock({ checked, onChange, testId }) {
  return (
    <label className={`block cursor-pointer border-2 rounded-xl p-4 transition-colors ${checked ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={testId}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 accent-blue-700"
          data-testid={`${testId}-checkbox`}
        />
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="font-bold text-slate-900 mb-1 uppercase tracking-wider text-[11px]">Tratamiento de datos y uso de imagen</div>
          Autorizo a Future Soccer Cup el tratamiento de mis datos personales bajo la Ley 1581/2012 y el uso de fotografías y videos tomados durante los eventos y partidos para fines de promoción, redes sociales y publicidad del torneo.
        </div>
      </div>
    </label>
  );
}
