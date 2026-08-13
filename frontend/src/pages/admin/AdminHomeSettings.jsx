import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { Save, Home as HomeIcon, Trophy, Info, Phone, Image as ImageIcon, Hash, MapPin, Flag } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";
import ImageListUpload from "../../components/ImageListUpload";

const EMPTY = {
  // Navbar
  nav_logo_url: "",
  nav_shield_url: "",
  // Hero (wireframe FSC v2)
  hero_edition_label: "EDICIÓN",
  hero_edition_year: "2026",
  hero_month_1: "Octubre",
  hero_month_2: "Diciembre",
  hero_image_url: "",
  hero_foreground_url: "",
  hero_foreground_urls: [],
  // Stats (4 columnas)
  stat_1_number: "11",   stat_1_label: "Ediciones",
  stat_2_number: "+1K",  stat_2_label: "Clubes participantes",
  stat_3_number: "+100", stat_3_label: "Clubes internacionales",
  stat_4_number: "+10K", stat_4_label: "Deportistas",
  // Finales
  finales_subtitle: "Estadio Centenario de Armenia",
  finales_button_label: "Conoce más de FSC",
  finales_button_url: "/nosotros",
  // Región / mascota
  region_title: "EL EJE CAFETERO LOS ESPERA",
  region_subtitle: "Comfenalco Soleden",
  mascot_image_url: "",
  // Festival / Premier
  festival_logo_url: "",
  festival_date_badge: "2 OCT",
  festival_title: "FESTIVAL",
  festival_categories: "",
  festival_cta_url: "/registro-equipo",
  premier_logo_url: "",
  premier_date_badge: "2 OCT",
  premier_title: "PREMIER",
  premier_categories_par: "",
  premier_categories_imp: "",
  premier_cta_url: "/registro-equipo",
  // Footer / contacto
  contact_email: "",
  contact_phone: "",
  instagram: "",
  facebook: "",
  youtube: "",
  whatsapp_url: "",
  footer_heading: "¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?",
  // Legacy / Nosotros (mantener compat)
  hero_title: "Future Soccer Cup",
  hero_subtitle: "La cumbre del fútbol formativo infantil & juvenil.",
  hero_cta_label: "Inscribe tu equipo",
  hero_cta_url: "/registro-equipo",
  upcoming_name: "", upcoming_city: "", upcoming_venue: "",
  upcoming_start_date: "", upcoming_end_date: "",
  upcoming_categories: "", upcoming_cover_url: "",
  about_title: "Somos más que un torneo",
  about_body: "",
  about_image_url: "",
  // Páginas secundarias
  nosotros_hero_kicker: "conócenos",
  nosotros_hero_title: "NOSOTROS",
  nosotros_hero_body: "",
  nosotros_hero_bg_url: "",
  nosotros_hero_overlay: "blue",
  nosotros_mission_kicker: "misión",
  nosotros_mission_body: "",
  nosotros_pill_1_title: "Reglamento claro", nosotros_pill_1_body: "Fair play como primer ítem de desempate.",
  nosotros_pill_2_title: "4 partidos mínimo", nosotros_pill_2_body: "Cuadrangulares + intergrupos.",
  nosotros_pill_3_title: "Datos en vivo",    nosotros_pill_3_body: "Posiciones y goleadores actualizados.",
  nosotros_pill_4_title: "Familia FSC",      nosotros_pill_4_body: "Hospedaje, transporte, tours.",
  eventos_hero_kicker: "temporada",
  eventos_hero_title: "EVENTOS",
  eventos_hero_body: "",
  eventos_hero_bg_url: "",
  eventos_hero_overlay: "red",
  contacto_hero_kicker: "estamos aquí",
  contacto_hero_title: "CONTACTO",
  contacto_hero_body: "",
  contacto_hero_bg_url: "",
  contacto_hero_overlay: "blue",
  contacto_form_kicker: "déjanos un mensaje",
  contacto_form_title: "ENVÍANOS TU CONSULTA",
  noticias_hero_kicker: "novedades",
  noticias_hero_title: "NOTICIAS",
  noticias_hero_body: "",
  estadisticas_hero_kicker: "torneo en vivo",
  estadisticas_hero_title: "ESTADÍSTICAS",
  estadisticas_hero_body: "",
  estadisticas_hero_bg_url: "",
  estadisticas_hero_overlay: "blue",
  hablemos_kicker: "contáctanos",
  hablemos_title: "HABLEMOS",
};

// Helpers para convertir entre lista (CSV) y arrays
const arrToCsv = (v) => Array.isArray(v) ? v.join(", ") : (v || "");
const csvToArr = (v) => String(v || "").split(",").map(x => x.trim()).filter(Boolean);

