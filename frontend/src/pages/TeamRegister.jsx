import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import CategorySelect from "../components/CategorySelect";
import ImageUpload from "../components/ImageUpload";

const EMPTY = {
  email: "", password: "", manager_name: "",
  team_name: "", category: "", coach: "", city: "",
  logo_url: "", color: "#1d4ed8",
};

export default function TeamRegister() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const nav = useNavigate();

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register-team", form);
      setUser(res.data);
      toast.success("Equipo registrado");
      nav("/mi-equipo");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white" data-testid="team-register-page">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-600">Para clubes / coaches</span>
          <h1 className="font-display text-5xl font-black uppercase tracking-tighter">Registra<br/>tu equipo.</h1>
          <p className="mt-4 text-slate-600">
            Crea tu club en FSC, gestiona tu plantilla, sube tu escudo, programa categorías por edad y mantén actualizado el roster de jugadores.
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">1</span> Registra el club y el responsable.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">2</span> Carga el escudo y los datos del equipo.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">3</span> Agrega cada jugador con foto y dorsal.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">4</span> El admin del torneo programa los partidos.</p>
          </div>
          <img src={FSC_LOGO} alt="FSC" className="mt-8 h-24 opacity-90" />
        </div>

        <form onSubmit={submit} className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 fsc-card-shadow">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Datos del responsable</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre del responsable" required value={form.manager_name} onChange={(v) => upd("manager_name", v)} testId="tr-manager" />
            <Field label="Correo" required type="email" value={form.email} onChange={(v) => upd("email", v)} testId="tr-email" />
            <Field label="Contraseña (mín. 6)" required type="password" minLength={6} value={form.password} onChange={(v) => upd("password", v)} testId="tr-password" />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Datos del equipo</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Nombre del equipo" required value={form.team_name} onChange={(v) => upd("team_name", v)} testId="tr-team-name" />
              <CategorySelect required value={form.category} onChange={(v) => upd("category", v)} testId="tr-category" />
              <Field label="Director técnico" value={form.coach} onChange={(v) => upd("coach", v)} testId="tr-coach" />
              <Field label="Ciudad" value={form.city} onChange={(v) => upd("city", v)} testId="tr-city" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Color principal</span>
                <input type="color" value={form.color} onChange={(e) => upd("color", e.target.value)} className="mt-1 w-full h-10 px-1 border border-slate-200 rounded-md" />
              </label>
            </div>
            <div className="mt-3">
              <ImageUpload value={form.logo_url} onChange={(v) => upd("logo_url", v)} label="Escudo del equipo" testId="tr-logo-upload" />
              <p className="text-[11px] text-slate-400 mt-1">Para subir imagen necesitas iniciar sesión primero. También puedes editar luego desde "Mi equipo".</p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="fsc-btn-red w-full py-3 rounded-md disabled:opacity-50" data-testid="tr-submit">
            {loading ? "Registrando..." : "Registrar equipo"}
          </button>
          <p className="text-sm text-slate-500 text-center">¿Ya tienes equipo? <Link to="/login" className="text-blue-700 font-bold">Ingresar</Link></p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", minLength, testId }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input required={required} type={type} minLength={minLength} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid={testId} />
    </label>
  );
}
