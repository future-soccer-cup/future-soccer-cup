import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
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
      <div className="flex items-center justify-center p-8 order-2 md:order-1">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Crear cuenta</h1>
          <p className="text-sm text-slate-500 mt-1">Para familias que acompañan a sus jugadores.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre completo</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md" data-testid="register-name-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md" data-testid="register-email-input" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña (mín. 6)</span>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-md" data-testid="register-password-input" />
            </label>
            <button type="submit" disabled={loading} className="fsc-btn-red w-full py-3 rounded-md disabled:opacity-50" data-testid="register-submit-btn">
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="text-blue-700 font-bold">Ingresar</Link></p>
        </div>
      </div>

      <div className="hidden md:flex relative overflow-hidden bg-blue-700 fsc-stripe-blue items-center justify-center order-1 md:order-2">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)` }} />
        <div className="relative text-center px-12">
          <img src={FSC_LOGO} alt="FSC" className="h-32 mx-auto bg-white rounded-2xl p-3" />
          <h2 className="mt-6 font-display text-5xl font-black uppercase text-white tracking-tighter">Únete a FSC</h2>
          <p className="mt-3 text-blue-100 max-w-sm">Reservas, fixture y novedades en un solo lugar.</p>
        </div>
      </div>
    </div>
  );
}