export default function AdminHomeSettings() {
  const [s, setS] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/home-settings");
      const d = r.data || {};
      setS({
        ...EMPTY,
        ...d,
        festival_categories: arrToCsv(d.festival_categories),
        premier_categories_par: arrToCsv(d.premier_categories_par),
        premier_categories_imp: arrToCsv(d.premier_categories_imp),
      });
    } catch {
      toast.error("Error al cargar configuración");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...s,
        festival_categories: csvToArr(s.festival_categories),
        premier_categories_par: csvToArr(s.premier_categories_par),
        premier_categories_imp: csvToArr(s.premier_categories_imp),
      };
      await api.put("/home-settings", payload);
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const upd = (k, v) => setS(prev => ({ ...prev, [k]: v }));

  return (
    <div data-testid="admin-home-settings">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-fsc-negro">CONFIGURACIÓN DEL HOME</h1>
          <p className="text-sm text-slate-500 mt-1">Edita todos los textos e imágenes que aparecen en la página principal pública.</p>
        </div>
        <button onClick={save} disabled={saving} className="fsc-btn-primary px-6 py-3 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid="home-settings-save">
          <Save size={16}/> {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <Section title="Navbar (logo + escudo)" icon={<ImageIcon size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <ImageUpload value={s.nav_shield_url} onChange={(v) => upd("nav_shield_url", v)} label="Escudo / logo circular (a la izquierda del wordmark)" hint="Recomendado: PNG con fondo transparente, cuadrado 512×512 px (o 1:1). Peso ideal < 300 KB. Se renderiza a 64–80 px de alto." testId="nav-shield-upload" />
          <ImageUpload value={s.nav_logo_url} onChange={(v) => upd("nav_logo_url", v)} label="Wordmark / logo en imagen (opcional, visible en ≥lg)" hint="Recomendado: PNG con fondo transparente, formato horizontal 1200×400 px (3:1). Peso ideal < 500 KB. Se renderiza a 48–64 px de alto." testId="nav-logo-upload" />
        </div>
      </Section>

      <Section title="Ingreso / Registro — Imágenes" icon={<ImageIcon size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <ImageUpload value={s.auth_login_image_url} onChange={(v) => upd("auth_login_image_url", v)} label="Imagen de la página INGRESO (lado derecho de la card roja)" hint="Recomendado: JPG vertical con KOW en el estadio, 800×1000 px. Se recorta cover." testId="auth-login-upload" />
          <ImageUpload value={s.auth_register_image_url} onChange={(v) => upd("auth_register_image_url", v)} label="Imagen de la página REGISTRO (columna derecha, fondo fijo)" hint="Recomendado: JPG vertical con KOW + jugador, 800×1200 px. Se recorta cover." testId="auth-register-upload" />
        </div>
      </Section>

      <Section title="Hero — Edición & fechas" icon={<HomeIcon size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Etiqueta de edición (ej: EDICIÓN)" v={s.hero_edition_label} onChange={(v) => upd("hero_edition_label", v)} />
          <Field label="Año (ej: 2026)" v={s.hero_edition_year} onChange={(v) => upd("hero_edition_year", v)} />
          <Field label="Badge fecha 1 (ej: Octubre)" v={s.hero_month_1} onChange={(v) => upd("hero_month_1", v)} />
          <Field label="Badge fecha 2 (ej: Diciembre)" v={s.hero_month_2} onChange={(v) => upd("hero_month_2", v)} />
        </div>
      </Section>

      <Section title="Hero — Imágenes" icon={<ImageIcon size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <ImageUpload value={s.hero_image_url} onChange={(v) => upd("hero_image_url", v)} label="Imagen de fondo (estadio/gradas, se tiñe con overlay)" hint="Recomendado: JPG/WEBP horizontal 1920×1080 px (16:9), alta calidad. Peso ideal < 1 MB. Se recorta tipo cover y recibe overlay azul+rojo." testId="hero-bg-upload" />
          <div>
            <ImageListUpload
              values={(s.hero_foreground_urls && s.hero_foreground_urls.length > 0) ? s.hero_foreground_urls : (s.hero_foreground_url ? [s.hero_foreground_url] : [])}
              onChange={(arr) => setS(prev => ({ ...prev, hero_foreground_urls: arr, hero_foreground_url: arr[0] || "" }))}
              label="Imágenes superpuestas (carrusel niños jugando)"
              hint="Sube 1 o más PNG con fondo transparente (cutout), vertical 1200×1500 px (4:5) o cuadrado 1200×1200 px. Peso ideal < 800 KB c/u. Si hay 2+, rotan automáticamente con crossfade cada 4.5s."
              testId="hero-fg-list-upload"
            />
          </div>
        </div>
      </Section>

      <Section title="Estadísticas (4 columnas)" icon={<Hash size={18}/>}>
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-2">
              <Field label={`Número #${i}`} v={s[`stat_${i}_number`]} onChange={(v) => upd(`stat_${i}_number`, v)} />
              <Field label={`Etiqueta #${i}`} v={s[`stat_${i}_label`]} onChange={(v) => upd(`stat_${i}_label`, v)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Finales" icon={<Trophy size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Subtítulo (sede)" v={s.finales_subtitle} onChange={(v) => upd("finales_subtitle", v)} />
          <Field label="Texto del botón" v={s.finales_button_label} onChange={(v) => upd("finales_button_label", v)} />
          <Field label="URL del botón" v={s.finales_button_url} onChange={(v) => upd("finales_button_url", v)} />
        </div>
      </Section>

      <Section title="Región / mascota" icon={<MapPin size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título principal" v={s.region_title} onChange={(v) => upd("region_title", v)} />
          <Field label="Subtítulo (patrocinador / sede)" v={s.region_subtitle} onChange={(v) => upd("region_subtitle", v)} />
          <div className="md:col-span-2">
            <ImageUpload value={s.mascot_image_url} onChange={(v) => upd("mascot_image_url", v)} label="Mascota" hint="Recomendado: PNG con fondo transparente, vertical 800×1200 px (2:3) o cuadrado 1000×1000 px. Peso ideal < 500 KB." testId="mascot-upload" />
          </div>
        </div>
      </Section>

      <Section title="Festival" icon={<Flag size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título (texto, se muestra junto al logo si lo subes)" v={s.festival_title} onChange={(v) => upd("festival_title", v)} placeholder="FESTIVAL" />
          <Field label="Badge fecha" v={s.festival_date_badge} onChange={(v) => upd("festival_date_badge", v)} />
          <Field label="URL CTA" v={s.festival_cta_url} onChange={(v) => upd("festival_cta_url", v)} />
          <Field label="Categorías (lista separada por coma)" v={s.festival_categories} onChange={(v) => upd("festival_categories", v)} placeholder="Sub-8, Sub-10, Sub-12, ..." />
          <ImageUpload value={s.festival_logo_url} onChange={(v) => upd("festival_logo_url", v)} label="Logo Festival (opcional, convive con el título)" hint="Recomendado: PNG transparente, horizontal 800×300 px (8:3) o cuadrado 600×600 px. Peso ideal < 300 KB. Se renderiza a 40 px de alto." testId="festival-logo-upload" />
        </div>
      </Section>

      <Section title="Premier" icon={<Flag size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título (texto, se muestra junto al logo si lo subes)" v={s.premier_title} onChange={(v) => upd("premier_title", v)} placeholder="PREMIER" />
          <Field label="Badge fecha" v={s.premier_date_badge} onChange={(v) => upd("premier_date_badge", v)} />
          <Field label="URL CTA" v={s.premier_cta_url} onChange={(v) => upd("premier_cta_url", v)} />
          <Field label="Categorías pares (lista CSV)" v={s.premier_categories_par} onChange={(v) => upd("premier_categories_par", v)} placeholder="Sub-8, Sub-10, Sub-12" />
          <Field label="Categorías impares (lista CSV)" v={s.premier_categories_imp} onChange={(v) => upd("premier_categories_imp", v)} placeholder="Sub-9, Sub-11, Sub-13" />
          <ImageUpload value={s.premier_logo_url} onChange={(v) => upd("premier_logo_url", v)} label="Logo Premier (opcional, convive con el título)" hint="Recomendado: PNG transparente, horizontal 800×300 px (8:3) o cuadrado 600×600 px. Peso ideal < 300 KB. Se renderiza a 40 px de alto." testId="premier-logo-upload" />
        </div>
      </Section>

      <Section title="Footer / Contacto" icon={<Phone size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Titular footer (¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?)" v={s.footer_heading} onChange={(v) => upd("footer_heading", v)} />
          <Field label="Email de contacto" v={s.contact_email} onChange={(v) => upd("contact_email", v)} />
          <Field label="Teléfono / WhatsApp (texto)" v={s.contact_phone} onChange={(v) => upd("contact_phone", v)} />
          <Field label="WhatsApp URL (https://wa.me/...)" v={s.whatsapp_url} onChange={(v) => upd("whatsapp_url", v)} />
          <Field label="Instagram (@usuario o URL)" v={s.instagram} onChange={(v) => upd("instagram", v)} />
          <Field label="Facebook (URL o slug)" v={s.facebook} onChange={(v) => upd("facebook", v)} />
          <Field label="YouTube (URL o slug)" v={s.youtube} onChange={(v) => upd("youtube", v)} />
        </div>
      </Section>

      <Section title="Nosotros (página)" icon={<Info size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Hero — kicker (cursiva)" v={s.nosotros_hero_kicker} onChange={(v) => upd("nosotros_hero_kicker", v)} placeholder="conócenos" />
          <Field label="Hero — título grande" v={s.nosotros_hero_title} onChange={(v) => upd("nosotros_hero_title", v)} placeholder="NOSOTROS" />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — descripción</span>
            <textarea rows={3} value={s.nosotros_hero_body || ""} onChange={(e) => upd("nosotros_hero_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.nosotros_hero_bg_url} onChange={(v) => upd("nosotros_hero_bg_url", v)} label="Hero — imagen de fondo (ancho completo)" hint="Recomendado: JPG/WEBP horizontal 1920×800 px (12:5), alta calidad. Peso ideal < 1 MB. Se recorta tipo cover y recibe el overlay translúcido." testId="nosotros-hero-bg-upload" />
          </div>
          <OverlaySelect v={s.nosotros_hero_overlay} onChange={(v) => upd("nosotros_hero_overlay", v)} testId="nosotros-hero-overlay" />
          <div />
          <Field label="Misión — kicker" v={s.nosotros_mission_kicker} onChange={(v) => upd("nosotros_mission_kicker", v)} placeholder="misión" />
          <div />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Misión — cuerpo</span>
            <textarea rows={3} value={s.nosotros_mission_body || ""} onChange={(e) => upd("nosotros_mission_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2 border-t border-slate-200 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">Tarjetas / Pills (4)</div>
            <div className="grid md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-slate-200 rounded-md p-3 space-y-2">
                  <Field label={`Pill ${i} — título`} v={s[`nosotros_pill_${i}_title`]} onChange={(v) => upd(`nosotros_pill_${i}_title`, v)} />
                  <Field label={`Pill ${i} — descripción`} v={s[`nosotros_pill_${i}_body`]} onChange={(v) => upd(`nosotros_pill_${i}_body`, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* FSC en la Historia — Timeline editor */}
          <div className="md:col-span-2 border-t border-slate-200 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-2">FSC en la Historia — Timeline</div>
            <Field label="Título grande (ej: FSC EN LA HISTORIA)" v={s.nosotros_history_title} onChange={(v) => upd("nosotros_history_title", v)} placeholder="FSC EN LA HISTORIA" />
            <HistoryTimelineEditor value={s.nosotros_history_timeline || []} onChange={(v) => upd("nosotros_history_timeline", v)} />
          </div>
        </div>
      </Section>

      <Section title="Eventos (página) — Nueva estructura" icon={<Trophy size={18}/>}>
        <EventosEditor value={s.eventos || {}} onChange={(v) => upd("eventos", v)} />
      </Section>

      <Section title="Estadísticas (página) — Nueva estructura" icon={<Hash size={18}/>}>
        <EstadisticasEditor value={s.estadisticas || {}} onChange={(v) => upd("estadisticas", v)} />
      </Section>

      <Section title="Noticias (página) — Nueva estructura" icon={<Info size={18}/>}>
        <NoticiasEditor value={s.noticias || {}} onChange={(v) => upd("noticias", v)} />
      </Section>

      <Section title="Contacto (página) — Nueva estructura" icon={<Phone size={18}/>}>
        <ContactoEditor value={s.contacto || {}} onChange={(v) => upd("contacto", v)} />
      </Section>

      <Section title="Nosotros — sección con imagen (misión)" icon={<Info size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título" v={s.about_title} onChange={(v) => upd("about_title", v)} />
          <div />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cuerpo (texto)</span>
            <textarea rows={5} value={s.about_body || ""} onChange={(e) => upd("about_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.about_image_url} onChange={(v) => upd("about_image_url", v)} label="Imagen" hint="Recomendado: JPG/WEBP horizontal 1600×900 px (16:9) o 1200×800 px (3:2). Peso ideal < 800 KB." testId="about-image" />
          </div>
        </div>
      </Section>

      <Section title="Próximo evento (legacy)" icon={<Trophy size={18}/>}>
        <p className="text-xs text-slate-500 mb-3">Campos legacy. El home actual usa los campos del Hero arriba.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" v={s.upcoming_name} onChange={(v) => upd("upcoming_name", v)} />
          <Field label="Categorías (lista)" v={s.upcoming_categories} onChange={(v) => upd("upcoming_categories", v)} />
          <Field label="Ciudad" v={s.upcoming_city} onChange={(v) => upd("upcoming_city", v)} />
          <Field label="Sede" v={s.upcoming_venue} onChange={(v) => upd("upcoming_venue", v)} />
          <Field label="Fecha inicio" type="date" v={s.upcoming_start_date} onChange={(v) => upd("upcoming_start_date", v)} />
          <Field label="Fecha fin" type="date" v={s.upcoming_end_date} onChange={(v) => upd("upcoming_end_date", v)} />
          <div className="md:col-span-2">
            <ImageUpload value={s.upcoming_cover_url} onChange={(v) => upd("upcoming_cover_url", v)} label="Imagen de portada" hint="Recomendado: JPG/WEBP horizontal 1600×900 px (16:9). Peso ideal < 800 KB." testId="upcoming-cover" />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="text-fsc-azul-oscuro">{icon}</div>
        <div className="font-display text-2xl tracking-wider text-fsc-negro">{title.toUpperCase()}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, v, onChange, type = "text", placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={v || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
      />
    </label>
  );
}

function OverlaySelect({ v, onChange, testId }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — color de overlay translúcido</span>
      <select
        value={v || "blue"}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
        data-testid={testId}
      >
        <option value="blue">Azul institucional (#0640c8)</option>
        <option value="red">Rojo institucional (#e31f27)</option>
      </select>
      <span className="text-[10px] text-slate-400 mt-1 block">Se aplica sobre la imagen de fondo. 70% de opacidad.</span>
    </label>
  );
}


// Editor del timeline de "FSC en la Historia". Cada hito tiene key, label, body y 1 foto.
// El admin puede agregar/borrar hitos. La foto de cada hito se usa como imagen principal
// al seleccionarlo, y también compone el collage de 6 fotos flotantes de la introducción
// (una foto por hito, hasta 6 hitos).
function HistoryTimelineEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (idx, patch) => {
    const copy = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(copy);
  };
  const addMilestone = () => {
    const nextKey = `hito-${Date.now()}`;
    onChange([...items, { key: nextKey, label: "Nuevo hito", body: "", photos: [] }]);
  };
  const removeMilestone = (idx) => {
    if (!window.confirm("¿Eliminar este hito? Se perderá su texto y fotos asociadas.")) return;
    onChange(items.filter((_, i) => i !== idx));
  };
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
  };

  return (
    <div className="space-y-3 mt-2" data-testid="history-timeline-editor">
      {items.length === 0 && (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-300 rounded-md">
          Aún no hay hitos. Agrega el primero.
        </p>
      )}
      {items.map((it, idx) => (
        <div key={`${it.key}-${idx}`} className="border border-slate-200 rounded-md p-3 bg-white" data-testid={`timeline-milestone-${idx}`}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-red-100 text-red-800 px-2 py-1 rounded uppercase tracking-widest">Hito {idx + 1}</span>
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30" data-testid={`timeline-move-up-${idx}`}>↑</button>
              <button type="button" onClick={() => move(idx, +1)} disabled={idx === items.length - 1} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30" data-testid={`timeline-move-down-${idx}`}>↓</button>
            </div>
            <button type="button" onClick={() => removeMilestone(idx)} className="text-xs text-red-600 font-bold" data-testid={`timeline-delete-${idx}`}>Eliminar hito</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clave (única, sin espacios)</span>
              <input type="text" value={it.key || ""} onChange={(e) => update(idx, { key: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="intro, 2019, 2023..." data-testid={`timeline-key-${idx}`} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Etiqueta visible en la barra</span>
              <input type="text" value={it.label || ""} onChange={(e) => update(idx, { label: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="INTRODUCCIÓN, 2019..." data-testid={`timeline-label-${idx}`} />
            </label>
          </div>
          <label className="block mt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pregunta (aparece sobre la foto principal, ej: ¿Cómo empezó todo?)</span>
            <input type="text" value={it.question || ""} onChange={(e) => update(idx, { question: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="¿Cómo empezó todo?" data-testid={`timeline-question-${idx}`} />
          </label>
          <label className="block mt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto del hito (se muestra en modal al hacer clic en LEE AQUÍ)</span>
            <textarea rows={4} value={it.body || ""} onChange={(e) => update(idx, { body: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Respuesta larga del hito..." data-testid={`timeline-body-${idx}`} />
          </label>
          <div className="mt-3">
            <ImageListUpload
              label="Foto del hito (1 sola)"
              hint="Esta foto se usa como imagen principal del hito y también aparece en el collage de la introducción (cada foto flotante representa un hito distinto)."
              values={it.photos || []}
              onChange={(v) => update(idx, { photos: v || [] })}
              testId={`timeline-photos-${idx}`}
              max={1}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={addMilestone} className="w-full py-2 border border-dashed border-slate-400 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-500" data-testid="timeline-add-btn">
        + Agregar hito
      </button>
    </div>
  );
}


// Iter58: Editor completo de la página Eventos. Un objeto anidado `eventos` con todas
// las secciones. Cada sub-editor actualiza su path y llama onChange con el objeto completo.
function EventosEditor({ value, onChange }) {
  const v = value || {};
  const patch = (p) => onChange({ ...v, ...p });
  const patchFestival = (p) => onChange({ ...v, festival: { ...(v.festival || {}), ...p } });
  const patchPremier = (p) => onChange({ ...v, premier: { ...(v.premier || {}), ...p } });
  const patchStadium = (p) => onChange({ ...v, stadium: { ...(v.stadium || {}), ...p } });

  return (
    <div className="space-y-6" data-testid="eventos-editor">
      {/* Sección 1 — Hero */}
      <SubSection title="1. Hero — imagen de fondo (logo FSC se muestra centrado sobre ella)">
        <ImageUpload
          value={v.hero_url}
          onChange={(url) => patch({ hero_url: url })}
          label="Imagen del Hero"
          hint="Recomendado: JPG horizontal 1920×800 px con foto de partido de fútbol infantil. Peso < 1 MB."
          testId="eventos-hero-upload"
        />
      </SubSection>

      {/* Sección 2 — Países */}
      <SubSection title="2. Países que han Participado">
        <Field label="Título de la sección" v={v.countries_title} onChange={(x) => patch({ countries_title: x })} placeholder="Países que han Participado" />
        <ArrayItemsEditor
          items={v.countries || []}
          onChange={(arr) => patch({ countries: arr })}
          newItem={() => ({ name: "", flag_url: "" })}
          renderItem={(it, idx, upd) => (
            <div className="grid md:grid-cols-2 gap-3 items-end">
              <Field label={`País #${idx + 1} — nombre`} v={it.name} onChange={(x) => upd({ name: x })} placeholder="Guatemala" />
              <ImageUpload value={it.flag_url} onChange={(u) => upd({ flag_url: u })} label="Bandera (imagen)" hint="PNG con transparencia, 60×40 px aprox." testId={`flag-${idx}`} />
            </div>
          )}
          testId="countries"
          addLabel="+ Agregar país"
        />
      </SubSection>

      {/* Sección 3 — Tabs */}
      <SubSection title="3. Selector FESTIVAL / EVENTOS / PREMIER — textos centrales">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Texto central superior" v={v.tabs_center_top} onChange={(x) => patch({ tabs_center_top: x })} placeholder="EVENTOS" />
          <Field label="Texto central inferior (cursivo)" v={v.tabs_center_bottom} onChange={(x) => patch({ tabs_center_bottom: x })} placeholder="Diseñados para ti" />
        </div>
      </SubSection>

      {/* Sección 4A — Festival */}
      <SubSection title="4A. FESTIVAL — bloque rojo (tab) y título del evento">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Etiqueta del tab" v={v.festival?.tab_label} onChange={(x) => patchFestival({ tab_label: x })} placeholder="FESTIVAL" />
          <Field label="Fechas del tab" v={v.festival?.tab_dates} onChange={(x) => patchFestival({ tab_dates: x })} placeholder="Oct 05 al 10" />
          <Field label="Mes del título grande" v={v.festival?.title_month} onChange={(x) => patchFestival({ title_month: x })} placeholder="OCTUBRE" />
          <Field label="Palabra cursiva del título" v={v.festival?.title_word} onChange={(x) => patchFestival({ title_word: x })} placeholder="Festival" />
        </div>
        <div className="mt-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías Festival (separadas por coma, ej: 18, 17, 15...)</span>
            <input
              type="text"
              value={arrToCsv(v.festival?.categories)}
              onChange={(e) => patchFestival({ categories: csvToArr(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              placeholder="18, 17, 15, 16, 14, 13, 12, 11, 10, 09"
              data-testid="festival-categories"
            />
          </label>
        </div>
      </SubSection>

      {/* Sección 4B — Premier */}
      <SubSection title="4B. PREMIER — bloque azul (tab) y título del evento">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Etiqueta del tab" v={v.premier?.tab_label} onChange={(x) => patchPremier({ tab_label: x })} placeholder="PREMIER" />
          <Field label="Fechas PARES" v={v.premier?.tab_dates_even} onChange={(x) => patchPremier({ tab_dates_even: x })} placeholder="Dic 07 al 12 pares" />
          <Field label="Fechas IMPARES" v={v.premier?.tab_dates_odd} onChange={(x) => patchPremier({ tab_dates_odd: x })} placeholder="Dic 13 al 18 impares" />
          <Field label="Mes del título grande" v={v.premier?.title_month} onChange={(x) => patchPremier({ title_month: x })} placeholder="DICIEMBRE" />
          <Field label="Palabra cursiva del título" v={v.premier?.title_word} onChange={(x) => patchPremier({ title_word: x })} placeholder="Premier" />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías PARES (separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.categories_even)} onChange={(e) => patchPremier({ categories_even: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="18, 16, 14, 12, 10" data-testid="premier-cats-even" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías IMPARES (separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.categories_odd)} onChange={(e) => patchPremier({ categories_odd: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="17, 15, 13, 11, 09" data-testid="premier-cats-odd" />
          </label>
        </div>
      </SubSection>

      {/* Sección 5 — Estadio */}
      <SubSection title="5. Estadio Centenario (solo se muestra en tab PREMIER)">
        <ImageUpload value={v.stadium?.image_url} onChange={(u) => patchStadium({ image_url: u })} label="Imagen del estadio" hint="Se muestra en escala de grises. JPG horizontal 1920×600 px recomendado." testId="stadium-image" />
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Field label="Texto cursivo (línea 1)" v={v.stadium?.cursive} onChange={(x) => patchStadium({ cursive: x })} placeholder="Estadio" />
          <Field label="Título superior" v={v.stadium?.title_top} onChange={(x) => patchStadium({ title_top: x })} placeholder="CENTENARIO" />
          <Field label="Título inferior" v={v.stadium?.title_bottom} onChange={(x) => patchStadium({ title_bottom: x })} placeholder="ARMENIA" />
          <Field label="Texto del badge" v={v.stadium?.badge_text} onChange={(x) => patchStadium({ badge_text: x })} placeholder="POR CONFIRMAR" />
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm">
          <input type="checkbox" checked={!!v.stadium?.confirmed} onChange={(e) => patchStadium({ confirmed: e.target.checked })} data-testid="stadium-confirmed" />
          <span>Marcado como <b>CONFIRMADO</b> (oculta el badge rojo)</span>
        </label>
      </SubSection>

      {/* Sección 6 — Día de Aventura */}
      <SubSection title="6. Día de Aventura — logos de actividades">
        <Field label="Título" v={v.adventure_title} onChange={(x) => patch({ adventure_title: x })} placeholder="Día de Aventura" />
        <ArrayItemsEditor
          items={v.adventure_blocks || []}
          onChange={(arr) => patch({ adventure_blocks: arr })}
          newItem={() => ({ logo_url: "" })}
          renderItem={(it, idx, upd) => (
            <ImageUpload value={it.logo_url} onChange={(u) => upd({ logo_url: u })} label={`Logo #${idx + 1}`} hint="PNG con transparencia recomendado" testId={`adventure-${idx}`} />
          )}
          testId="adventure"
          addLabel="+ Agregar actividad"
        />
      </SubSection>

      {/* Sección 7 — Escenarios */}
      <SubSection title="7. Escenarios Deportivos — carrusel de fotos">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Título grande" v={v.scenarios_title} onChange={(x) => patch({ scenarios_title: x })} placeholder="ESCENARIOS" />
          <Field label="Palabra cursiva" v={v.scenarios_cursive} onChange={(x) => patch({ scenarios_cursive: x })} placeholder="Deportivos!" />
          <Field label="Subtítulo línea 1" v={v.scenarios_subtitle_top} onChange={(x) => patch({ scenarios_subtitle_top: x })} placeholder="COMFENALCO" />
          <Field label="Subtítulo línea 2" v={v.scenarios_subtitle_bottom} onChange={(x) => patch({ scenarios_subtitle_bottom: x })} placeholder="ESTADIO DE ARMENIA" />
        </div>
        <div className="mt-3">
          <ImageListUpload
            label="Fotos del carrusel"
            hint="Se muestran 3 a la vez con navegación ← →. JPG horizontal 1200×800 px."
            values={v.scenarios_photos || []}
            onChange={(arr) => patch({ scenarios_photos: arr })}
            testId="scenarios-photos"
          />
        </div>
      </SubSection>

      {/* Sección 8 — Premiación */}
      <SubSection title="8. Premiación — títulos y premios por evento">
        <Field label="Título grande" v={v.premiacion_title} onChange={(x) => patch({ premiacion_title: x })} placeholder="PREMIACIÓN" />
        <label className="block mt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subtítulo</span>
          <textarea rows={2} value={v.premiacion_subtitle || ""} onChange={(e) => patch({ premiacion_subtitle: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="EN LA FSC CADA NIÑO ES UN TESORO..." />
        </label>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">Festival — Copas (badges rojos, separadas por coma)</span>
            <input type="text" value={arrToCsv(v.festival?.awards_cups)} onChange={(e) => patchFestival({ awards_cups: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="COPA ORO, COPA PLATA, COPA BRONCE..." />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Festival — Individuales (azul, separadas por coma)</span>
            <input type="text" value={arrToCsv(v.festival?.awards_individual)} onChange={(e) => patchFestival({ awards_individual: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="MVP, FAIR PLAY, GOLEADOR, MEJOR PORTERO" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">Premier — Copas (separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.awards_cups)} onChange={(e) => patchPremier({ awards_cups: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="COPA ORO, COPA PLATA" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Premier — Individuales (separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.awards_individual)} onChange={(e) => patchPremier({ awards_individual: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="MVP, FAIR PLAY, GOLEADOR, MEJOR PORTERO" />
          </label>
        </div>
      </SubSection>

      {/* Sección 9 — Clubes */}
      <SubSection title="9. Clubes que han Participado">
        <Field label="Título" v={v.clubs_title} onChange={(x) => patch({ clubs_title: x })} placeholder="Clubes que han Participado" />
        <div className="mt-3">
          <ImageListUpload
            label="Escudos de clubes"
            hint="PNG con fondo transparente, 200×200 px aprox. Se muestran en fila."
            values={v.clubs_logos || []}
            onChange={(arr) => patch({ clubs_logos: arr })}
            testId="clubs-logos"
          />
        </div>
      </SubSection>
    </div>
  );
}


function SubSection({ title, children }) {
  return (
    <div className="border border-slate-200 rounded-md p-3 bg-white">
      <div className="text-[11px] font-black uppercase tracking-widest text-red-700 mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}


function ArrayItemsEditor({ items, onChange, newItem, renderItem, testId, addLabel }) {
  const update = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[t]] = [copy[t], copy[idx]];
    onChange(copy);
  };
  const add = () => onChange([...items, newItem()]);

  return (
    <div className="space-y-2 mt-2" data-testid={`${testId}-editor`}>
      {items.map((it, idx) => (
        <div key={`${testId}-${idx}`} className="border border-slate-200 rounded-md p-3 bg-slate-50">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(idx, +1)} disabled={idx === items.length - 1} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↓</button>
            </div>
            <button type="button" onClick={() => remove(idx)} className="text-xs text-red-600 font-bold" data-testid={`${testId}-delete-${idx}`}>Eliminar</button>
          </div>
          {renderItem(it, idx, (patch) => update(idx, patch))}
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-2 border border-dashed border-slate-400 rounded-md text-sm text-slate-600 hover:bg-slate-50" data-testid={`${testId}-add`}>
        {addLabel || "+ Agregar"}
      </button>
    </div>
  );
}



// Iter61: Editor de la página Estadísticas — objeto anidado con hero, intro, eventos
// (Festival / Premier Pares / Impares) y cada evento con sus categorías (label +
// tournament_id + category + group_name para conectar con /api/stats/standings).
function EstadisticasEditor({ value, onChange }) {
  const v = value || {};
  const patch = (p) => onChange({ ...v, ...p });
  const events = v.events || [];
  const updateEvent = (idx, evPatch) => onChange({ ...v, events: events.map((e, i) => i === idx ? { ...e, ...evPatch } : e) });
  const removeEvent = (idx) => onChange({ ...v, events: events.filter((_, i) => i !== idx) });
  const addEvent = () => onChange({ ...v, events: [...events, { key: `evento-${Date.now()}`, label: "Nuevo evento", title_month: "", title_word: "", title_style: "cursive_gold", logo_url: "", categories: [] }] });

  return (
    <div className="space-y-6" data-testid="estadisticas-editor">
      <SubSection title="1. Hero — imagen + textos">
        <ImageUpload value={v.hero_url} onChange={(u) => patch({ hero_url: u })} label="Imagen del Hero (recibe overlay rojo)" hint="JPG horizontal con foto de partido de fútbol infantil. 1920×600 px recomendado." testId="stats-hero" />
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <Field label="Watermark (texto fantasma detrás)" v={v.hero_watermark_text} onChange={(x) => patch({ hero_watermark_text: x })} placeholder="MARCADOR" />
          <Field label="Título línea 1" v={v.hero_title_top} onChange={(x) => patch({ hero_title_top: x })} placeholder="MARCADOR" />
          <Field label="Título línea 2" v={v.hero_title_bottom} onChange={(x) => patch({ hero_title_bottom: x })} placeholder="OFICIAL" />
        </div>
      </SubSection>

      <SubSection title="2. Intro — 'ASÍ VA LA competencia!' + selector de evento">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Texto grande (Plane Crash rojo)" v={v.intro_top} onChange={(x) => patch({ intro_top: x })} placeholder="ASÍ VA LA" />
          <Field label="Texto cursivo debajo" v={v.intro_bottom} onChange={(x) => patch({ intro_bottom: x })} placeholder="competencia!" />
        </div>
        <label className="block mt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evento activo por defecto (clave)</span>
          <select value={v.active_event_key || ""} onChange={(e) => patch({ active_event_key: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="stats-active-event">
            <option value="">— Ninguno —</option>
            {events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label} ({ev.key})</option>)}
          </select>
        </label>
      </SubSection>

      <SubSection title="3. Eventos + categorías (Festival, Premier Pares, Premier Impares...)">
        {events.map((ev, idx) => (
          <div key={`ev-${idx}`} className="border border-slate-200 rounded-md p-3 bg-slate-50" data-testid={`stats-event-block-${idx}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-1 rounded uppercase tracking-widest">Evento {idx + 1}</span>
              <button type="button" onClick={() => removeEvent(idx)} className="text-xs text-red-600 font-bold" data-testid={`stats-event-delete-${idx}`}>Eliminar evento</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Clave (única, sin espacios)" v={ev.key} onChange={(x) => updateEvent(idx, { key: x })} placeholder="festival, premier-pares..." />
              <Field label="Etiqueta del botón" v={ev.label} onChange={(x) => updateEvent(idx, { label: x })} placeholder="Festival" />
              <Field label="Mes del título derecho" v={ev.title_month} onChange={(x) => updateEvent(idx, { title_month: x })} placeholder="OCTUBRE" />
              <Field label="Palabra del título" v={ev.title_word} onChange={(x) => updateEvent(idx, { title_word: x })} placeholder="FESTIVAL" />
            </div>
            <label className="block mt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estilo del título</span>
              <select value={ev.title_style || "cursive_gold"} onChange={(e) => updateEvent(idx, { title_style: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid={`stats-event-style-${idx}`}>
                <option value="cursive_gold">Cursivo dorado (Premier)</option>
                <option value="multicolor">Multicolor grunge (Festival)</option>
              </select>
            </label>
            <div className="mt-3">
              <ImageUpload value={ev.logo_url} onChange={(u) => updateEvent(idx, { logo_url: u })} label="Logo del evento (opcional)" hint="PNG con transparencia" testId={`stats-event-logo-${idx}`} />
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">Categorías (pastillas azules)</div>
              <ArrayItemsEditor
                items={ev.categories || []}
                onChange={(cats) => updateEvent(idx, { categories: cats })}
                newItem={() => ({ label: "CAT: ", tournament_id: "", category: "", group_name: "" })}
                renderItem={(it, ci, upd) => (
                  <div className="grid md:grid-cols-4 gap-2">
                    <Field label="Etiqueta visible" v={it.label} onChange={(x) => upd({ label: x })} placeholder="CAT: 2010" />
                    <Field label="Torneo ID (tournament_id)" v={it.tournament_id} onChange={(x) => upd({ tournament_id: x })} placeholder="uuid del torneo" />
                    <Field label="Categoría (nombre en BD)" v={it.category} onChange={(x) => upd({ category: x })} placeholder="Sub-10" />
                    <Field label="Grupo (opcional)" v={it.group_name} onChange={(x) => upd({ group_name: x })} placeholder="A" />
                  </div>
                )}
                testId={`stats-cats-${idx}`}
                addLabel="+ Agregar categoría"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addEvent} className="w-full py-2 border border-dashed border-slate-400 rounded-md text-sm text-slate-600 hover:bg-slate-50" data-testid="stats-add-event">
          + Agregar evento
        </button>
      </SubSection>

      <SubSection title="4. Frase de cierre (opcional, ya no se muestra — se preserva por compatibilidad)">
        <p className="text-xs text-slate-500 italic">
          Nota: las secciones SÍGUENOS Y NO TE PIERDAS y Somos mas que un Torneo fueron eliminadas de la página pública (el footer ya las incluye globalmente). Estos campos permanecen guardados por si se necesitan reactivar.
        </p>
      </SubSection>
    </div>
  );
}



// Iter62: Editor de la página Noticias. Configuración anidada:
// {hero_url, hero_watermark, hero_title, hero_subtitle, categories: [{id, title, image_url, news: [{id, title, body, images, published}]}]}
function NoticiasEditor({ value, onChange }) {
  const v = value || {};
  const patch = (p) => onChange({ ...v, ...p });
  const cats = v.categories || [];
  const updateCat = (idx, catPatch) => onChange({ ...v, categories: cats.map((c, i) => i === idx ? { ...c, ...catPatch } : c) });
  const removeCat = (idx) => {
    if (!window.confirm("¿Eliminar esta categoría? Se perderán todas sus noticias.")) return;
    onChange({ ...v, categories: cats.filter((_, i) => i !== idx) });
  };
  const moveCat = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= cats.length) return;
    const copy = [...cats];
    [copy[idx], copy[t]] = [copy[t], copy[idx]];
    onChange({ ...v, categories: copy });
  };
  const addCat = () => onChange({ ...v, categories: [...cats, { id: `cat-${Date.now()}`, title: "Nueva categoría", image_url: "", news: [] }] });

  return (
    <div className="space-y-6" data-testid="noticias-editor">
      <SubSection title="1. Hero — imagen + textos">
        <ImageUpload value={v.hero_url} onChange={(u) => patch({ hero_url: u })} label="Imagen del Hero (recibe overlay azul)" hint="JPG horizontal con foto de partido de fútbol infantil. 1920×600 px." testId="noticias-hero" />
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <Field label="Watermark (fantasma detrás)" v={v.hero_watermark} onChange={(x) => patch({ hero_watermark: x })} placeholder="MENTALIDAD" />
          <Field label="Título grande" v={v.hero_title} onChange={(x) => patch({ hero_title: x })} placeholder="MENTALIDAD" />
          <Field label="Subtítulo cursivo" v={v.hero_subtitle} onChange={(x) => patch({ hero_subtitle: x })} placeholder="Fútbolera" />
        </div>
      </SubSection>

      <SubSection title="2. Categorías de noticias (agregar/reordenar/borrar)">
        {cats.map((cat, ci) => (
          <div key={cat.id || ci} className="border border-slate-200 rounded-md p-3 bg-slate-50" data-testid={`noticias-cat-block-${ci}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black bg-red-100 text-red-800 px-2 py-1 rounded uppercase tracking-widest">Cat {ci + 1}</span>
                <button type="button" onClick={() => moveCat(ci, -1)} disabled={ci === 0} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveCat(ci, +1)} disabled={ci === cats.length - 1} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↓</button>
              </div>
              <button type="button" onClick={() => removeCat(ci)} className="text-xs text-red-600 font-bold" data-testid={`noticias-cat-delete-${ci}`}>Eliminar categoría</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Título de la categoría" v={cat.title} onChange={(x) => updateCat(ci, { title: x })} placeholder="AVALADOS POR LA LIGA DEL QUINDIO" />
              <Field label="ID interno (único)" v={cat.id} onChange={(x) => updateCat(ci, { id: x })} placeholder="cat-liga" />
            </div>
            <div className="mt-3">
              <ImageUpload value={cat.image_url} onChange={(u) => updateCat(ci, { image_url: u })} label="Imagen de fondo (con overlay rojo semitransparente)" hint="JPG 800×600 px. Se le aplica overlay rojo automáticamente." testId={`noticias-cat-img-${ci}`} />
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">Noticias de esta categoría</div>
              <NewsListEditor
                items={cat.news || []}
                onChange={(arr) => updateCat(ci, { news: arr })}
                testId={`news-${ci}`}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addCat} className="w-full py-2 border border-dashed border-slate-400 rounded-md text-sm text-slate-600 hover:bg-slate-50" data-testid="noticias-add-cat">
          + Agregar categoría
        </button>
      </SubSection>
    </div>
  );
}


function NewsListEditor({ items, onChange, testId }) {
  const update = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remove = (idx) => {
    if (!window.confirm("¿Eliminar esta noticia?")) return;
    onChange(items.filter((_, i) => i !== idx));
  };
  const move = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[t]] = [copy[t], copy[idx]];
    onChange(copy);
  };
  const add = () => onChange([...items, { id: `news-${Date.now()}`, title: "Nueva noticia", body: "", images: [], published: true }]);

  return (
    <div className="space-y-2" data-testid={`${testId}-list`}>
      {items.map((n, i) => (
        <div key={n.id || i} className="border border-slate-200 rounded p-3 bg-white" data-testid={`${testId}-item-${i}`}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">#{i + 1}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, +1)} disabled={i === items.length - 1} className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-30">↓</button>
              <label className="ml-2 text-xs flex items-center gap-1">
                <input type="checkbox" checked={n.published !== false} onChange={(e) => update(i, { published: e.target.checked })} data-testid={`${testId}-pub-${i}`} />
                Publicada
              </label>
            </div>
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-600 font-bold" data-testid={`${testId}-delete-${i}`}>Eliminar</button>
          </div>
          <Field label="Título de la noticia" v={n.title} onChange={(x) => update(i, { title: x })} placeholder="Título..." />
          <label className="block mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto completo</span>
            <textarea rows={4} value={n.body || ""} onChange={(e) => update(i, { body: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Contenido de la noticia..." data-testid={`${testId}-body-${i}`} />
          </label>
          <div className="mt-2">
            <ImageListUpload
              label="Imágenes / galería (la primera se usa como portada)"
              hint="JPG horizontales, máx 6 imágenes recomendado."
              values={n.images || []}
              onChange={(arr) => update(i, { images: arr })}
              testId={`${testId}-imgs-${i}`}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-1.5 border border-dashed border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50" data-testid={`${testId}-add`}>
        + Agregar noticia
      </button>
    </div>
  );
}



// Iter65: Editor de la página Contacto — solo 4 campos (kicker, title, cancha, palmeras).
function ContactoEditor({ value, onChange }) {
  const v = value || {};
  const patch = (p) => onChange({ ...v, ...p });
  return (
    <div className="space-y-4" data-testid="contacto-editor">
      <SubSection title="1. Textos del formulario">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Kicker cursivo azul" v={v.kicker} onChange={(x) => patch({ kicker: x })} placeholder="déjanos un mensaje" />
          <Field label="Título grande (Plane Crash)" v={v.title} onChange={(x) => patch({ title: x })} placeholder="ENVÍANOS TU CONSULTA" />
        </div>
      </SubSection>
      <SubSection title="2. Decoración inferior — cancha + palmeras">
        <ImageUpload value={v.field_url} onChange={(u) => patch({ field_url: u })} label="Imagen de la cancha (fondo inferior)" hint="JPG horizontal con vista de cancha desde arriba. Se muestra en la parte inferior de la página." testId="contacto-field" />
        <div className="mt-3">
          <ImageUpload value={v.palms_url} onChange={(u) => patch({ palms_url: u })} label="Imagen de las palmeras (PNG con transparencia)" hint="PNG con dos palmeras a los lados y fondo transparente. Se superpone sobre la cancha." testId="contacto-palms" />
        </div>
      </SubSection>
    </div>
  );
}

