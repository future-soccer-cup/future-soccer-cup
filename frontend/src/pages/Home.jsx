import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, ChevronUp, Calendar, MessageCircle, Mail, Instagram, Facebook } from "lucide-react";

// Imagen de fondo del hero — estadio/gradas con público (placeholder reemplazable desde CMS)
const HERO_BG_DEFAULT = "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1920&q=80";
// Imagen superpuesta del hero — niños jugando fútbol (placeholder reemplazable desde CMS)
const HERO_FG_DEFAULT = "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=85";
// Logo FSC (wordmark) — placeholder reemplazable desde CMS
const NAV_LOGO_DEFAULT = "https://customer-assets.emergentagent.com/job_fixture-stats-pro/artifacts/y4ulg6l9_FUTRE%20SOCCER%20CUP%202025_Mesa%20de%20trabajo%201.png";
// Escudo FSC (logo circular con león) — placeholder reemplazable desde CMS
const NAV_SHIELD_DEFAULT = "https://customer-assets.emergentagent.com/job_fixture-stats-pro/artifacts/y4ulg6l9_FUTRE%20SOCCER%20CUP%202025_Mesa%20de%20trabajo%201.png";
const MASCOT_DEFAULT = "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80";

const RED = "#e31f27";
const BLUE = "#0640c8";
const GRAY = "#dedfe0";

const STENCIL = { fontFamily: "'Anton', 'Barlow Condensed', sans-serif", letterSpacing: "0.01em" };
const PLANE_CRASH = { fontFamily: "'Plane Crash', 'Anton', 'Barlow Condensed', sans-serif", letterSpacing: "0.01em" };
const NEO_SANS = { fontFamily: "'Neo Sans Std', 'Neo Sans', 'Exo 2', 'Barlow', 'Inter', sans-serif" };
// Plane Crash es una fuente cuyos glifos de letras están mapeados a las MINÚSCULAS;
// las MAYÚSCULAS y los acentos caen a pictogramas decorativos. Normalizamos a minúsculas sin diacríticos.
const planeCrashSafe = (str) => String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const CURSIVE = { fontFamily: "'Natura Script', 'Allura', 'Dancing Script', cursive" };

