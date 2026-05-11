import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import { KeyRound, ArrowRight, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al solicitar recuperación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2 bg-white" data-testid="forgot-password-page">
      <Toaster position="top-right" />

      {/* Left: form */}
      <div className="flex items-center justify-center p-6 md:p-10 order-2 md:order-1">
        <div className="w-full max-w-md">
          <Link to="/login" className="text-xs uppercase tracking-widest font-bold text-blue-700">← Volver a Ingresar</Link>
          <span className="block mt-4 text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Recuperar acceso</span>
          <h1 className="mt-1 font-display text-5xl font-black uppercase tracking-tighter">¿Olvidaste tu<br/>contraseña?</h1>

          {!submitted ? (
            <>
              <p className="text-sm text-slate-500 mt-3">Ingresa el correo asociado a tu cuenta. Generaremos un <strong>código de 8 dígitos</strong> que el administrador del torneo te entregará por WhatsApp o teléfono.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo electrónico</span>
                  <div className="mt-1 relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="forgot-email-input" />
                  </div>
                </label>
                <button type="submit" disabled={loading} className="fsc-btn-red w-full py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50" data-testid="forgot-submit-btn">
                  {loading ? "Generando código..." : (<>Solicitar código <ArrowRight size={16}/></>)}
                </button>
              </form>

              <Link to="/restablecer-clave" className="block mt-4 text-center text-sm text-blue-700 font-bold" data-testid="have-code-link">¿Ya tienes un código? Ingrésalo aquí →</Link>
            </>
          ) : (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5" data-testid="forgot-success">
              <KeyRound className="text-blue-700" size={32}/>
              <div className="font-display text-2xl font-black uppercase tracking-tight mt-3">Solicitud enviada</div>
              <p className="text-sm text-slate-600 mt-2">Si el correo <strong>{email}</strong> está registrado, generamos un código.</p>
              <p className="text-xs text-slate-500 mt-3">📞 <strong>Contacta al administrador del torneo</strong> para que te entregue el código. Una vez lo tengas:</p>
              <Link to="/restablecer-clave" state={{ email }} className="mt-4 fsc-btn-red px-5 py-3 rounded-md text-sm inline-flex items-center gap-2" data-testid="go-reset-btn">
                Ingresar mi código <ArrowRight size={16}/>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right: hero */}
      <div className="hidden md:flex relative overflow-hidden bg-slate-900 fsc-stripe-blue items-center justify-center order-1 md:order-2">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/90 via-blue-800/60 to-transparent" />
        <div className="relative text-center px-12">
          <img src={FSC_LOGO} alt="FSC" className="h-24 mx-auto bg-white rounded-2xl p-3 shadow-2xl" />
          <h2 className="mt-6 font-display text-4xl font-black uppercase text-white tracking-tighter">Seguridad<br/>en todo momento</h2>
          <p className="mt-3 text-blue-100 max-w-sm mx-auto text-sm">Tu cuenta del torneo está protegida con códigos temporales validados por el organizador.</p>
        </div>
      </div>
    </div>
  );
}
