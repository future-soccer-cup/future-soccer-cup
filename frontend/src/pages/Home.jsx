import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useLoginModal } from "../context/LoginModalContext";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, ChevronRight, Calendar, Mail, Instagram, Facebook, LogOut, UserCircle2, Shield, Menu, X } from "lucide-react";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { PLANE_CRASH, AGENCY_FB, NEO_SANS, STENCIL, CURSIVE, renderPlaneCrash, RED, BLUE, GRAY } from "../lib/designSystem";
import ChevronStack from "../components/ChevronStack";
import AnimateIn from "../components/AnimateIn";
import Counter from "../components/Counter";
import ImageCarousel from "../components/ImageCarousel";
import { StretchedTagline } from "../components/StretchedTagline";
import { motion, AnimatePresence } from "framer-motion";

const scrollToStats = (e) => {
  if (e) e.preventDefault();
  const el = document.querySelector("[data-testid='home-stats']");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Home() {
  const { openLogin } = useLoginModal();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); };
  const [s, setS] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [gIdx, setGIdx] = useState(0);
  // Dirección del último cambio (+1 = avance / next, -1 = retroceso / prev).
  // Se usa para que el slide horizontal entre/salga por el lado correcto.
  const [gDirection, setGDirection] = useState(1);
  const advanceGallery = (dir) => {
    setGDirection(dir);
    setGIdx((i) => {
      const len = Math.max(gallery.length, 1);
      return ((i + dir) % len + len) % len;
    });
  };

  useEffect(() => {
    Promise.all([
      api.get("/home-settings").catch(() => ({ data: {} })),
      api.get("/gallery").catch(() => ({ data: [] })),
    ]).then(([sr, gr]) => {
      setS(sr.data || {});
      setGallery((gr.data || []).slice(0, 15));
    });
  }, []);

  // Auto-rotate de la galería de Finales: cada 5s avanza 1 posición (loop infinito).
  // Solo si hay más de 3 imágenes (con ≤3 no aporta nada porque ya se ven todas).
  useEffect(() => {
    if (gallery.length <= 3) return;
    const t = setInterval(() => {
      setGDirection(1);
      setGIdx((i) => (i + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(t);
  }, [gallery.length]);

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
        {/* (1) STACK FONDO + OVERLAYS — aislado para que el multiply NO afecte la imagen de los niños */}
        <div className="absolute inset-0 pointer-events-none" style={{ isolation: "isolate", background: BLUE }}>
          {s.hero_image_url && (
            <img
              src={s.hero_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 30%" }}
              data-testid="hero-bg-image"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          {/* Overlay azul (arriba 55%) + rojo (abajo 45%) — multiply SOLO sobre el fondo (aislado) */}
          <div className="absolute inset-x-0 top-0 mix-blend-multiply" style={{ height: "55%", background: BLUE }} />
          <div className="absolute inset-x-0 bottom-0 mix-blend-multiply" style={{ height: "45%", background: RED }} />
          {/* Capa azul más oscura SOLO en la zona del texto (lado izquierdo) para legibilidad */}
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[55%]" style={{ background: "linear-gradient(to right, rgba(6,64,200,0.55), transparent 80%)" }} />
        </div>

        {/* (2) CONTENIDO CONSTRINGIDO AL ANCHO DEL NAVBAR (max-w-7xl) — incluye texto + imagen niños */}
        <div className="relative max-w-7xl mx-auto px-4 md:px-8" style={{ minHeight: "780px" }}>
          {/* IMAGEN SUPERPUESTA: carrusel de imágenes (niños jugando) — dentro del bloque,
              alineado al borde derecho del navbar. Crossfade automático cada 4.5s. */}
          {(() => {
            const list = (s.hero_foreground_urls && s.hero_foreground_urls.length > 0)
              ? s.hero_foreground_urls
              : (s.hero_foreground_url ? [s.hero_foreground_url] : []);
            if (list.length === 0) return null;
            // Caso 1 imagen: ImageCarousel renderiza un <img> plano con className+style merged.
            // Caso 2+ imágenes: ImageCarousel envuelve en un <div> con position:relative;
            //   en ese caso necesitamos darle un height fijo (top+bottom no funciona con
            //   parent min-height en todos los browsers). 585px = 75% de 780px (parent minHeight).
            const isMulti = list.length > 1;
            return (
              <ImageCarousel
                images={list}
                intervalMs={4500}
                fadeMs={1000}
                alt="Future Soccer Cup — niños jugando"
                className={isMulti
                  ? "hidden md:block absolute right-4 md:right-8 bottom-0 pointer-events-none drop-shadow-2xl"
                  : "hidden md:block absolute right-4 md:right-8 bottom-0 pointer-events-none drop-shadow-2xl"}
                style={isMulti
                  ? { width: "45%", height: "585px", zIndex: 5 }
                  : { width: "45%", height: "75%", objectFit: "contain", objectPosition: "bottom right", zIndex: 5 }}
                imgStyle={isMulti
                  ? { width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom right" }
                  : null}
                testId="hero-foreground-carousel"
              />
            );
          })()}

          {/* === NAVBAR EMBEBIDA EN EL HERO === */}
          <div className="relative z-30 pt-5">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-3" data-testid="nav-logo-link">
                {/* Escudo / logo circular del FSC (solo si el admin sube una imagen) */}
                {s.nav_shield_url && (
                  <img
                    src={s.nav_shield_url}
                    alt="Escudo Future Soccer Cup"
                    className="h-16 md:h-20 w-auto drop-shadow-lg"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    data-testid="nav-shield"
                  />
                )}
                {/* Wordmark / logo en imagen (solo si admin sube una imagen explícita) */}
                {s.nav_logo_url && (
                  <img
                    src={s.nav_logo_url}
                    alt="Future Soccer Cup"
                    className="h-12 md:h-16 w-auto drop-shadow-lg hidden lg:block"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    data-testid="nav-logo-img"
                  />
                )}
                <span className="hidden sm:inline-block font-black leading-[0.85] text-white drop-shadow-md" style={{ ...PLANE_CRASH, fontSize: "clamp(20px, 2.2vw, 32px)" }}>
                  {renderPlaneCrash("FUTUR")}<br/>{renderPlaneCrash("SOCCER")}<br/>{renderPlaneCrash("CUP")}
                </span>
              </Link>
              <StretchedTagline text="Torneo Internacional" color="#ffffff" className="drop-shadow-md" testId="hero-cursive-tagline" />
            </div>
            {/* Barra blanca con links — más padding y tipografía más grande */}
            <div className="mt-5 bg-white rounded-md shadow-md px-3 md:px-5 py-2 md:py-3" data-testid="hero-nav-bar">
              <div className="flex items-center justify-between lg:hidden">
                <span className="font-black uppercase text-sm tracking-wider" style={{ ...AGENCY_FB, color: RED }}>MENÚ</span>
                <button
                  type="button"
                  onClick={() => setNavOpen(!navOpen)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700"
                  aria-label="Menú"
                  data-testid="hero-nav-mobile-toggle"
                >
                  {navOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
              <div className={`${navOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row lg:items-center gap-1 mt-2 lg:mt-0`}>
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
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) => `px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl transition ${isActive ? "text-white rounded" : "hover:opacity-80"}`}
                    style={({ isActive }) => ({ ...AGENCY_FB, background: isActive ? BLUE : "transparent", color: isActive ? "#fff" : RED })}
                    data-testid={`nav-link-${n.label.toLowerCase()}`}
                  >
                    {n.label}
                  </NavLink>
                ))}
                <div className="flex-1 hidden lg:block" />
                {user ? (
                  <>
                    {user.role === "admin" && (
                      <NavLink to="/admin" onClick={() => setNavOpen(false)} className="px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl flex items-center gap-1.5 hover:opacity-80" style={{ ...AGENCY_FB, color: BLUE }} data-testid="nav-link-admin">
                        <Shield size={16}/> ADMIN
                      </NavLink>
                    )}
                    {user.role === "team" && (
                      <NavLink to="/mi-equipo" onClick={() => setNavOpen(false)} className="px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl flex items-center gap-1.5 hover:opacity-80" style={{ ...AGENCY_FB, color: RED }} data-testid="nav-link-mi-equipo">
                        <UserCircle2 size={16}/> MI EQUIPO
                      </NavLink>
                    )}
                    <button type="button" onClick={() => { setNavOpen(false); handleLogout(); }} className="px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl flex items-center gap-1.5 hover:opacity-80" style={{ ...AGENCY_FB, color: RED }} data-testid="nav-logout">
                      <LogOut size={16}/> SALIR
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setNavOpen(false); openLogin(); }} className="px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl hover:opacity-80 text-left" style={{ ...AGENCY_FB, color: RED }} data-testid="nav-link-ingreso">INGRESO</button>
                    <NavLink to="/registro-equipo" onClick={() => setNavOpen(false)} className="px-4 md:px-5 py-2 md:py-3 font-black uppercase tracking-wider text-lg md:text-xl hover:opacity-80" style={{ ...AGENCY_FB, color: RED }} data-testid="nav-link-registro">REGISTRO</NavLink>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* === TEXTOS DEL HERO === */}
          <div className="relative z-10 pt-10 md:pt-14 pb-12">
            <div className="md:w-[50%]">
              <h1
                className="fsc-needs-plane-crash fsc-anim-hero-edition text-white font-black leading-[0.85]"
                style={{ ...PLANE_CRASH, fontSize: "clamp(56px, 8.5vw, 140px)", textShadow: "3px 3px 0 rgba(0,0,0,0.25)" }}
                data-testid="hero-edition"
              >
                {renderPlaneCrash(s.hero_edition_label || "EDICION")}
              </h1>
              <div
                className="fsc-needs-plane-crash fsc-anim-hero-year text-white font-black leading-[0.85]"
                style={{ ...PLANE_CRASH, fontSize: "clamp(80px, 12vw, 180px)", textShadow: "3px 3px 0 rgba(0,0,0,0.25)" }}
                data-testid="hero-year"
              >
                {renderPlaneCrash(s.hero_edition_year || "2026")}
              </div>
              <div
                className="fsc-anim-hero-badges mt-6 inline-flex flex-col items-center gap-5"
              >
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={scrollToStats}
                    className="inline-block px-6 py-2.5 bg-white font-bold uppercase tracking-wider text-xl md:text-2xl rounded shadow cursor-pointer transition hover:scale-[1.04] hover:shadow-lg"
                    style={{ ...AGENCY_FB, color: BLUE }}
                    data-testid="hero-month-1"
                  >
                    {s.hero_month_1 || "Octubre"}
                  </button>
                  <button
                    type="button"
                    onClick={scrollToStats}
                    className="inline-block px-6 py-2.5 bg-white font-bold uppercase tracking-wider text-xl md:text-2xl rounded shadow cursor-pointer transition hover:scale-[1.04] hover:shadow-lg"
                    style={{ ...AGENCY_FB, color: BLUE }}
                    data-testid="hero-month-2"
                  >
                    {s.hero_month_2 || "Diciembre"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={scrollToStats}
                  aria-label="Bajar a la siguiente sección"
                  className="fsc-bounce cursor-pointer bg-transparent border-0"
                  data-testid="hero-chevron"
                >
                  <ChevronStack color="#ffffff" size={48} direction="up" count={5} testId="hero-chevron-stack" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= STATS ======= */}
      <section className="py-16 lg:py-24 bg-white" data-testid="home-stats">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <AnimateIn as="h2" variant="slide-up" className="font-black leading-[0.95]" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(48px, 7vw, 96px)" }}>
            {renderPlaneCrash("SOMOS MAS")}<br/>{renderPlaneCrash("QUE UN TORNEO")}
          </AnimateIn>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-6">
            {[
              { n: s.stat_1_number, l: s.stat_1_label, dn: "11", dl: "Ediciones" },
              { n: s.stat_2_number, l: s.stat_2_label, dn: "+1K", dl: "clubes participantes" },
              { n: s.stat_3_number, l: s.stat_3_label, dn: "+100", dl: "clubes Internacionales" },
              { n: s.stat_4_number, l: s.stat_4_label, dn: "+10K", dl: "Deportistas" },
            ].map((it, idx) => (
              <AnimateIn key={it.dl} variant="fade" delay={idx * 0.1} className="flex flex-col items-center" data-testid={`home-stat-${idx + 1}`}>
                <Counter
                  value={it.n || it.dn}
                  duration={1800}
                  transform={renderPlaneCrash}
                  className="font-black leading-none whitespace-nowrap"
                  style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(40px, 5vw, 80px)" }}
                />
                <div className="mt-2 font-bold text-xl lg:text-2xl" style={{ ...AGENCY_FB, color: BLUE }}>{it.l || it.dl}</div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ======= GALERÍA + FINALES (título DEBAJO) ======= */}
      <section className="py-12 lg:py-16 bg-white" data-testid="home-finales">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            <button
              onClick={() => advanceGallery(-1)}
              className="absolute -left-3 sm:-left-5 lg:-left-8 2xl:-left-16 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-prev"
              style={{ color: BLUE }}
            ><ChevronLeft size={32} strokeWidth={3} /></button>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {visibleGallery.map((img, i) => {
                // En desktop: imagen del medio (i===1) toma 6 columnas; las laterales 3 cada una.
                const isMiddle = i === 1;
                const colSpan = isMiddle ? "md:col-span-6" : "md:col-span-3";
                const aspect = "aspect-[3/2]";
                const ringExtra = isMiddle ? "shadow-2xl ring-4 ring-white" : "shadow-md";
                const mobileVisibility = isMiddle ? "" : "hidden md:block";
                const slotKey = img?.id || img?.url || `__empty_${i}`;
                return (
                  <div
                    key={`slot-${i}`}
                    className={`${colSpan} ${aspect} ${ringExtra} ${mobileVisibility} rounded-lg overflow-hidden relative`}
                    style={{ background: "#ffffff" }}
                    data-testid={`gallery-item-${i}`}
                  >
                    <AnimatePresence initial={false} custom={gDirection} mode="popLayout">
                      {img && (
                        <motion.img
                          key={slotKey}
                          src={img.url || img.image_url || ""}
                          alt={img.title || ""}
                          loading="lazy"
                          custom={gDirection}
                          initial={(d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0.6 })}
                          animate={{ x: 0, opacity: 1 }}
                          exit={(d) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0.6 })}
                          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                          style={{ willChange: "transform, opacity" }}
                          draggable={false}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => advanceGallery(1)}
              className="absolute -right-3 sm:-right-5 lg:-right-8 2xl:-right-16 top-1/2 -translate-y-1/2 rounded-full p-2 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-next"
              style={{ color: BLUE }}
            ><ChevronRight size={32} strokeWidth={3} /></button>
          </div>
          <div className="mt-8 text-center">
            <AnimateIn as="h2" variant="slide-up" className="font-black leading-none" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(56px, 9vw, 128px)" }}>{renderPlaneCrash("FINALES")}</AnimateIn>
            <AnimateIn as="p" variant="slide-up" delay={0.15} className="mt-1 text-3xl md:text-4xl font-bold" style={{ ...AGENCY_FB, color: BLUE }} data-testid="finales-subtitle">
              {s.finales_subtitle || "Estadio Centenario de Armenia"}
            </AnimateIn>
            <Link
              to={s.finales_button_url || "/nosotros"}
              data-testid="finales-cta"
              className="inline-block mt-4 px-10 py-4 text-white font-bold tracking-wide rounded shadow text-xl md:text-2xl transition-transform duration-200 ease-out hover:scale-110 hover:shadow-xl"
              style={{ ...AGENCY_FB, background: BLUE }}
            >
              {s.finales_button_label || "Conoce más de FSC"}
            </Link>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => document.querySelector("[data-testid='home-region']")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                aria-label="Bajar a la siguiente sección"
                className="fsc-bounce cursor-pointer bg-transparent border-0"
                data-testid="finales-chevron"
              >
                <ChevronStack color={BLUE} size={56} direction="up" count={5} testId="finales-chevron-stack" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ======= EJE CAFETERO + MASCOTA + 2 COLUMNAS DE CATEGORÍAS ======= */}
      <section className="pt-12 pb-0 bg-white" data-testid="home-region">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <AnimateIn as="h2" variant="zoom-in" className="font-black leading-tight whitespace-nowrap" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(13px, 4.6vw, 58px)" }} data-testid="region-title">
            {renderPlaneCrash(s.region_title || "EL EJE CAFETERO LOS ESPERA")}
          </AnimateIn>
          <AnimateIn as="p" variant="fade" delay={0.3} className="text-4xl md:text-5xl font-bold mb-6" style={{ ...AGENCY_FB, color: BLUE }} data-testid="region-subtitle">
            {s.region_subtitle || "Comfenalco Soleden"}
          </AnimateIn>
        </div>
        {/* Fondo blanco con marco azul en "U": 2 franjas verticales en los bordes + 1 franja horizontal abajo (entre el león y el footer) */}
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-white pb-5 md:pb-10" data-testid="home-region-blue-strip">
          <div className="absolute inset-y-0 left-0 w-5 md:w-10" style={{ background: BLUE }} />
          <div className="absolute inset-y-0 right-0 w-5 md:w-10" style={{ background: BLUE }} />
          <div className="absolute bottom-0 left-0 right-0 h-5 md:h-10" style={{ background: BLUE }} />
          <div className="relative max-w-7xl mx-auto px-6 pt-6 pb-0 overflow-x-hidden lg:overflow-x-visible" data-testid="home-region-white-panel">
            {/* Layout 3 columnas: Festival - Mascota CENTRADA - Premier */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-14 items-start" data-testid="home-categories">
              {/* FESTIVAL */}
              <div className="relative z-10">
                <CategoryColumn
                  title={s.festival_title || "FESTIVAL"}
                  dateBadge={s.festival_date_badge || "2 oct"}
                  logoUrl={s.festival_logo_url}
                  ctaUrl={s.festival_cta_url || "/registro-equipo"}
                  groups={[{ label: "Categorias", items: festivalCats }]}
                  testId="cat-festival"
                />
              </div>
              {/* Espaciador — reserva la columna central para que Festival/Premier queden a los lados; la mascota real se posiciona absoluta más abajo para poder crecer sin la restricción de ancho de esta columna */}
              <div className="hidden lg:block" style={{ minHeight: "800px" }} data-testid="mascot-box" />
              {/* PREMIER */}
              <div className="relative z-10">
                <CategoryColumn
                  title={s.premier_title || "PREMIER"}
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
            </div>
            {/* Mascota real (desktop) — el div externo centra/posiciona (no lo toca framer-motion), el AnimateIn interno solo anima el fade/slide del <img>. Altura igual a la del espaciador (var --mascot-h) para que la base quede pegada al fondo de la sección */}
            {s.mascot_image_url && (
              <div className="hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-0" style={{ height: "820px" }} data-testid="mascot-box-img-wrap">
                <AnimateIn variant="slide-up" distance={64} duration={0.8} style={{ height: "100%" }}>
                  <img src={s.mascot_image_url} alt="Mascota Future Soccer Cup" className="h-full w-auto max-w-none object-contain object-bottom" />
                </AnimateIn>
              </div>
            )}
            {/* Mascota mobile: debajo */}
            {s.mascot_image_url && (
              <AnimateIn variant="slide-up" distance={64} className="lg:hidden flex justify-center mt-8">
                <img src={s.mascot_image_url} alt="Mascota Future Soccer Cup" loading="lazy" className="max-h-[640px] w-auto object-contain" />
              </AnimateIn>
            )}
          </div>
        </div>
      </section>

      {/* ======= WHATSAPP FLOTANTE ======= */}
      {/* Se movió a FloatingWhatsApp.jsx (renderizado global en PublicLayout) para que aparezca en todas las páginas */}
    </div>
  );
}

function CategoryColumn({ title, dateBadge, logoUrl, ctaUrl, groups, testId }) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
        <div className="relative" style={{ color: "#0640c8" }}>
          <Calendar size={36} strokeWidth={2} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase pt-1.5" style={{ color: "#0640c8" }}>{dateBadge}</span>
        </div>
        {logoUrl && (
          <img src={logoUrl} alt={title} className="h-10 w-auto" data-testid={`${testId}-logo`} />
        )}
        {title && (
          <h3 className="font-black tracking-tight" style={{ ...PLANE_CRASH, color: "#e31f27", fontSize: "clamp(28px, 4vw, 48px)" }} data-testid={`${testId}-title`}>
            {renderPlaneCrash(title)}
          </h3>
        )}
      </div>
      <div className="rounded-2xl p-3 bg-white" style={{ border: `3px solid #e31f27` }}>
        {groups.map((g, gi) => (
          <div key={g.label || `group-${gi}`} className={gi > 0 ? "mt-3" : ""}>
            <div className="text-3xl md:text-4xl font-bold mb-2" style={{ ...AGENCY_FB, color: "#0640c8" }}>{g.label}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {g.items.map((c, i) => (
                <div
                  key={`${g.label}-${c}-${i}`}
                  className="h-10 md:h-12 rounded flex items-center justify-center px-1 cursor-pointer transition-transform duration-200 ease-out hover:scale-110 hover:shadow-lg"
                  style={{ background: "#e31f27" }}
                  data-testid={`${testId}-item-${gi}-${i}`}
                  title={c}
                >
                  <span className="text-white font-bold text-lg md:text-xl leading-none tracking-wide" style={AGENCY_FB}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link to={ctaUrl} data-testid={`${testId}-cta`} className="inline-block mt-4 px-8 py-3 font-bold text-white rounded shadow text-2xl md:text-3xl transition-transform duration-200 ease-out hover:scale-110 hover:shadow-xl" style={{ ...AGENCY_FB, background: "#0640c8" }}>
        Acepta el reto
      </Link>
    </div>
  );
}
