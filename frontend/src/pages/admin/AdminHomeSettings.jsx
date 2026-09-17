import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { Save, Home as HomeIcon, Trophy, Info, Phone, Image as ImageIcon, Hash, MapPin, Flag, Layers, LogIn, Users, Calculator } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";
import ImageListUpload from "../../components/ImageListUpload";
import VideoUpload from "../../components/VideoUpload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";

const EMPTY = {
  // Navbar
  nav_logo_url: "",
  nav_shield_url: "",
  nav_wordmark_text: "",
  // Dashboard del club (Directivo / Cuerpo Técnico) — hero video
  dashboard_hero_video_url: "",
  dashboard_hero_url: "",
  // Cotiza tu evento — hero video
  cotizar_hero_video_url: "",
  cotizar_hero_url: "",
  cotizar_summary_bg_url: "",
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
  tiktok: "",
  whatsapp_url: "",
  footer_heading: "¿Y SI NOS\nTOMAMOS\nUN\nCAFECITO\nJUNTOS?",
  somos_mas_texto: "Somos más que un Torneo",
};

// Helpers para convertir entre lista (CSV) y arrays
const arrToCsv = (v) => Array.isArray(v) ? v.join(", ") : (v || "");
const csvToArr = (v) => String(v || "").split(",").map(x => x.trim()).filter(Boolean);