export default function Home() {
  const [s, setS] = useState({});
  const [gallery, setGallery] = useState([]);
  const [gIdx, setGIdx] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get("/home-settings").catch(() => ({ data: {} })),
      api.get("/gallery").catch(() => ({ data: [] })),
    ]).then(([sr, gr]) => {
      setS(sr.data || {});
      setGallery((gr.data || []).slice(0, 15));
    });
  }, []);

  const visibleGallery = (() => {
    if (gallery.length === 0) return [null, null, null];
    const arr = [];
    for (let i = 0; i < 3; i++) arr.push(gallery[(gIdx + i) % gallery.length] || null);
    return arr;
  })();

  const festivalCats = (s.festival_categories && s.festival_categories.length) ? s.festival_categories : ["Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18"];
  const premierCatsPar = (s.premier_categories_par && s.premier_categories_par.length) ? s.premier_categories_par : ["Sub-8", "Sub-10", "Sub-12"];
  const premierCatsImp = (s.premier_categories_imp && s.premier_categories_imp.length) ? s.premier_categories_imp : ["Sub-9", "Sub-11", "Sub-13"];

  return (
    <div className="min-h-screen" data-testid="home-fsc-v2" style={{ background: "#fff", fontFamily: "'Barlow', 'Inter', sans-serif" }}>
      {/* ======= HERO — navbar embebida + foto fondo + cutout niños + EDICIÓN 2026 ======= */}
      <section className="relative overflow-hidden" data-testid="home-hero">
        <div className="relative w-full" style={{ minHeight: "720px" }}>
          {/* (1) FONDO: estadio/gradas, ocupa todo el hero, recibe el overlay de color */}
          <img
            src={s.hero_image_url || HERO_BG_DEFAULT}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
            data-testid="hero-bg-image"
          />
          {/* Overlay azul (arriba 55%) + rojo (abajo 45%) en mix-blend para teñir SÓLO el fondo */}
          <div className="absolute inset-x-0 top-0 mix-blend-multiply pointer-events-none" style={{ height: "55%", background: BLUE }} />
          <div className="absolute inset-x-0 bottom-0 mix-blend-multiply pointer-events-none" style={{ height: "45%", background: RED }} />
          {/* Capa azul más oscura SOLO en la zona del texto (lado izquierdo) para legibilidad */}
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[55%] pointer-events-none" style={{ background: "linear-gradient(to right, rgba(6,64,200,0.55), transparent 80%)" }} />

          {/* (2) IMAGEN SUPERPUESTA: niños jugando — pegada al borde derecho, nítida, sin tinte */}
          <img
            src={s.hero_foreground_url || HERO_FG_DEFAULT}
            alt="Future Soccer Cup — niños jugando"
            className="hidden md:block absolute top-0 right-0 h-full object-cover object-bottom pointer-events-none drop-shadow-2xl"
            style={{ width: "42%", zIndex: 5 }}
            data-testid="hero-foreground-image"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />

          {/* === NAVBAR EMBEBIDA EN EL HERO === */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-8 pt-5">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-3" data-testid="nav-logo-link">
                {/* Escudo / logo circular del FSC (a la izquierda del wordmark) */}
                <img
                  src={s.nav_shield_url || NAV_SHIELD_DEFAULT}
                  alt="Escudo Future Soccer Cup"
                  className="h-16 md:h-20 w-auto drop-shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  data-testid="nav-shield"
                />
                {/* Wordmark / logo en imagen (oculto si no hay URL) */}
                {(s.nav_logo_url || NAV_LOGO_DEFAULT) && (
                  <img
                    src={s.nav_logo_url || NAV_LOGO_DEFAULT}
                    alt="Future Soccer Cup"
                    className="h-12 md:h-16 w-auto drop-shadow-lg hidden lg:block"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    data-testid="nav-logo-img"
                  />
                )}
                <span className="hidden sm:inline-block font-black leading-[0.85] text-white drop-shadow-md" style={{ ...PLANE_CRASH, fontSize: "clamp(18px, 2vw, 28px)" }}>
                  {planeCrashSafe("FUTUR")}<br/>{planeCrashSafe("SOCCER")}<br/>{planeCrashSafe("CUP")}
                </span>
              </Link>
              <span className="hidden md:inline-block text-white italic text-3xl lg:text-5xl drop-shadow-md" style={CURSIVE} data-testid="hero-cursive-tagline">
                Torneo Internacional
              </span>
            </div>
            {/* Barra blanca con links */}
            <div className="mt-4 bg-white rounded-md shadow-md px-2 md:px-4 py-1 flex flex-wrap items-center gap-1 md:gap-0" data-testid="hero-nav-bar">
              {[
                { to: "/", label: "INICIO", end: true },
                { to: "/nosotros", label: "NOSOTROS" },
                { to: "/eventos", label: "EVENTOS" },
                { to: "/datos-estadisticas", label: "ESTADÍSTICAS" },
                { to: "/noticias", label: "NOTICIAS" },
                { to: "/contacto", label: "CONTÁCTO" },
              ].map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => `px-3 md:px-4 py-2 font-black uppercase tracking-wider text-[11px] md:text-sm transition ${isActive ? "text-white rounded" : "hover:opacity-80"}`}
                  style={({ isActive }) => ({ ...NEO_SANS, background: isActive ? BLUE : "transparent", color: isActive ? "#fff" : RED })}
                  data-testid={`nav-link-${n.label.toLowerCase()}`}
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="flex-1" />
              <NavLink to="/login" className="px-3 md:px-4 py-2 font-black uppercase tracking-wider text-[11px] md:text-sm hover:opacity-80" style={{ ...NEO_SANS, color: RED }} data-testid="nav-link-ingreso">INGRESO</NavLink>
              <NavLink to="/registro-equipo" className="px-3 md:px-4 py-2 font-black uppercase tracking-wider text-[11px] md:text-sm hover:opacity-80" style={{ ...NEO_SANS, color: RED }} data-testid="nav-link-registro">REGISTRO</NavLink>
            </div>
          </div>

          {/* === TEXTOS DEL HERO === */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-12">
            <div className="md:w-[55%]">
              <h1 className="text-white font-black leading-[0.85]" style={{ ...PLANE_CRASH, fontSize: "clamp(64px, 11vw, 180px)", textShadow: "3px 3px 0 rgba(0,0,0,0.25)" }} data-testid="hero-edition">
                {planeCrashSafe(s.hero_edition_label || "EDICION")}
              </h1>
              <div className="text-white font-black leading-[0.85]" style={{ ...PLANE_CRASH, fontSize: "clamp(96px, 16vw, 240px)", textShadow: "3px 3px 0 rgba(0,0,0,0.25)" }} data-testid="hero-year">
                {planeCrashSafe(s.hero_edition_year || "2026")}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-block px-4 py-1 bg-white font-bold uppercase tracking-wider text-xs md:text-sm rounded shadow" style={{ ...NEO_SANS, color: BLUE }} data-testid="hero-month-1">
                  {s.hero_month_1 || "Octubre"}
                </span>
                <span className="inline-block px-4 py-1 bg-white font-bold uppercase tracking-wider text-xs md:text-sm rounded shadow" style={{ ...NEO_SANS, color: BLUE }} data-testid="hero-month-2">
                  {s.hero_month_2 || "Diciembre"}
                </span>
              </div>
              <div className="mt-6 flex flex-col items-start ml-3 text-white" data-testid="hero-chevron">
                <ChevronUp size={28} strokeWidth={3} className="rotate-180 opacity-90" />
                <ChevronUp size={28} strokeWidth={3} className="rotate-180 opacity-90 -mt-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= STATS ======= */}
      <section className="py-16 lg:py-24 bg-white" data-testid="home-stats">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-black leading-[0.95]" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(48px, 7vw, 96px)" }}>
            {planeCrashSafe("SOMOS MAS")}<br/>{planeCrashSafe("QUE UN TORNEO")}
          </h2>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-6">
            {[
              { n: s.stat_1_number, l: s.stat_1_label, dn: "11", dl: "Ediciones" },
              { n: s.stat_2_number, l: s.stat_2_label, dn: "+1K", dl: "clubes participantes" },
              { n: s.stat_3_number, l: s.stat_3_label, dn: "+100", dl: "clubes Internacionales" },
              { n: s.stat_4_number, l: s.stat_4_label, dn: "+10K", dl: "Deportistas" },
            ].map((it, idx) => (
              <div key={it.dl} className="flex flex-col items-center" data-testid={`home-stat-${idx + 1}`}>
                <div className="font-black leading-none whitespace-nowrap" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(40px, 5vw, 80px)" }}>{planeCrashSafe(it.n || it.dn)}</div>
                <div className="mt-2 font-bold text-base lg:text-lg" style={{ color: BLUE }}>{it.l || it.dl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= GALERÍA + FINALES (título DEBAJO) ======= */}
      <section className="py-12 lg:py-16 bg-white" data-testid="home-finales">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            <button
              onClick={() => setGIdx((i) => (i - 1 + Math.max(gallery.length, 1)) % Math.max(gallery.length, 1))}
              className="absolute -left-2 lg:-left-10 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-prev"
              style={{ color: BLUE }}
            ><ChevronLeft size={32} strokeWidth={3} /></button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleGallery.map((img, i) => (
                <div key={img?.id || img?.url || `gallery-slot-${i}`} className="aspect-[4/3] rounded-lg overflow-hidden" style={{ background: BLUE }} data-testid={`gallery-item-${i}`}>
                  {img && <img src={img.url || img.image_url || ""} alt={img.title || ""} className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
            <button
              onClick={() => setGIdx((i) => (i + 1) % Math.max(gallery.length, 1))}
              className="absolute -right-2 lg:-right-10 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-next"
              style={{ color: BLUE }}
            ><ChevronRight size={32} strokeWidth={3} /></button>
          </div>
          <div className="mt-8 text-center">
            <h2 className="font-black leading-none" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(56px, 9vw, 128px)" }}>{planeCrashSafe("FINALES")}</h2>
            <p className="mt-1 text-xl md:text-2xl font-bold" style={{ color: BLUE }} data-testid="finales-subtitle">
              {s.finales_subtitle || "Estadio Centenario de Armenia"}
            </p>
            <Link
              to={s.finales_button_url || "/nosotros"}
              data-testid="finales-cta"
              className="inline-block mt-4 px-6 py-2 text-white font-bold tracking-wide rounded shadow"
              style={{ background: BLUE }}
            >
              {s.finales_button_label || "Conoce más de FSC"}
            </Link>
            <div className="mt-6 flex justify-center flex-col items-center" style={{ color: BLUE }}>
              <ChevronUp size={28} strokeWidth={3} />
              <ChevronUp size={28} strokeWidth={3} className="-mt-3" />
            </div>
          </div>
        </div>
      </section>

      {/* ======= EJE CAFETERO + MASCOTA + 2 COLUMNAS DE CATEGORÍAS ======= */}
      <section className="pt-12 pb-20 bg-white" data-testid="home-region">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-black leading-tight" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(40px, 6vw, 80px)" }} data-testid="region-title">
            {planeCrashSafe(s.region_title || "EL EJE CAFETERO LOS ESPERA")}
          </h2>
          <p className="text-2xl md:text-3xl font-bold mb-6" style={{ color: BLUE }} data-testid="region-subtitle">
            {s.region_subtitle || "Comfenalco Soleden"}
          </p>
        </div>
        {/* Layout 3 columnas: Festival - Mascota CENTRADA - Premier */}
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 items-start" data-testid="home-categories">
            {/* FESTIVAL */}
            <CategoryColumn
              title="FESTIVAL"
              dateBadge={s.festival_date_badge || "2 oct"}
              logoUrl={s.festival_logo_url}
              ctaUrl={s.festival_cta_url || "/registro-equipo"}
              groups={[{ label: "Categorias", items: festivalCats }]}
              testId="cat-festival"
            />
            {/* Mascota centrada (oculta en mobile, visible en lg) */}
            <div className="hidden lg:flex justify-center items-end" data-testid="mascot-box">
              <img src={s.mascot_image_url || MASCOT_DEFAULT} alt="Mascota Future Soccer Cup" className="max-h-[520px] w-auto object-contain" />
            </div>
            {/* PREMIER */}
            <CategoryColumn
              title="PREMIER"
              dateBadge={s.premier_date_badge || "2 oct"}
              logoUrl={s.premier_logo_url}
              ctaUrl={s.premier_cta_url || "/registro-equipo"}
              groups={[
                { label: "Categorias par", items: premierCatsPar },
                { label: "Categorias imp", items: premierCatsImp },
              ]}
              testId="cat-premier"
            />
          </div>
          {/* Mascota mobile: debajo */}
          <div className="lg:hidden flex justify-center mt-8">
            <img src={s.mascot_image_url || MASCOT_DEFAULT} alt="Mascota Future Soccer Cup" className="max-h-[400px] w-auto object-contain" />
          </div>
        </div>
      </section>

      {/* ======= FOOTER ROJO (estilo wireframe FSC v2) ======= */}
      <footer className="py-16 lg:py-24" style={{ background: RED }} data-testid="home-footer">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Izquierda: heading en 4 líneas (grunge stencil blanco) */}
          <h2 className="font-black text-white leading-[0.95]" style={{ ...PLANE_CRASH, fontSize: "clamp(36px, 5vw, 72px)" }} data-testid="footer-heading">
            <span className="block">{planeCrashSafe("Y SI NOS")}</span>
            <span className="block">{planeCrashSafe("TOMAMOS")}</span>
            <span className="block">{planeCrashSafe("UN CAFECITO")}</span>
            <span className="block">{planeCrashSafe("JUNTOS?")}</span>
          </h2>
          {/* Derecha: contactos */}
          <div className="text-white space-y-6">
            <a
              href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "573246134658").replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-4 hover:opacity-80"
              data-testid="footer-whatsapp"
            >
              <span className="bg-[#25D366] rounded-full p-3 inline-flex shadow-md">
                <MessageCircle size={28} className="text-white" strokeWidth={2.4} />
              </span>
              <span className="font-black tracking-wider text-2xl md:text-3xl lg:text-4xl" style={PLANE_CRASH}>
                {planeCrashSafe(s.contact_phone || "+57 324 6134658")}
              </span>
            </a>
            <a
              href={`mailto:${s.contact_email || "info@futuresoccercup.com"}`}
              className="flex items-center gap-4 hover:opacity-80"
              data-testid="footer-email"
            >
              <span className="bg-white rounded-full p-3 inline-flex shadow-md" style={{ color: BLUE }}>
                <Mail size={28} strokeWidth={2.4} />
              </span>
              <span className="font-black tracking-wider text-2xl md:text-3xl lg:text-4xl break-all" style={PLANE_CRASH}>
                {planeCrashSafe(s.contact_email || "info@futuresoccercup.com")}
              </span>
            </a>
            <div className="flex items-center gap-3 pl-1 pt-2">
              <a
                href={s.instagram || "https://instagram.com"}
                target="_blank" rel="noreferrer"
                className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition"
                data-testid="footer-instagram"
                aria-label="Instagram"
              >
                <Instagram size={28} style={{ color: "#E4405F" }} strokeWidth={2} />
              </a>
              <a
                href={s.facebook || "https://facebook.com"}
                target="_blank" rel="noreferrer"
                className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition"
                data-testid="footer-facebook"
                aria-label="Facebook"
              >
                <Facebook size={28} style={{ color: BLUE }} strokeWidth={2} fill={BLUE} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ======= WHATSAPP FLOTANTE ======= */}
      <a
        href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "573246134658").replace(/\D/g, "")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-full p-4 shadow-2xl"
        data-testid="floating-whatsapp"
        aria-label="WhatsApp"
      >
        <MessageCircle size={28} strokeWidth={2.5} />
      </a>
    </div>
  );
}

