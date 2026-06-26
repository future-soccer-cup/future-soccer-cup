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

  const upd = (k, v) => setS({ ...s, [k]: v });

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
              onChange={(arr) => { upd("hero_foreground_urls", arr); upd("hero_foreground_url", arr[0] || ""); }}
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
        </div>
      </Section>

      <Section title="Eventos (página)" icon={<Trophy size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Hero — kicker" v={s.eventos_hero_kicker} onChange={(v) => upd("eventos_hero_kicker", v)} placeholder="temporada" />
          <Field label="Hero — título grande" v={s.eventos_hero_title} onChange={(v) => upd("eventos_hero_title", v)} placeholder="EVENTOS" />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — descripción</span>
            <textarea rows={2} value={s.eventos_hero_body || ""} onChange={(e) => upd("eventos_hero_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.eventos_hero_bg_url} onChange={(v) => upd("eventos_hero_bg_url", v)} label="Hero — imagen de fondo (ancho completo)" hint="Recomendado: JPG/WEBP horizontal 1920×800 px (12:5), alta calidad. Peso ideal < 1 MB. Se recorta tipo cover y recibe el overlay translúcido." testId="eventos-hero-bg-upload" />
          </div>
          <OverlaySelect v={s.eventos_hero_overlay} onChange={(v) => upd("eventos_hero_overlay", v)} testId="eventos-hero-overlay" />
        </div>
      </Section>

      <Section title="Estadísticas (página)" icon={<Hash size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Hero — kicker" v={s.estadisticas_hero_kicker} onChange={(v) => upd("estadisticas_hero_kicker", v)} placeholder="torneo en vivo" />
          <Field label="Hero — título grande" v={s.estadisticas_hero_title} onChange={(v) => upd("estadisticas_hero_title", v)} placeholder="ESTADÍSTICAS" />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — descripción</span>
            <textarea rows={2} value={s.estadisticas_hero_body || ""} onChange={(e) => upd("estadisticas_hero_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.estadisticas_hero_bg_url} onChange={(v) => upd("estadisticas_hero_bg_url", v)} label="Hero — imagen de fondo (ancho completo)" hint="Recomendado: JPG/WEBP horizontal 1920×800 px (12:5), alta calidad. Peso ideal < 1 MB. Se recorta tipo cover y recibe el overlay translúcido." testId="estadisticas-hero-bg-upload" />
          </div>
          <OverlaySelect v={s.estadisticas_hero_overlay} onChange={(v) => upd("estadisticas_hero_overlay", v)} testId="estadisticas-hero-overlay" />
        </div>
      </Section>

      <Section title="Noticias (página)" icon={<Info size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Hero — kicker" v={s.noticias_hero_kicker} onChange={(v) => upd("noticias_hero_kicker", v)} placeholder="novedades" />
          <Field label="Hero — título grande" v={s.noticias_hero_title} onChange={(v) => upd("noticias_hero_title", v)} placeholder="NOTICIAS" />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — descripción</span>
            <textarea rows={2} value={s.noticias_hero_body || ""} onChange={(e) => upd("noticias_hero_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
        </div>
      </Section>

      <Section title="Contacto (página)" icon={<Phone size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Hero — kicker" v={s.contacto_hero_kicker} onChange={(v) => upd("contacto_hero_kicker", v)} placeholder="estamos aquí" />
          <Field label="Hero — título grande" v={s.contacto_hero_title} onChange={(v) => upd("contacto_hero_title", v)} placeholder="CONTACTO" />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hero — descripción</span>
            <textarea rows={2} value={s.contacto_hero_body || ""} onChange={(e) => upd("contacto_hero_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.contacto_hero_bg_url} onChange={(v) => upd("contacto_hero_bg_url", v)} label="Hero — imagen de fondo (ancho completo)" hint="Recomendado: JPG/WEBP horizontal 1920×800 px (12:5), alta calidad. Peso ideal < 1 MB. Se recorta tipo cover y recibe el overlay translúcido." testId="contacto-hero-bg-upload" />
          </div>
          <OverlaySelect v={s.contacto_hero_overlay} onChange={(v) => upd("contacto_hero_overlay", v)} testId="contacto-hero-overlay" />
          <Field label="Formulario — kicker" v={s.contacto_form_kicker} onChange={(v) => upd("contacto_form_kicker", v)} placeholder="déjanos un mensaje" />
          <Field label="Formulario — título" v={s.contacto_form_title} onChange={(v) => upd("contacto_form_title", v)} placeholder="ENVÍANOS TU CONSULTA" />
        </div>
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
