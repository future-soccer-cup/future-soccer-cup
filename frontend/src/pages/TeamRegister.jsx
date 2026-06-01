import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, FSC_LOGO } from "../lib/api";
import { toast, Toaster } from "sonner";
import { Upload, ArrowRight } from "lucide-react";
import { ConsentBlock } from "./Register";

const EMPTY = {
  email: "", password: "", manager_name: "", manager_phone: "", manager_role: "Directivo", manager_document: "",
  club_name: "", club_country: "Colombia", club_city: "", club_phone: "",
  color: "#0640c8", data_consent: false,
};

const COUNTRIES = [
  "Colombia", "Argentina", "Bolivia", "Brasil", "Chile", "Costa Rica", "Ecuador",
  "El Salvador", "España", "Estados Unidos", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Puerto Rico", "República Dominicana",
  "Uruguay", "Venezuela", "Otro",
];

export default function TeamRegister() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const fileRef = useRef(null);
  const { setUser } = useAuth();
  const nav = useNavigate();

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.data_consent) return toast.error("Debes aceptar la política de datos");
    setLoading(true);
    try {
      // El payload ya NO incluye event_type/birth_year — solo registramos el club.
      const payload = { ...form };
      const reg = await api.post("/auth/register-team", payload);
      setUser(reg.data);

      if (logoFile && reg.data.team_id) {
        try {
          const fd = new FormData();
          fd.append("file", logoFile);
          const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
          await api.put(`/teams/${reg.data.team_id}`, { name: "_skip", logo_url: up.data.url });
        } catch (e2) {
          console.error("[TeamRegister] logo upload failed (non-fatal)", e2);
          toast.warning("El logo no se pudo subir. Podrás cargarlo más tarde desde 'Mi equipo'.");
        }
      }

      toast.success("Club registrado. Espera la aprobación del administrador para acceder al panel.");
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/login" className="text-xs uppercase tracking-widest font-bold text-fsc-azul-oscuro hover:text-fsc-azul">← Volver</Link>
        <div className="mt-4 font-cursive text-2xl text-fsc-azul-oscuro">crea tu cuenta</div>
        <h1 className="mt-1 font-display text-5xl md:text-6xl tracking-wider text-fsc-negro">REGISTRA TU CLUB</h1>
        <div className="h-1 w-16 bg-fsc-rojo mt-3 mb-4"/>
        <p className="text-sm text-slate-600 mt-2 max-w-xl">Crea tu cuenta de director técnico, registra tu club y tu primer equipo. Después podrás agregar más equipos (otros años o A/B) desde "Mi equipo".</p>

        <form onSubmit={submit} className="mt-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* DT */}
            <Section title="Datos del director técnico" testId="section-dt">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nombre completo" required value={form.manager_name} onChange={(v) => upd("manager_name", v)} testId="tr-manager" />
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rol</span>
                  <select value={form.manager_role} onChange={(e) => upd("manager_role", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="tr-manager-role">
                    <option value="Directivo">Directivo</option>
                    <option value="Cuerpo Técnico">Cuerpo Técnico</option>
                  </select>
                </label>
                <Field label="Correo electrónico" required type="email" value={form.email} onChange={(v) => upd("email", v)} testId="tr-email" />
                <Field label="Contraseña (mín. 6)" required type="password" value={form.password} onChange={(v) => upd("password", v)} testId="tr-password" />
                <Field label="Teléfono" value={form.manager_phone} onChange={(v) => upd("manager_phone", v)} testId="tr-manager-phone" />
                <Field label="Documento" value={form.manager_document} onChange={(v) => upd("manager_document", v)} testId="tr-manager-doc" />
              </div>
            </Section>

            {/* Club */}
            <Section title="Datos del club" testId="section-club">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nombre del club" required value={form.club_name} onChange={(v) => upd("club_name", v)} testId="tr-club-name" />
                <Field label="Teléfono del club" value={form.club_phone} onChange={(v) => upd("club_phone", v)} testId="tr-club-phone" />
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">País <span className="text-fsc-rojo">*</span></span>
                  <select required value={form.club_country} onChange={(e) => upd("club_country", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="tr-club-country">
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <Field label="Ciudad" required value={form.club_city} onChange={(v) => upd("club_city", v)} testId="tr-club-city" />
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Color principal</span>
                  <input type="color" value={form.color} onChange={(e) => upd("color", e.target.value)} className="mt-1 w-full h-10 px-1 border border-slate-200 rounded-md" />
                </label>
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Logo / escudo del club</span>
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 w-full border-2 border-dashed border-slate-300 hover:border-fsc-azul rounded-md px-4 py-3 flex items-center gap-3 text-sm text-slate-600">
                  <Upload size={16}/>
                  {logoFile ? <span className="truncate">{logoFile.name}</span> : <span>Seleccionar imagen (PNG/JPG)</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setLogoFile(e.target.files?.[0] || null)} data-testid="tr-logo" />
              </div>
            </Section>

            {/* Sección Evento eliminada — el club se registra sin asociar a un evento específico.
                 Después de la aprobación, el admin/DT podrá inscribir equipos a eventos desde el panel. */}

            <ConsentBlock checked={form.data_consent} onChange={(v) => upd("data_consent", v)} testId="tr-consent" />

            <button type="submit" disabled={loading || !form.data_consent} className="fsc-btn-red w-full py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50" data-testid="tr-submit">
              {loading ? "Registrando..." : (<>Solicitar registro de club <ArrowRight size={16}/></>)}
            </button>
          </div>

          {/* Side summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-fsc-negro text-white rounded-2xl p-6 border-2 border-fsc-azul">
              <img src={FSC_LOGO} alt="FSC" className="h-16 bg-fsc-negro border border-fsc-azul rounded-xl p-1.5" />
              <div className="mt-4 text-xs uppercase tracking-[0.25em] text-fsc-azul">Resumen</div>
              <div className="mt-2 space-y-2 text-sm">
                <Row k="Club" v={form.club_name || "—"} />
                <Row k="País" v={form.club_country || "—"} />
                <Row k="Ciudad" v={form.club_city || "—"} />
                <Row k="Responsable" v={form.manager_name || "—"} />
                <Row k="Rol" v={form.manager_role || "—"} />
              </div>
              <div className="mt-5 pt-4 border-t border-fsc-azul/30 text-xs text-fsc-gris/80 leading-relaxed">
                Después de aprobar tu cuenta, podrás inscribir tus equipos a los eventos y configurar categorías desde el panel.
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Section({ title, testId, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6" data-testid={testId}>
      <h2 className="font-display text-2xl font-black uppercase tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder, testId }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input required={required} type={type} placeholder={placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid={testId} />
    </label>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{k}</span>
      <span className="font-semibold text-right truncate">{v}</span>
    </div>
  );
}
