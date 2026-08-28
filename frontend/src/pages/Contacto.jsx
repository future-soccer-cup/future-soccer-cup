/**
 * Página Contacto — formulario centrado + cancha con palmeras (Iter65).
 * Fondo blanco. Tarjeta con formulario + decoración inferior con cancha (fondo) y
 * palmeras PNG superpuestas a los lados. Todo editable desde CMS.
 * El backend endpoint (POST /api/contact-messages) se mantiene sin cambios.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Mail, Phone, MessageSquare, Send } from "lucide-react";
import api, { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, renderPlaneCrash } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function Contacto() {
  const [cfg, setCfg] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/home-settings").then((r) => setCfg(r.data?.contacto || {})).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Completa los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contact-messages", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      toast.success("¡Mensaje enviado! Te contactaremos pronto.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "No se pudo enviar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  const kicker = cfg.kicker || "déjanos un mensaje";
  const title = cfg.title || "ENVÍANOS TU CONSULTA";

  return (
    <div data-testid="contacto-page" className="relative bg-white min-h-[70vh] pb-40 md:pb-56 overflow-hidden" style={AGENCY_FB}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 relative z-0">
        <form
          onSubmit={submit}
          className="bg-white rounded-xl shadow-2xl p-6 md:p-10 border border-slate-100"
          data-testid="contacto-form"
        >
          <div className="text-center mb-6">
            <div
              className="italic mb-2"
              style={{
                ...CURSIVE,
                color: BLUE,
                fontWeight: 600,
                fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)",
                lineHeight: 1.1,
              }}
              data-testid="contacto-kicker"
            >
              {kicker}
            </div>
            <h1
              className="leading-none"
              style={{
                ...PLANE_CRASH,
                color: "#000000",
                fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
                letterSpacing: "0.02em",
                paddingTop: "0.3em",
              }}
              data-testid="contacto-title"
            >
              {renderPlaneCrash(title)}
            </h1>
            <div className="w-16 h-[3px] mx-auto mt-4 rounded-full" style={{ background: RED }} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={<User size={14} />} label="NOMBRE" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre completo"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none"
                data-testid="contacto-name"
              />
            </Field>
            <Field icon={<Mail size={14} />} label="EMAIL" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none"
                data-testid="contacto-email"
              />
            </Field>
          </div>

          <Field icon={<Phone size={14} />} label="TELÉFONO" className="mt-4">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+57 ..."
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none"
              data-testid="contacto-phone"
            />
          </Field>

          <Field icon={<MessageSquare size={14} />} label="MENSAJE" required className="mt-4">
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos en qué podemos ayudarte..."
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none resize-none"
              data-testid="contacto-message"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 rounded-md text-white flex items-center justify-center gap-3 transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ background: RED, ...PLANE_CRASH, fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)", letterSpacing: "0.08em" }}
            data-testid="contacto-submit"
          >
            <Send size={20} />
            {loading ? renderPlaneCrash("enviando...") : renderPlaneCrash("enviar")}
          </button>
        </form>
      </div>

      {/* Decoración inferior: cancha + palmeras (una sola imagen, superpuesta detrás del formulario) */}
      <FieldWithPalms decorUrl={cfg.field_url} />
    </div>
  );
}


function Field({ icon, label, required, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span style={{ color: RED }}>*</span>}
      </span>
      {children}
    </label>
  );
}


function FieldWithPalms({ decorUrl }) {
  if (!decorUrl) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center z-10 pointer-events-none" data-testid="contacto-decor">
      <img
        src={imgSrc(decorUrl)}
        alt=""
        className="w-full max-w-5xl h-auto"
        data-testid="contacto-field"
      />
    </div>
  );
}
