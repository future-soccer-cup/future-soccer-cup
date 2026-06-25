import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, MessageCircle, Mail, Instagram, Facebook } from "lucide-react";

const HERO_IMG_DEFAULT = "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80";
const MASCOT_DEFAULT = "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80";

// Paleta FSC (manual de marca v2)
const RED = "#e31f27";
const BLUE = "#0640c8";
const GRAY = "#dedfe0";

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

  // Carrusel: 3 visibles, navegación con flechas (sin auto-scroll)
  const visibleGallery = (() => {
    if (gallery.length === 0) return [null, null, null];
    const arr = [];
    for (let i = 0; i < 3; i++) arr.push(gallery[(gIdx + i) % gallery.length] || null);
    return arr;
  })();

  const festivalCats = (s.festival_categories && s.festival_categories.length) ? s.festival_categories : ["Sub-8", "Sub-10", "Sub-12"];
  const premierCatsPar = (s.premier_categories_par && s.premier_categories_par.length) ? s.premier_categories_par : ["Sub-10", "Sub-12", "Sub-14"];
  const premierCatsImp = (s.premier_categories_imp && s.premier_categories_imp.length) ? s.premier_categories_imp : ["Sub-11", "Sub-13", "Sub-15"];

  return (
    <div className="min-h-screen" data-testid="home-fsc-v2" style={{ background: GRAY, fontFamily: "'Barlow', 'Inter', sans-serif" }}>
      {/* ======= SECCIÓN 2: HERO ======= */}
      <section className="relative" data-testid="home-hero">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px] lg:min-h-[560px]" style={{ background: BLUE }}>
          {/* Izquierda: textos */}
          <div className="flex flex-col justify-center px-8 lg:px-16 py-12 text-white">
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] opacity-80 italic" style={{ fontFamily: "'Dancing Script', cursive" }}>Torneo Internacional</span>
            <h1 className="mt-4 font-black uppercase leading-none" style={{ fontFamily: "'Anton', 'Barlow Condensed', sans-serif", fontSize: "clamp(56px, 9vw, 160px)" }} data-testid="hero-edition">
              {s.hero_edition_label || "EDICIÓN"}
            </h1>
            <div className="font-black leading-none mt-2" style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(96px, 14vw, 220px)", color: "#fff", WebkitTextStroke: `2px ${RED}` }} data-testid="hero-year">
              {s.hero_edition_year || "2026"}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-block px-5 py-2 bg-white text-[#0640c8] font-bold uppercase tracking-widest text-xs md:text-sm rounded-md shadow" data-testid="hero-month-1">{s.hero_month_1 || "Octubre"}</span>
              <span className="inline-block px-5 py-2 bg-white text-[#0640c8] font-bold uppercase tracking-widest text-xs md:text-sm rounded-md shadow" data-testid="hero-month-2">{s.hero_month_2 || "Diciembre"}</span>
            </div>
          </div>
          {/* Derecha: imagen */}
          <div className="relative overflow-hidden">
            <img src={s.hero_image_url || HERO_IMG_DEFAULT} alt="Future Soccer Cup" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
        {/* Banda roja inferior */}
        <div className="h-6 lg:h-8" style={{ background: RED }} />
        {/* Doble chevron centrado */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-5 z-10">
          <div className="bg-white rounded-full shadow-lg p-2 flex flex-col -gap-1" style={{ color: BLUE }}>
            <ChevronDown size={20} strokeWidth={3} />
            <ChevronDown size={20} strokeWidth={3} className="-mt-3" />
          </div>
        </div>
      </section>

      {/* ======= SECCIÓN 3: ESTADÍSTICAS ======= */}
      <section className="py-16 lg:py-20 bg-white" data-testid="home-stats">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-black uppercase tracking-tight leading-tight" style={{ color: RED, fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 5vw, 64px)" }}>
            SOMOS MÁS QUE UN TORNEO
          </h2>
          <div className="mt-10 lg:mt-14 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-4">
            {[
              { n: s.stat_1_number, l: s.stat_1_label, def_n: "11", def_l: "Ediciones" },
              { n: s.stat_2_number, l: s.stat_2_label, def_n: "+1K", def_l: "Clubes participantes" },
              { n: s.stat_3_number, l: s.stat_3_label, def_n: "+100", def_l: "Clubes internacionales" },
              { n: s.stat_4_number, l: s.stat_4_label, def_n: "+10K", def_l: "Deportistas" },
            ].map((it, i) => (
              <div key={i} className="flex flex-col items-center" data-testid={`home-stat-${i + 1}`}>
                <div className="font-black leading-none" style={{ color: RED, fontFamily: "'Anton', sans-serif", fontSize: "clamp(48px, 7vw, 96px)" }}>
                  {it.n || it.def_n}
                </div>
                <div className="mt-3 font-bold uppercase tracking-wider text-sm md:text-base" style={{ color: BLUE }}>
                  {it.l || it.def_l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= SECCIÓN 4: GALERÍA / FINALES ======= */}
      <section className="py-16 lg:py-20" style={{ background: GRAY }} data-testid="home-finales">
        <div className="max-w-7xl mx-auto px-6">
          {/* Carrusel 3 visibles */}
          <div className="relative">
            <button
              onClick={() => setGIdx((i) => (i - 1 + Math.max(gallery.length, 1)) % Math.max(gallery.length, 1))}
              className="absolute -left-2 lg:-left-12 top-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg p-3 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-prev"
              aria-label="Anterior"
              style={{ color: BLUE }}
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {visibleGallery.map((img, i) => (
                <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden shadow-md" style={{ background: BLUE }} data-testid={`gallery-item-${i}`}>
                  {img && (
                    <img src={img.url || img.image_url || img.image || ""} alt={img.title || ""} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setGIdx((i) => (i + 1) % Math.max(gallery.length, 1))}
              className="absolute -right-2 lg:-right-12 top-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg p-3 hover:scale-110 transition disabled:opacity-30 z-10"
              disabled={gallery.length === 0}
              data-testid="gallery-next"
              aria-label="Siguiente"
              style={{ color: BLUE }}
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>
          {/* Título + subtítulo + botón */}
          <div className="mt-10 text-center">
            <h2 className="font-black uppercase tracking-tight leading-none" style={{ color: RED, fontFamily: "'Anton', sans-serif", fontSize: "clamp(40px, 6vw, 88px)" }}>
              FINALES
            </h2>
            <p className="mt-2 italic text-lg md:text-xl" style={{ color: BLUE, fontFamily: "'Dancing Script', cursive" }} data-testid="finales-subtitle">
              {s.finales_subtitle || "Estadio Centenario de Armenia"}
            </p>
            <Link
              to={s.finales_button_url || "/nosotros"}
              data-testid="finales-cta"
              className="inline-block mt-6 px-8 py-3 text-white font-bold uppercase tracking-widest rounded-md shadow hover:opacity-90 transition"
              style={{ background: BLUE }}
            >
              {s.finales_button_label || "Conoce más de FSC"}
            </Link>
          </div>
        </div>
      </section>

      {/* ======= SECCIÓN 5: EJE CAFETERO + MASCOTA ======= */}
      <section className="py-16 lg:py-20 bg-white" data-testid="home-region">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-black uppercase tracking-tight leading-tight" style={{ color: RED, fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 5vw, 64px)" }} data-testid="region-title">
            {s.region_title || "EL EJE CAFETERO LOS ESPERA"}
          </h2>
          <p className="mt-2 italic text-xl md:text-2xl" style={{ color: BLUE, fontFamily: "'Dancing Script', cursive" }} data-testid="region-subtitle">
            {s.region_subtitle || "Comfenalco Soleden"}
          </p>
          <div className="mt-8 rounded-2xl mx-auto max-w-3xl aspect-[16/10] overflow-hidden flex items-center justify-center" style={{ background: BLUE }} data-testid="mascot-box">
            <img src={s.mascot_image_url || MASCOT_DEFAULT} alt="Mascota Future Soccer Cup" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      </section>

      {/* ======= SECCIÓN 6: FESTIVAL & PREMIER (2 columnas) ======= */}
      <section className="py-16 lg:py-20" style={{ background: GRAY }} data-testid="home-categories">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* FESTIVAL */}
          <div className="text-center" data-testid="cat-festival">
            <div className="flex items-center justify-center gap-3 mb-3">
              {s.festival_logo_url
                ? <img src={s.festival_logo_url} alt="Festival" className="h-12" />
                : <h3 className="font-black uppercase tracking-tighter" style={{ color: BLUE, fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 4vw, 56px)" }}>FESTIVAL</h3>}
              <Calendar size={32} style={{ color: BLUE }} />
            </div>
            <div className="inline-block px-6 py-2 mb-4 font-bold uppercase tracking-widest text-sm rounded-md shadow" style={{ background: BLUE, color: "#fff" }} data-testid="festival-date-badge">
              {s.festival_date_badge || "2 OCT"}
            </div>
            <div className="rounded-lg p-3 space-y-2" style={{ border: `4px solid ${RED}`, background: "#fff" }}>
              {festivalCats.length === 0 ? (
                <p className="text-slate-400 italic text-sm py-4">Sin categorías aún</p>
              ) : festivalCats.map((c, i) => (
                <div key={i} className="px-4 py-3 font-bold uppercase tracking-wider text-sm text-white rounded" style={{ background: RED }} data-testid={`festival-cat-${i}`}>
                  {c}
                </div>
              ))}
            </div>
            <Link to={s.festival_cta_url || "/registro-equipo"} data-testid="festival-cta" className="inline-block mt-6 px-8 py-3 font-bold uppercase tracking-widest rounded-md text-white shadow hover:opacity-90" style={{ background: BLUE }}>
              Acepta el reto
            </Link>
          </div>
          {/* PREMIER */}
          <div className="text-center" data-testid="cat-premier">
            <div className="flex items-center justify-center gap-3 mb-3">
              {s.premier_logo_url
                ? <img src={s.premier_logo_url} alt="Premier" className="h-12" />
                : <h3 className="font-black uppercase tracking-tighter" style={{ color: BLUE, fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 4vw, 56px)" }}>PREMIER</h3>}
              <Calendar size={32} style={{ color: BLUE }} />
            </div>
            <div className="inline-block px-6 py-2 mb-4 font-bold uppercase tracking-widest text-sm rounded-md shadow" style={{ background: BLUE, color: "#fff" }} data-testid="premier-date-badge">
              {s.premier_date_badge || "2 OCT"}
            </div>
            <div className="rounded-lg p-3 space-y-3" style={{ border: `4px solid ${RED}`, background: "#fff" }}>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-left pl-2" style={{ color: BLUE }}>Categorías par</div>
                <div className="space-y-2">
                  {premierCatsPar.map((c, i) => (
                    <div key={i} className="px-4 py-3 font-bold uppercase tracking-wider text-sm text-white rounded" style={{ background: RED }} data-testid={`premier-par-${i}`}>{c}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-left pl-2" style={{ color: BLUE }}>Categorías impar</div>
                <div className="space-y-2">
                  {premierCatsImp.map((c, i) => (
                    <div key={i} className="px-4 py-3 font-bold uppercase tracking-wider text-sm text-white rounded" style={{ background: RED }} data-testid={`premier-imp-${i}`}>{c}</div>
                  ))}
                </div>
              </div>
            </div>
            <Link to={s.premier_cta_url || "/registro-equipo"} data-testid="premier-cta" className="inline-block mt-6 px-8 py-3 font-bold uppercase tracking-widest rounded-md text-white shadow hover:opacity-90" style={{ background: BLUE }}>
              Acepta el reto
            </Link>
          </div>
        </div>
      </section>

      {/* ======= SECCIÓN 7: FOOTER ======= */}
      <footer className="py-12 lg:py-16" style={{ background: RED }} data-testid="home-footer">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <h2 className="font-black uppercase text-white leading-tight" style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(28px, 4vw, 56px)" }} data-testid="footer-heading">
            {s.footer_heading || "¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?"}
          </h2>
          <div className="text-white space-y-4 lg:text-right">
            {s.contact_phone && (
              <a href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "").replace(/\D/g, "")}`} className="inline-flex items-center gap-3 text-lg md:text-xl font-bold hover:opacity-80 transition lg:justify-end w-full" data-testid="footer-whatsapp">
                <MessageCircle size={24} className="shrink-0" />
                {s.contact_phone}
              </a>
            )}
            {s.contact_email && (
              <a href={`mailto:${s.contact_email}`} className="flex items-center gap-3 text-lg md:text-xl font-bold hover:opacity-80 transition lg:justify-end" data-testid="footer-email">
                <Mail size={24} className="shrink-0" />
                {s.contact_email}
              </a>
            )}
            <div className="flex items-center gap-4 lg:justify-end pt-2">
              {s.instagram && (
                <a href={s.instagram} target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition" data-testid="footer-instagram"><Instagram size={20} className="text-white" /></a>
              )}
              {s.facebook && (
                <a href={s.facebook} target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition" data-testid="footer-facebook"><Facebook size={20} className="text-white" /></a>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ======= BOTÓN FLOTANTE WHATSAPP ======= */}
      <a
        href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "573246134658").replace(/\D/g, "")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-full p-4 shadow-2xl transition"
        data-testid="floating-whatsapp"
        aria-label="Contáctanos por WhatsApp"
      >
        <MessageCircle size={28} strokeWidth={2.5} />
      </a>
    </div>
  );
}
