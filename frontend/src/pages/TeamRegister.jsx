/**
 * Registro de Equipos — Wizard de 3 pasos (Iter67).
 * Diseño según mockups del cliente:
 *   Paso 1 — Datos personales (nombre, rol, email, contraseña, teléfono, documento)
 *   Paso 2 — Datos del club (nombre, teléfono, país, ciudad)
 *   Paso 3 — Identidad + Consentimiento (color, logo, tratamiento de datos)
 *
 * Layout: dos columnas. Izquierda formulario sobre fondo azul (#0640c8) sin card blanca,
 * inputs con fondo semi-transparente + borde blanco. Derecha imagen KOW (CMS
 * home_settings.auth_register_image_url) con fallback placeholder.
 *
 * La lógica de submit y llamada a /api/auth/register-team se mantiene intacta.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError, imgSrc } from "../lib/api";
import { toast, Toaster } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { ConsentBlock } from "./Register";
import { PLANE_CRASH, AGENCY_FB, planeCrashSafe } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

const EMPTY = {
  email: "", password: "", manager_name: "", manager_phone: "", manager_role: "Directivo", manager_document: "",
  club_name: "", club_country: "Colombia", club_city: "", club_phone: "",
  existing_club_id: "",
  color: "#e31f27", data_consent: false,
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
  const [clubs, setClubs] = useState([]);
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const fileRef = useRef(null);
  const { setUser } = useAuth();
  const nav = useNavigate();

  // Cargar clubes aprobados + imágenes CMS.
  useEffect(() => {
    api.get("/clubs").then((r) => {
      const list = (r.data || []).filter((c) => (c.status || "pendiente") === "aprobado");
      setClubs(list);
    }).catch(() => {});
    api.get("/home-settings").then((r) => {
      const d = r.data || {};
      setImgUrl(d.auth_register_image_url || "");
      setHeroBgUrl(d.home_hero_bg_url || "");
    }).catch(() => {});
  }, []);

  const isDirectivo = form.manager_role === "Directivo";
  const isCuerpoTecnico = form.manager_role === "Cuerpo Técnico";
  const totalSteps = isCuerpoTecnico ? 2 : 3;

  const upd = (k, v) => setForm({ ...form, [k]: v });

  // Validación por paso (sin submit).
  const validateStep = () => {
    if (step === 1) {
      if (!form.manager_name.trim()) return "Ingresa tu nombre completo";
      if (!form.email.trim()) return "Ingresa tu correo electrónico";
      if ((form.password || "").length < 6) return "La contraseña debe tener mínimo 6 caracteres";
      if (isCuerpoTecnico && !form.existing_club_id) return "Selecciona el club al que perteneces";
      return null;
    }
    if (step === 2 && isDirectivo) {
      if (!form.club_name.trim()) return "Indica el nombre del club";
      if (!form.club_city.trim()) return "Indica la ciudad del club";
      return null;
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.data_consent) return toast.error("Debes aceptar la política de datos");
    if (isCuerpoTecnico && !form.existing_club_id) return toast.error("Selecciona el club al que perteneces");
    if (isDirectivo && !(form.club_name || "").trim()) return toast.error("Indica el nombre del club");
    setLoading(true);
    try {
      const payload = { ...form };
      if (isCuerpoTecnico) {
        const sel = clubs.find((c) => c.id === form.existing_club_id);
        payload.club_name = sel?.name || "";
        payload.club_city = sel?.city || payload.club_city || "";
        payload.club_country = sel?.country || payload.club_country || "Colombia";
      } else {
        payload.existing_club_id = "";
      }
      const reg = await api.post("/auth/register-team", payload);
      setUser(reg.data);

      if (logoFile && reg.data.team_id && isDirectivo) {
        try {
          const fd = new FormData();
          fd.append("file", logoFile);
          const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
          await api.put(`/teams/${reg.data.team_id}`, { name: "_skip", logo_url: up.data.url });
        } catch (e2) {
          console.error("[TeamRegister] logo upload failed (non-fatal)", e2);
          toast.warning("El logo no se pudo subir. Podrás cargarlo más tarde desde 'Mi club'.");
        }
      }

      toast.success(isCuerpoTecnico
        ? "Cuenta creada. Acceso disponible cuando el Directivo apruebe el club."
        : "Club registrado. Espera la aprobación del administrador para acceder al panel.");
      nav(reg.data.team_id ? "/mi-equipo" : "/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-[3fr_2fr]" data-testid="team-register-page" style={AGENCY_FB}>
      {/* Columna izquierda — Formulario */}
      <div className="relative overflow-y-auto" style={{ background: BLUE, maxHeight: "calc(100vh - 4rem)" }}>
        {/* Watermark hero opcional */}
        {heroBgUrl && (
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <img src={imgSrc(heroBgUrl)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <Toaster richColors position="top-right" />

        <div className="relative max-w-4xl mx-auto px-8 sm:px-14 py-10 md:py-14 text-white">
          <Link to="/login" className="text-xs uppercase tracking-widest font-bold text-white/80 hover:text-white flex items-center gap-1" data-testid="tr-back-login">
            <ArrowLeft size={14}/> Volver
          </Link>

          {/* Título */}
          <div className="mt-8" style={{ ...PLANE_CRASH, color: "#ffffff", fontSize: "clamp(2.6rem, 5.8vw, 4.6rem)", lineHeight: 0.95 }}>
            {planeCrashSafe("se parte del")}
          </div>
          <div className="italic -mt-1" style={{ fontFamily: "'Dancing Script', 'Allura', cursive", color: "#ffffff", fontWeight: 700, fontSize: "clamp(2.8rem, 5.8vw, 4.4rem)", lineHeight: 1 }} data-testid="tr-title">
            team fsc
          </div>
          <div className="h-1 w-20 bg-fsc-rojo mt-4"/>

          {/* Stepper */}
          <Stepper current={step} total={totalSteps} />

          {/* Contenido del paso */}
          <form onSubmit={submit} className="mt-8 space-y-7">
            {step === 1 && (
              <StepPersonal
                form={form}
                upd={upd}
                showPw={showPw}
                setShowPw={setShowPw}
                isCuerpoTecnico={isCuerpoTecnico}
                clubs={clubs}
              />
            )}
            {step === 2 && isDirectivo && (
              <StepClub form={form} upd={upd} />
            )}
            {step === totalSteps && (
              <StepIdentity
                form={form}
                upd={upd}
                logoFile={logoFile}
                setLogoFile={setLogoFile}
                fileRef={fileRef}
                isDirectivo={isDirectivo}
              />
            )}

            {/* Navegación */}
            <div className="pt-6 flex items-center justify-between gap-3 flex-wrap">
              {step > 1 ? (
                <button type="button" onClick={prev} className="px-6 py-3 rounded-md border border-white/40 text-white hover:bg-white/10 transition flex items-center gap-2 text-sm" data-testid="tr-prev">
                  <ArrowLeft size={18}/> Anterior
                </button>
              ) : <span/>}

              {step < totalSteps ? (
                <button type="button" onClick={next} className="px-8 py-3 rounded-md bg-white transition-transform hover:scale-105 flex items-center gap-2" style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "1.05rem" }} data-testid="tr-next">
                  {planeCrashSafe("siguiente")} <ArrowRight size={18}/>
                </button>
              ) : (
                <button type="submit" disabled={loading || !form.data_consent} className="px-8 py-3 rounded-md bg-white transition-transform hover:scale-105 disabled:opacity-50 flex items-center gap-2" style={{ ...PLANE_CRASH, color: RED, letterSpacing: "0.05em", fontSize: "1.05rem" }} data-testid="tr-submit">
                  {planeCrashSafe(loading ? "registrando..." : "registrarme")} <ArrowRight size={18}/>
                </button>
              )}
            </div>
          </form>

          {/* Enlace secundario */}
          <div className="mt-10 text-white/80 text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-black underline hover:text-white" data-testid="tr-to-login">
              INICIA SESIÓN
            </Link>
          </div>
        </div>
      </div>

      {/* Columna derecha — Imagen KOW */}
      <div className="relative hidden md:block" style={{ background: "#0a1030" }} data-testid="tr-image-side">
        {imgUrl ? (
          <img src={imgSrc(imgUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm" style={AGENCY_FB}>
            Imagen no configurada
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Componentes ---------- */

function Stepper({ current, total }) {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="mt-10 mb-4 flex items-center gap-3" data-testid="tr-stepper">
      {items.map((n, idx) => {
        const isActive = n === current;
        const isDone = n < current;
        return (
          <div key={n} className="flex items-center gap-3 flex-1">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-black transition-all ${isActive ? "scale-110 shadow-lg" : ""}`}
              style={{
                background: isActive ? "#ffffff" : isDone ? RED : "rgba(255,255,255,0.15)",
                color: isActive ? RED : "#ffffff",
                border: isActive ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.3)",
                fontSize: isActive ? "1.5rem" : "1.15rem",
              }}
              data-testid={`tr-step-dot-${n}`}
            >
              {isDone ? <Check size={22} /> : n}
            </div>
            {idx < items.length - 1 && (
              <div className="flex-1 h-1 rounded" style={{ background: n < current ? RED : "rgba(255,255,255,0.3)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepPersonal({ form, upd, showPw, setShowPw, isCuerpoTecnico, clubs }) {
  return (
    <div data-testid="section-personal" className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldDark label="Nombre completo" required value={form.manager_name} onChange={(v) => upd("manager_name", v)} testId="tr-manager" />
        <label className="block">
          <LabelDark text="Rol" required />
          <select
            value={form.manager_role}
            onChange={(e) => upd("manager_role", e.target.value)}
            className="mt-2 w-full px-4 py-3.5 rounded-md text-white text-base focus:outline-none focus:ring-2 focus:ring-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
            data-testid="tr-manager-role"
          >
            <option value="Directivo" style={{ color: "#000" }}>Directivo</option>
            <option value="Cuerpo Técnico" style={{ color: "#000" }}>Cuerpo Técnico</option>
          </select>
        </label>
        <FieldDark label="Correo electrónico" required type="email" value={form.email} onChange={(v) => upd("email", v)} testId="tr-email" />
        <label className="block">
          <LabelDark text="Contraseña (mín. 6)" required />
          <div className="relative mt-2">
            <input
              type={showPw ? "text" : "password"}
              required
              value={form.password || ""}
              onChange={(e) => upd("password", e.target.value)}
              className="w-full px-4 py-3.5 pr-12 rounded-md text-white text-base placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
              data-testid="tr-password"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 p-1" aria-label="Mostrar contraseña">
              {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <FieldDark label="Teléfono" value={form.manager_phone} onChange={(v) => upd("manager_phone", v)} testId="tr-manager-phone" />
        <FieldDark label="Documento" value={form.manager_document} onChange={(v) => upd("manager_document", v)} testId="tr-manager-doc" />
      </div>

      {isCuerpoTecnico && (
        <div className="mt-3 p-5 rounded-md" style={{ background: "rgba(255,255,255,0.1)", borderLeft: `4px solid ${RED}` }}>
          <p className="text-sm text-white/90 mb-3">Como <strong>Cuerpo Técnico</strong> debes pertenecer a un club ya registrado. Selecciónalo:</p>
          <label className="block">
            <LabelDark text="Club al que perteneces" required />
            <select
              required
              value={form.existing_club_id}
              onChange={(e) => upd("existing_club_id", e.target.value)}
              className="mt-2 w-full px-4 py-3.5 rounded-md text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-white"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
              data-testid="tr-existing-club"
            >
              <option value="" style={{ color: "#000" }}>— Selecciona tu club —</option>
              {clubs.length === 0 && <option disabled style={{ color: "#000" }}>No hay clubes aprobados todavía</option>}
              {clubs.map((c) => (
                <option key={c.id} value={c.id} style={{ color: "#000" }}>{c.name} {c.city ? `· ${c.city}` : ""}</option>
              ))}
            </select>
            <span className="text-xs text-white/60 mt-2 block">Solo se muestran clubes ya aprobados por el administrador.</span>
          </label>
        </div>
      )}
    </div>
  );
}

function StepClub({ form, upd }) {
  return (
    <div data-testid="section-club" className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldDark label="Nombre del club" required value={form.club_name} onChange={(v) => upd("club_name", v)} testId="tr-club-name" />
        <FieldDark label="Teléfono club" value={form.club_phone} onChange={(v) => upd("club_phone", v)} testId="tr-club-phone" />
        <label className="block">
          <LabelDark text="País" required />
          <select
            required
            value={form.club_country}
            onChange={(e) => upd("club_country", e.target.value)}
            className="mt-2 w-full px-4 py-3.5 rounded-md text-white text-base focus:outline-none focus:ring-2 focus:ring-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
            data-testid="tr-club-country"
          >
            {COUNTRIES.map((c) => <option key={c} value={c} style={{ color: "#000" }}>{c}</option>)}
          </select>
        </label>
        <FieldDark label="Ciudad" required value={form.club_city} onChange={(v) => upd("club_city", v)} testId="tr-club-city" />
      </div>
    </div>
  );
}

function StepIdentity({ form, upd, logoFile, setLogoFile, fileRef, isDirectivo }) {
  return (
    <div data-testid="section-identity" className="space-y-6">
      {isDirectivo && (
        <>
          <label className="block">
            <LabelDark text="Color principal" />
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => upd("color", e.target.value)}
                className="w-20 h-14 rounded-md cursor-pointer bg-transparent border border-white/35"
                data-testid="tr-color"
              />
              <div
                className="flex-1 h-14 rounded-md flex items-center px-5 text-white text-base font-semibold"
                style={{ background: form.color, border: "1px solid rgba(255,255,255,0.35)" }}
              >
                {form.color?.toUpperCase()}
              </div>
            </div>
          </label>

          <div>
            <LabelDark text="Logo / escudo del club" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full border-2 border-dashed border-white/40 hover:border-white rounded-md px-5 py-6 flex items-center gap-3 text-base text-white/90 transition"
              style={{ background: "rgba(255,255,255,0.08)" }}
              data-testid="tr-logo-btn"
            >
              <Upload size={20}/>
              {logoFile ? <span className="truncate">{logoFile.name}</span> : <span>Seleccionar imagen (PNG/JPG)</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setLogoFile(e.target.files?.[0] || null)} data-testid="tr-logo" />
          </div>
        </>
      )}

      {/* Consentimiento */}
      <div className="rounded-md p-5" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
        <ConsentBlockDark checked={form.data_consent} onChange={(v) => upd("data_consent", v)} />
      </div>
    </div>
  );
}

/* Consent block versión dark (aprovecha el mismo copy de ConsentBlock) */
function ConsentBlockDark({ checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer" data-testid="tr-consent">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 accent-white flex-shrink-0"
      />
      <span className="text-sm text-white/90 leading-relaxed">
        <span className="font-black uppercase tracking-wider block mb-1 text-base" style={PLANE_CRASH}>
          {planeCrashSafe("tratamiento de datos y uso de imagen")} *
        </span>
        Acepto el tratamiento de mis datos personales y el uso de imagen (fotografías y video)
        durante los eventos organizados por FUTURE SOCCER CUP, conforme a la política de privacidad.
        Los datos serán utilizados para gestión deportiva, comunicación institucional y difusión oficial.
      </span>
    </label>
  );
}

function LabelDark({ text, required }) {
  return (
    <span className="text-white text-sm tracking-widest flex items-center gap-1" style={PLANE_CRASH}>
      {planeCrashSafe(text)} {required && <span style={{ color: RED }}>*</span>}
    </span>
  );
}

function FieldDark({ label, value, onChange, required, type = "text", placeholder, testId }) {
  return (
    <label className="block">
      <LabelDark text={label} required={required} />
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3.5 rounded-md text-white text-base placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white"
        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)" }}
        data-testid={testId}
      />
    </label>
  );
}
