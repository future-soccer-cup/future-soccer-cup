import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { toast, Toaster } from "sonner";
import { ContactBlock } from "./Nosotros";
import { Send, Mail, Phone, User, MessageSquare } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";

const EMPTY = { name: "", email: "", phone: "", message: "" };

export default function Contacto() {
  const [s, setS] = useState({});
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Completa nombre, email y mensaje");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contact-messages", form);
      toast.success("¡Mensaje enviado! Te contactaremos pronto.");
      setForm(EMPTY);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al enviar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="contacto-page" style={AGENCY_FB}>
      <Toaster position="top-right" />

      {/* Hero */}
      <section className="text-white relative overflow-hidden" style={{ background: "#000000" }}>
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="italic text-2xl" style={{ ...CURSIVE, color: BLUE }}>{s.contacto_hero_kicker || "estamos aquí"}</div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] mt-1" style={PLANE_CRASH} data-testid="contacto-hero-title">
            {planeCrashSafe(s.contacto_hero_title || "CONTACTO")}
          </h1>
          <div className="h-1 w-24 mt-4" style={{ background: BLUE }}/>
          <p className="text-fsc-gris mt-6 max-w-2xl text-lg" style={AGENCY_FB} data-testid="contacto-hero-body">
            {s.contacto_hero_body || "Escríbenos. Te responderemos en menos de 24 horas hábiles."}
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="contact-form-section">
        <form onSubmit={submit} className="bg-white rounded-2xl p-8 lg:p-10 fsc-card-shadow space-y-5" style={{ border: "2px solid #000000" }} data-testid="contact-form">
          <div className="text-center mb-3">
            <div className="italic text-2xl" style={{ ...CURSIVE, color: "#04299e" }}>{s.contacto_form_kicker || "déjanos un mensaje"}</div>
            <h2 className="text-3xl font-black tracking-wide" style={{ ...PLANE_CRASH, color: "#000000" }}>
              {planeCrashSafe(s.contacto_form_title || "ENVIANOS TU CONSULTA")}
            </h2>
            <div className="h-1 w-16 mx-auto mt-2" style={{ background: RED }}/>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field
              label="Nombre"
              icon={<User size={16}/>}
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              required
              placeholder="Tu nombre completo"
              testId="contact-name"
            />
            <Field
              label="Email"
              icon={<Mail size={16}/>}
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
              placeholder="tu@correo.com"
              testId="contact-email"
            />
          </div>
          <Field
            label="Teléfono"
            icon={<Phone size={16}/>}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="+57 ..."
            testId="contact-phone"
          />

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 flex items-center gap-1">
              <MessageSquare size={14}/> Mensaje <span className="text-fsc-rojo">*</span>
            </span>
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos en qué podemos ayudarte..."
              className="mt-1 w-full px-3 py-3 border-2 border-slate-200 rounded-md focus:outline-none focus:border-fsc-azul transition-colors resize-y"
              data-testid="contact-message"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="fsc-btn-red w-full py-3.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="contact-submit"
          >
            {loading ? "Enviando..." : (<><Send size={16}/> ENVIAR</>)}
          </button>
        </form>
      </section>

      <ContactBlock s={s} />
    </div>
  );
}

function Field({ label, icon, type = "text", value, onChange, required, placeholder, testId }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 flex items-center gap-1">
        {icon} {label} {required && <span className="text-fsc-rojo">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-3 border-2 border-slate-200 rounded-md focus:outline-none focus:border-fsc-azul transition-colors"
        data-testid={testId}
      />
    </label>
  );
}