export default function AdminHomeSettings() {
  const [s, setS] = useState(EMPTY);
  const [tournaments, setTournaments] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  useEffect(() => {
    api.get("/tournaments").then((r) => setTournaments(r.data || [])).catch(() => {});
    api.get("/fixtures").then((r) => setFixtures(r.data || [])).catch(() => {});
  }, []);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      setLoaded(true);
    } catch {
      toast.error("Error al cargar configuración");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!loaded) {
      toast.error("Espera a que termine de cargar la configuración actual antes de guardar");
      return;
    }
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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400" data-testid="admin-home-settings-loading">
        Cargando configuración actual...
      </div>
    );
  }

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

      <Tabs defaultValue="general" data-testid="home-settings-tabs">
        <TabsList className="h-auto flex-wrap justify-start gap-1 mb-6 p-1.5">
          <TabsTrigger value="general" className="gap-1.5" data-testid="tab-general"><Layers size={14}/> General</TabsTrigger>
          <TabsTrigger value="inicio" className="gap-1.5" data-testid="tab-inicio"><HomeIcon size={14}/> Inicio</TabsTrigger>
          <TabsTrigger value="nosotros" className="gap-1.5" data-testid="tab-nosotros"><Info size={14}/> Nosotros</TabsTrigger>
          <TabsTrigger value="eventos" className="gap-1.5" data-testid="tab-eventos"><Trophy size={14}/> Eventos</TabsTrigger>
          <TabsTrigger value="estadisticas" className="gap-1.5" data-testid="tab-estadisticas"><Hash size={14}/> Estadísticas</TabsTrigger>
          <TabsTrigger value="noticias" className="gap-1.5" data-testid="tab-noticias"><Info size={14}/> Noticias</TabsTrigger>
          <TabsTrigger value="contacto" className="gap-1.5" data-testid="tab-contacto"><Phone size={14}/> Contacto</TabsTrigger>
          <TabsTrigger value="ingreso" className="gap-1.5" data-testid="tab-ingreso"><LogIn size={14}/> Ingreso / Registro</TabsTrigger>
          <TabsTrigger value="club" className="gap-1.5" data-testid="tab-club"><Users size={14}/> Panel del Club</TabsTrigger>
          <TabsTrigger value="cotizador" className="gap-1.5" data-testid="tab-cotizador"><Calculator size={14}/> Cotizador</TabsTrigger>
        </TabsList>

        {/* ===== GENERAL — aparece en todas las páginas públicas (navbar + footer) ===== */}
        <TabsContent value="general" className="space-y-6">
          <Section title="Navbar (logo + escudo)" icon={<ImageIcon size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              <ImageUpload value={s.nav_shield_url} onChange={(v) => upd("nav_shield_url", v)} label="Escudo / logo circular (a la izquierda del wordmark)" hint="Recomendado: PNG con fondo transparente, cuadrado 512×512 px (o 1:1). Peso ideal < 300 KB. Se renderiza a 64–80 px de alto." testId="nav-shield-upload" />
              <ImageUpload value={s.nav_logo_url} onChange={(v) => upd("nav_logo_url", v)} label="Wordmark / logo en imagen (opcional, visible en ≥lg)" hint="Recomendado: PNG con fondo transparente, formato horizontal 1200×400 px (3:1). Peso ideal < 500 KB. Se renderiza a 48–64 px de alto." testId="nav-logo-upload" />
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Texto junto al escudo (una línea por renglón)</label>
                <textarea
                  rows={3}
                  value={s.nav_wordmark_text || ""}
                  onChange={(e) => upd("nav_wordmark_text", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-sm"
                  placeholder={"FUTUR\nSOCCER\nCUP"}
                  data-testid="field-nav-wordmark-text"
                />
              </div>
            </div>
          </Section>

          <Section title="Footer / Contacto" icon={<Phone size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Titular footer (una línea por renglón — así se ven separadas en el diseño)</label>
                <textarea
                  rows={4}
                  value={s.footer_heading || ""}
                  onChange={(e) => upd("footer_heading", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-sm"
                  placeholder={"¿Y SI NOS\nTOMAMOS\nUN\nCAFECITO\nJUNTOS?"}
                  data-testid="field-footer-heading"
                />
              </div>
              <Field label="Email de contacto" v={s.contact_email} onChange={(v) => upd("contact_email", v)} />
              <Field label="Teléfono / WhatsApp (texto)" v={s.contact_phone} onChange={(v) => upd("contact_phone", v)} />
              <Field label="WhatsApp URL (https://wa.me/...)" v={s.whatsapp_url} onChange={(v) => upd("whatsapp_url", v)} />
              <Field label="Instagram (@usuario o URL)" v={s.instagram} onChange={(v) => upd("instagram", v)} />
              <Field label="Facebook (URL o slug)" v={s.facebook} onChange={(v) => upd("facebook", v)} />
              <Field label="YouTube (URL o slug)" v={s.youtube} onChange={(v) => upd("youtube", v)} />
              <Field label="TikTok (@usuario o URL)" v={s.tiktok} onChange={(v) => upd("tiktok", v)} placeholder="@futuresoccercup" />
              <div className="md:col-span-2">
                <Field label="Frase final (aparece a todo el ancho, debajo de los datos de contacto — en todas las páginas)" v={s.somos_mas_texto} onChange={(v) => upd("somos_mas_texto", v)} placeholder="Somos más que un Torneo" />
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ===== INICIO ===== */}
        <TabsContent value="inicio" className="space-y-6">
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
        </TabsContent>

        {/* ===== NOSOTROS ===== */}
        <TabsContent value="nosotros" className="space-y-6">
          <Section title="Nosotros (página) — Timeline de Hitos" icon={<Info size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* FSC en la Historia — Timeline editor (única sección activa en /nosotros) */}
              <div className="md:col-span-2">
                <Field label="Título grande (ej: FSC EN LA HISTORIA)" v={s.nosotros_history_title} onChange={(v) => upd("nosotros_history_title", v)} placeholder="FSC EN LA HISTORIA" />
              </div>
              <div className="md:col-span-2 border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Pantalla de bienvenida de Kow (aparece al entrar a Nosotros y al hacer clic en "INTRODUCCIÓN")</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ImageUpload
                    value={s.nosotros_kow_image_url}
                    onChange={(v) => upd("nosotros_kow_image_url", v)}
                    label="Imagen de Kow (fondo blanco/transparente)"
                    hint="Recomendado: PNG con fondo blanco o transparente."
                    testId="kow-welcome-image-upload"
                  />
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto de bienvenida de Kow</span>
                    <textarea
                      rows={6}
                      value={s.nosotros_kow_welcome_text || ""}
                      onChange={(e) => upd("nosotros_kow_welcome_text", e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                      data-testid="kow-welcome-text-input"
                    />
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <HistoryTimelineEditor value={s.nosotros_history_timeline || []} onChange={(v) => upd("nosotros_history_timeline", v)} />
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ===== EVENTOS ===== */}
        <TabsContent value="eventos" className="space-y-6">
          <Section title="Eventos (página) — Nueva estructura" icon={<Trophy size={18}/>}>
            <EventosEditor value={s.eventos || {}} onChange={(v) => upd("eventos", v)} />
          </Section>
        </TabsContent>

        {/* ===== ESTADÍSTICAS ===== */}
        <TabsContent value="estadisticas" className="space-y-6">
          <Section title="Estadísticas (página) — Nueva estructura" icon={<Hash size={18}/>}>
            <EstadisticasEditor value={s.estadisticas || {}} onChange={(v) => upd("estadisticas", v)} tournaments={tournaments} fixtures={fixtures} />
          </Section>
        </TabsContent>

        {/* ===== NOTICIAS ===== */}
        <TabsContent value="noticias" className="space-y-6">
          <Section title="Noticias (página) — Nueva estructura" icon={<Info size={18}/>}>
            <NoticiasEditor value={s.noticias || {}} onChange={(v) => upd("noticias", v)} />
          </Section>
        </TabsContent>

        {/* ===== CONTACTO ===== */}
        <TabsContent value="contacto" className="space-y-6">
          <Section title="Contacto (página) — Nueva estructura" icon={<Phone size={18}/>}>
            <ContactoEditor value={s.contacto || {}} onChange={(v) => upd("contacto", v)} />
          </Section>
        </TabsContent>

        {/* ===== INGRESO / REGISTRO ===== */}
        <TabsContent value="ingreso" className="space-y-6">
          <Section title="Ingreso / Registro — Imágenes" icon={<ImageIcon size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              <ImageUpload value={s.auth_login_image_url} onChange={(v) => upd("auth_login_image_url", v)} label="Imagen de la página INGRESO (lado derecho de la card roja)" hint="Recomendado: JPG vertical con KOW en el estadio, 800×1000 px. Se muestra completa, sin recortar." testId="auth-login-upload" />
              <ImageUpload value={s.auth_register_image_url} onChange={(v) => upd("auth_register_image_url", v)} label="Imagen de la página REGISTRO (columna derecha, fondo fijo)" hint="Recomendado: JPG vertical con KOW + jugador, 800×1200 px. Se muestra completa, sin recortar." testId="auth-register-upload" />
            </div>
          </Section>
        </TabsContent>

        {/* ===== PANEL DEL CLUB ===== */}
        <TabsContent value="club" className="space-y-6">
          <Section title="Panel del Club (Directivo / Cuerpo Técnico) — Hero video" icon={<ImageIcon size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              <VideoUpload
                value={s.dashboard_hero_video_url}
                onChange={(url) => upd("dashboard_hero_video_url", url)}
                label="Video de fondo (se reproduce en loop automático, sin sonido)"
                hint="Se muestra arriba de todo cuando un Directivo o Cuerpo Técnico entra a Mi Club. Recomendado: MP4 horizontal, corta duración (5-15s) para que cargue rápido. Máx 150 MB. Si no hay video, se usa la imagen de respaldo."
                testId="dashboard-hero-video-upload"
              />
              <ImageUpload
                value={s.dashboard_hero_url}
                onChange={(v) => upd("dashboard_hero_url", v)}
                label="Imagen de respaldo (se usa solo si no hay video)"
                hint="Recomendado: JPG horizontal 1920×600 px (proporción 16:5). Se recorta tipo cover centrado si la proporción no coincide exacto."
              />
            </div>
          </Section>
        </TabsContent>

        {/* ===== COTIZADOR ===== */}
        <TabsContent value="cotizador" className="space-y-6">
          <Section title="Cotiza tu Evento — Hero video" icon={<ImageIcon size={18}/>}>
            <div className="grid md:grid-cols-2 gap-4">
              <VideoUpload
                value={s.cotizar_hero_video_url}
                onChange={(url) => upd("cotizar_hero_video_url", url)}
                label="Video de fondo (se reproduce en loop automático, sin sonido)"
                hint="Se muestra arriba de todo en /cotizar. Recomendado: MP4 horizontal, corta duración (5-15s) para que cargue rápido. Máx 150 MB. Si no hay video, se usa la imagen de respaldo."
                testId="cotizar-hero-video-upload"
              />
              <ImageUpload
                value={s.cotizar_hero_url}
                onChange={(v) => upd("cotizar_hero_url", v)}
                label="Imagen de respaldo (se usa solo si no hay video)"
                hint="Recomendado: JPG horizontal 1920×600 px (proporción 16:5). Se recorta tipo cover centrado si la proporción no coincide exacto."
                testId="cotizar-hero-upload"
              />
            </div>
            <div className="mt-4">
              <ImageUpload
                value={s.cotizar_summary_bg_url}
                onChange={(v) => upd("cotizar_summary_bg_url", v)}
                label="Imagen de fondo del cuadro 'Resumen en vivo' (mascota u otra imagen con velo azul)"
                hint="Recomendado: JPG/PNG vertical, 800×1200 px. Se muestra con un velo azul oscuro detrás del resumen de la cotización."
                testId="cotizar-summary-bg-upload"
              />
            </div>
          </Section>
        </TabsContent>
      </Tabs>
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
          {(it.key || "").toLowerCase() !== "intro" ? (
            <div className="mt-3">
              <ImageListUpload
                label="Foto del hito (1 sola)"
                hint="Esta foto se usa como imagen principal del hito y también aparece en el collage de la introducción (cada foto flotante representa un hito distinto). Recomendado: proporción 4:3 (ej. 800×600 px). Se recorta tipo cover centrado si la proporción no coincide exacto."
                values={it.photos || []}
                onChange={(v) => update(idx, { photos: v || [] })}
                testId={`timeline-photos-${idx}`}
                max={1}
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500 italic">El hito "intro" no usa foto propia: muestra las fotos de los demás hitos flotando alrededor del texto.</p>
          )}
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
      <SubSection title="1. Hero — video de fondo en loop (logo FSC se muestra centrado sobre él)">
        <VideoUpload
          value={v.hero_video_url}
          onChange={(url) => patch({ hero_video_url: url })}
          label="Video del Hero (se reproduce en loop automático, sin sonido)"
          hint="Recomendado: MP4 horizontal, corta duración (5-15s) para que cargue rápido. Máx 150 MB. Si no se sube video, se usa la imagen de respaldo abajo."
          testId="eventos-hero-video-upload"
        />
        <ImageUpload
          value={v.hero_url}
          onChange={(url) => patch({ hero_url: url })}
          label="Imagen de respaldo (se usa solo si no hay video)"
          hint="Recomendado: JPG horizontal 1920×600 px (proporción 16:5) con foto de partido de fútbol infantil. Peso < 1 MB. Se recorta tipo cover centrado si la proporción no coincide exacto."
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías Festival (año completo, separadas por coma, ej: 2018, 2017, 2015...)</span>
            <input
              type="text"
              value={arrToCsv(v.festival?.categories)}
              onChange={(e) => patchFestival({ categories: csvToArr(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              placeholder="2018, 2017, 2015, 2016, 2014, 2013, 2012, 2011, 2010, 2009"
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías PARES (año completo, separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.categories_even)} onChange={(e) => patchPremier({ categories_even: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="2018, 2016, 2014, 2012, 2010" data-testid="premier-cats-even" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categorías IMPARES (año completo, separadas por coma)</span>
            <input type="text" value={arrToCsv(v.premier?.categories_odd)} onChange={(e) => patchPremier({ categories_odd: csvToArr(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="2017, 2015, 2013, 2011, 2009" data-testid="premier-cats-odd" />
          </label>
        </div>
      </SubSection>

      {/* Sección 5 — Estadio */}
      <SubSection title="5. Estadio Centenario (solo se muestra en tab PREMIER)">
        <ImageUpload value={v.stadium?.image_url} onChange={(u) => patchStadium({ image_url: u })} label="Imagen del estadio" hint="Se muestra en escala de grises. JPG horizontal 1920×600 px (proporción 16:5) recomendado. Se recorta tipo cover centrado." testId="stadium-image" />
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

      {/* Sección 7 — Escenarios (título + subtítulos; el carrusel de fotos único está en 7B) */}
      <SubSection title="7. Escenarios Deportivos — título y subtítulos">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Título grande" v={v.scenarios_title} onChange={(x) => patch({ scenarios_title: x })} placeholder="ESCENARIOS" />
          <Field label="Palabra cursiva" v={v.scenarios_cursive} onChange={(x) => patch({ scenarios_cursive: x })} placeholder="Deportivos!" />
          <Field label="Subtítulo línea 1" v={v.scenarios_subtitle_top} onChange={(x) => patch({ scenarios_subtitle_top: x })} placeholder="COMFENALCO" />
          <Field label="Subtítulo línea 2" v={v.scenarios_subtitle_bottom} onChange={(x) => patch({ scenarios_subtitle_bottom: x })} placeholder="ESTADIO DE ARMENIA" />
        </div>
      </SubSection>

      {/* Sección 7B — Galería Escenarios Deportivos (única galería de fotos de esta sección, sin título) */}
      <SubSection title="7B. Galería Escenarios Deportivos — carrusel de fotos (sin título)">
        <ImageListUpload
          label="Fotos del carrusel"
          hint="Se muestran 3 a la vez con navegación ← →. JPG horizontal 1200×800 px (proporción 3:2) — las 3 fotos usan ese mismo marco. Se recorta tipo cover centrado si la proporción no coincide exacto. Va justo debajo de Escenarios Deportivos, sin título."
          values={v.scenarios_gallery_2 || []}
          onChange={(arr) => patch({ scenarios_gallery_2: arr })}
          testId="scenarios-gallery-2"
        />
      </SubSection>

      {/* Sección 8 — Premiación */}
      <SubSection title="8. Premiación — título y galería de fotos">
        <Field label="Título grande" v={v.premiacion_title} onChange={(x) => patch({ premiacion_title: x })} placeholder="PREMIACIÓN" />
        <label className="block mt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subtítulo</span>
          <textarea rows={2} value={v.premiacion_subtitle || ""} onChange={(e) => patch({ premiacion_subtitle: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="EN LA FSC CADA NIÑO ES UN TESORO..." />
        </label>
        <div className="mt-4">
          <ImageListUpload
            label="Galería de fotos de premiación (carrusel automático)"
            hint="Tamaño recomendado: 1200×800 px horizontal (proporción 3:2). Se acepta cualquier formato de imagen (JPG, PNG, WEBP, HEIC, etc.). Se recorta tipo cover centrado si la proporción no coincide exacto. Se rota sola cada 4-5 segundos con crossfade; con 1 sola foto se muestra fija."
            values={v.premiacion_gallery || []}
            onChange={(arr) => patch({ premiacion_gallery: arr })}
            testId="premiacion-gallery"
          />
        </div>
      </SubSection>

      {/* Sección 9 — Clubes */}
      <SubSection title="9. Clubes que han Participado">
        <Field label="Título" v={v.clubs_title} onChange={(x) => patch({ clubs_title: x })} placeholder="Clubes que han Participado" />
        <div className="mt-3">
          <ImageListUpload
            label="Escudos de clubes"
            hint="Tamaño recomendado: 300×300 px (cuadrado), fondo transparente PNG. Se acepta cualquier formato de imagen. Se muestran en una cinta horizontal que se desplaza sola en loop infinito (nunca se apilan en varias líneas)."
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
function EstadisticasEditor({ value, onChange, tournaments = [], fixtures = [] }) {
  const v = value || {};
  const patch = (p) => onChange({ ...v, ...p });
  const events = v.events || [];
  const updateEvent = (idx, evPatch) => onChange({ ...v, events: events.map((e, i) => i === idx ? { ...e, ...evPatch } : e) });
  const removeEvent = (idx) => onChange({ ...v, events: events.filter((_, i) => i !== idx) });
  const addEvent = () => onChange({ ...v, events: [...events, { key: `evento-${Date.now()}`, label: "Nuevo evento", title_month: "", title_word: "", title_style: "cursive_gold", logo_url: "", categories: [] }] });

  return (
    <div className="space-y-6" data-testid="estadisticas-editor">
      <SubSection title="1. Hero — imagen + textos">
        <ImageUpload value={v.hero_url} onChange={(u) => patch({ hero_url: u })} label="Imagen del Hero (recibe overlay rojo)" hint="JPG horizontal 1920×600 px (proporción 16:5) con foto de partido de fútbol infantil. Se recorta tipo cover centrado si la proporción no coincide exacto." testId="stats-hero" />
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
                renderItem={(it, ci, upd) => {
                  const selectedTournament = tournaments.find((t) => t.id === it.tournament_id);
                  const catOptions = selectedTournament ? (selectedTournament.categories || []).map((c) => c.name).filter(Boolean) : [];
                  const hasLegacyCat = it.category && !catOptions.includes(it.category);
                  // Iter74: los grupos se leen de los fixtures REALES (no texto libre), para evitar
                  // desajustes de mayúsculas/typos entre lo guardado aquí y lo que el generador de fixture escribió.
                  const groupOptions = Array.from(new Set(
                    fixtures
                      .filter((f) => f.tournament_id === it.tournament_id && f.category === it.category)
                      .map((f) => f.group_name || "")
                      .filter(Boolean)
                  ));
                  const hasLegacyGroup = it.group_name && !groupOptions.includes(it.group_name);
                  return (
                    <div className="grid md:grid-cols-4 gap-2">
                      <Field label="Etiqueta visible" v={it.label} onChange={(x) => upd({ label: x })} placeholder="CAT: 2010" />
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evento (torneo)</span>
                        <select
                          value={it.tournament_id || ""}
                          onChange={(e) => upd({ tournament_id: e.target.value, category: "", group_name: "" })}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                          data-testid={`stats-cats-${idx}-tournament-${ci}`}
                        >
                          <option value="">Seleccionar evento...</option>
                          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.season}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</span>
                        <select
                          value={it.category || ""}
                          onChange={(e) => upd({ category: e.target.value, group_name: "" })}
                          disabled={!it.tournament_id && !it.category}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm disabled:bg-slate-50"
                          data-testid={`stats-cats-${idx}-category-${ci}`}
                        >
                          <option value="">Seleccionar categoría...</option>
                          {hasLegacyCat && <option value={it.category}>{it.category} (valor guardado)</option>}
                          {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Grupo (según fixture real)</span>
                        <select
                          value={it.group_name || ""}
                          onChange={(e) => upd({ group_name: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                          data-testid={`stats-cats-${idx}-group-${ci}`}
                        >
                          <option value="">Todos los grupos</option>
                          {hasLegacyGroup && <option value={it.group_name}>{it.group_name} (valor guardado, no coincide con ningún fixture)</option>}
                          {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </label>
                    </div>
                  );
                }}
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

      <SubSection title="4. Frase de cierre de Estadísticas (opcional, legacy — ya no se muestra en esta página)">
        <p className="text-xs text-slate-500 italic">
          Nota: la sección SÍGUENOS Y NO TE PIERDAS fue eliminada de esta página específica. La frase "Somos más que un Torneo" ahora se edita arriba, en "Footer / Contacto", y aparece a todo el ancho en el footer de TODAS las páginas. Estos campos legacy permanecen guardados por si se necesitan reactivar.
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
        <ImageUpload value={v.hero_url} onChange={(u) => patch({ hero_url: u })} label="Imagen del Hero (recibe overlay azul)" hint="JPG horizontal 1920×600 px (proporción 16:5) con foto de partido de fútbol infantil. Se recorta tipo cover centrado si la proporción no coincide exacto." testId="noticias-hero" />
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
              <ImageUpload value={cat.image_url} onChange={(u) => updateCat(ci, { image_url: u })} label="Imagen de fondo (con overlay rojo semitransparente)" hint="JPG horizontal 16:9 (ej. 1280×720 px). Se recorta tipo cover centrado si la proporción no coincide exacto." testId={`noticias-cat-img-${ci}`} />
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
  const add = () => onChange([...items, { id: `news-${Date.now()}`, title: "Nueva noticia", body: "", images: [], video_url: "", published: true }]);

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
              hint="JPG horizontales 16:9, máx 6 imágenes recomendado. Se recortan tipo cover centrado si la proporción no coincide exacto."
              values={n.images || []}
              onChange={(arr) => update(i, { images: arr })}
              testId={`${testId}-imgs-${i}`}
            />
          </div>
          <div className="mt-2">
            <VideoUpload
              label="Video de la noticia (opcional)"
              hint="Si cargas un video, el público lo verá al abrir esta noticia (máx 150MB)."
              value={n.video_url}
              onChange={(u) => update(i, { video_url: u })}
              testId={`${testId}-video-${i}`}
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
      <SubSection title="2. Decoración inferior — cancha + palmeras (una sola imagen)">
        <ImageUpload
          value={v.field_url}
          onChange={(u) => patch({ field_url: u })}
          label="Imagen decorativa (cancha + palmeras combinada)"
          hint="PNG con fondo transparente, cancha con palmeras a los lados. Se superpone sobre el borde inferior del formulario (las palmeras quedan a los costados, la cancha debajo)."
          testId="contacto-field"
        />
      </SubSection>
    </div>
  );
}

