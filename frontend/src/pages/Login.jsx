import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";

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
    <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2 bg-white" data-testid="login-page">
      <Toaster position="top-right" />
      <div className="hidden md:flex relative overflow-hidden bg-slate-900 fsc-stripe-blue items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(https://images.pexels.com/photos/32694240/pexels-photo-32694240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)` }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/80 to-slate-900/30" />
        <div className="relative text-center px-12">
          <img src={FSC_LOGO} alt="FSC" className="h-32 mx-auto" />
          <h2 className="mt-6 font-display text-5xl font-black uppercase text-white tracking-tighter">Vive el torneo</h2>
          <p className="mt-3 text-slate-300 max-w-sm">Reserva tu estadía y sigue cada partido de tu equipo.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Ingresar</h1>
          <p className="text-sm text-slate-500 mt-1">Accede a tu cuenta para gestionar reservas.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="login-email-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña</span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="login-password-input" />
            </label>
            <button type="submit" disabled={loading} className="fsc-btn-primary w-full py-3 rounded-md disabled:opacity-50" data-testid="login-submit-btn">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">¿No tienes cuenta? <Link to="/registro" className="text-blue-700 font-bold">Crear cuenta familiar</Link></p>
          <p className="mt-1 text-sm text-slate-500">¿Eres club o coach? <Link to="/registro-equipo" className="text-red-600 font-bold">Registrar equipo</Link></p>
        </div>
      </div>
    </div>
  );
}