function CategoryColumn({ title, dateBadge, logoUrl, ctaUrl, groups, testId }) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="relative" style={{ color: "#0640c8" }}>
          <Calendar size={36} strokeWidth={2} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase pt-1.5" style={{ color: "#0640c8" }}>{dateBadge}</span>
        </div>
        {logoUrl
          ? <img src={logoUrl} alt={title} className="h-10" />
          : <h3 className="font-black tracking-tight" style={{ ...PLANE_CRASH, color: "#e31f27", fontSize: "clamp(28px, 4vw, 48px)" }}>{planeCrashSafe(title)}</h3>}
      </div>
      <div className="rounded-2xl p-3 bg-white" style={{ border: `3px solid #e31f27` }}>
        {groups.map((g, gi) => (
          <div key={g.label || `group-${gi}`} className={gi > 0 ? "mt-3" : ""}>
            <div className="text-base md:text-lg font-bold mb-2" style={{ color: "#0640c8" }}>{g.label}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {g.items.map((c, i) => (
                <div key={`${g.label}-${c}-${i}`} className="h-7 md:h-8 rounded" style={{ background: "#e31f27" }} data-testid={`${testId}-item-${gi}-${i}`} title={c}>
                  <span className="sr-only">{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link to={ctaUrl} data-testid={`${testId}-cta`} className="inline-block mt-4 px-6 py-2 font-bold text-white rounded shadow text-sm md:text-base" style={{ background: "#0640c8" }}>
        Acepta el reto
      </Link>
    </div>
  );
}
