import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import CategorySelect from "../components/CategorySelect";
import { Upload } from "lucide-react";
import { ConsentBlock } from "./Register";

const EMPTY = {
  email: "", password: "", manager_name: "",
  team_name: "", category: "", coach: "", city: "",
  color: "#1d4ed8", event_type: "", data_consent: false,
};

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function TeamRegister() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [events, setEvents] = useState([]);
  const fileRef = useRef(null);
  const { setUser } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/event-types").then((r) => setEvents(r.data.events || [])).catch(() => {});
  }, []);

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const selectedEvent = events.find((e) => e.id === form.event_type);
  const eventCategories = selectedEvent?.categories || [];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.event_type) {
      toast.error("Selecciona el evento");
      return;
    }
    if (!form.data_consent) {
      toast.error("Debes aceptar la política de datos");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Create the team and login
      const reg = await api.post("/auth/register-team", form);
      setUser(reg.data);

      // Step 2: If logo selected, upload it and update the team
      if (logoFile) {
        try {
          const fd = new FormData();
          fd.append("file", logoFile);
          const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
          await api.put(`/teams/${reg.data.team_id}`, {
            name: form.team_name,
            category: form.category,
            coach: form.coach || "",
            city: form.city || "",
            logo_url: up.data.url,
            color: form.color,
          });
        } catch (uploadErr) {
          toast.warning("Equipo creado. El logo se podrá subir desde Mi equipo.");
        }
      }

      toast.success("Equipo registrado. Paga la inscripción para completar tu participación.");
      nav("/mi-equipo");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white" data-testid="team-register-page">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-600">Para clubes / coaches</span>
          <h1 className="font-display text-5xl font-black uppercase tracking-tighter">Registra<br/>tu equipo.</h1>
          <p className="mt-4 text-slate-600">
            Crea tu club en FSC, sube el escudo, gestiona tu plantilla por categoría y luego cotiza el evento (Festival, Premier Par o Premier Impar).
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">1</span> Registra el club + responsable + escudo.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">2</span> Carga la plantilla con foto del jugador.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">3</span> Cotiza el evento que vas a jugar.</p>
            <p className="flex items-start gap-2"><span className="font-display text-2xl text-blue-700 leading-none">4</span> El admin aprueba y se activa tu participación.</p>
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
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Evento</h2>
            <p className="text-xs text-slate-500 mt-1">Elige el evento en el que participará tu equipo. El fee de inscripción se cobrará al finalizar el registro.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              {events.map((ev) => (
                <label key={ev.id} className={`cursor-pointer border-2 rounded-xl p-4 transition-colors ${form.event_type === ev.id ? "border-red-600 bg-red-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`event-option-${ev.id}`}>
                  <input type="radio" name="event_type" className="hidden" value={ev.id} checked={form.event_type === ev.id} onChange={() => setForm({ ...form, event_type: ev.id, category: eventCategories.includes(form.category) ? form.category : "" })} />
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Evento</div>
                  <div className="font-display text-xl font-black uppercase tracking-tight">{ev.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ev.description}</div>
                  <div className="mt-3 font-display text-2xl font-black text-red-600 tabular-nums">{fmtCOP(ev.registration_fee_per_team)}<span className="text-xs text-slate-400 font-bold ml-1">COP</span></div>
                  <div className="text-[10px] text-slate-400 mt-1">Categorías: {ev.categories.join(", ")}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Datos del equipo</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Nombre del equipo" required value={form.team_name} onChange={(v) => upd("team_name", v)} testId="tr-team-name" />
              <CategorySelect required value={form.category} onChange={(v) => upd("category", v)} testId="tr-category" allowed={selectedEvent ? eventCategories : null} />
              <Field label="Director técnico" value={form.coach} onChange={(v) => upd("coach", v)} testId="tr-coach" />
              <Field label="Ciudad" value={form.city} onChange={(v) => upd("city", v)} testId="tr-city" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Color principal</span>
                <input type="color" value={form.color} onChange={(e) => upd("color", e.target.value)} className="mt-1 w-full h-10 px-1 border border-slate-200 rounded-md" />
              </label>
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Escudo del club</span>
              <div className="mt-2 flex items-center gap-4">
                {previewUrl ? (
                  <img src={previewUrl} alt="Logo" className="h-20 w-20 rounded-md object-cover border-2 border-slate-200" />
                ) : (
                  <div className="h-20 w-20 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs text-center px-2">
                    Sin logo
                  </div>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-xs font-bold uppercase tracking-wide rounded-md flex items-center gap-2" data-testid="tr-logo-pick">
                  <Upload size={14}/> {logoFile ? "Cambiar" : "Elegir archivo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setLogoFile(e.target.files?.[0] || null)} data-testid="tr-logo-input" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">PNG/JPG hasta 5MB. Se subirá automáticamente al crear el equipo.</p>
            </div>
          </div>

          <ConsentBlock checked={form.data_consent} onChange={(v) => upd("data_consent", v)} testId="tr-consent" />

          <button type="submit" disabled={loading || !form.data_consent} className="fsc-btn-red w-full py-3 rounded-md disabled:opacity-50" data-testid="tr-submit">
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
