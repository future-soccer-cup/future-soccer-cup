import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const loc = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(loc.state?.email || params.get("email") || "");
  const [code, setCode] = useState(params.get("code") || "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code: code.trim(), new_password: pw });
      toast.success("Contraseña actualizada. Inicia sesión.");
      setTimeout(() => nav("/login"), 1200);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2 bg-white" data-testid="reset-password-page">
      <Toaster position="top-right" />

      <div className="flex items-center justify-center p-6 md:p-10 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Link to="/login" className="text-xs uppercase tracking-widest font-bold text-blue-700">← Volver a Ingresar</Link>
          <span className="block mt-4 text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Restablecer contraseña</span>
          <h1 className="mt-1 font-display text-5xl font-black uppercase tracking-tighter">Define tu<br/>nueva clave</h1>
          <p className="text-sm text-slate-500 mt-3">Ingresa el código de 8 dígitos que te entregó el administrador y elige tu nueva contraseña.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="reset-email-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Código de recuperación</span>
              <input required value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))} placeholder="Ej. 12345678" inputMode="numeric" className="mt-1 w-full px-3 py-3 border-2 border-slate-200 rounded-md focus:outline-none focus:border-blue-700 font-display text-2xl font-black tracking-[0.4em] text-center tabular-nums" data-testid="reset-code-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nueva contraseña (mín. 6)</span>
              <input required type="password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="reset-pw-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar contraseña</span>
              <input required type="password" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="reset-pw2-input" />
            </label>
            <button type="submit" disabled={loading} className="fsc-btn-red w-full py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50" data-testid="reset-submit-btn">
              {loading ? "Actualizando..." : (<>Restablecer contraseña <ArrowRight size={16}/></>)}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500 text-center">¿No tienes código? <Link to="/recuperar-clave" className="text-blue-700 font-bold">Solicitar uno</Link></p>
        </div>
      </div>

      <div className="hidden lg:flex relative overflow-hidden bg-slate-900 fsc-stripe-blue items-center justify-center order-1 lg:order-2">
        <div className="absolute inset-0 bg-gradient-to-tr from-red-900/80 via-blue-900/60 to-transparent" />
        <div className="relative text-center px-12">
          <ShieldCheck size={64} className="text-white mx-auto mb-4 opacity-80"/>
          <img src={FSC_LOGO} alt="FSC" className="h-20 mx-auto bg-white rounded-2xl p-3 shadow-2xl" />
          <h2 className="mt-6 font-display text-4xl font-black uppercase text-white tracking-tighter">Acceso<br/>verificado</h2>
        </div>
      </div>
    </div>
  );
}
