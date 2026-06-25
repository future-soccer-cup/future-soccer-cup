import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, ChevronUp, Calendar, MessageCircle, Mail, Instagram, Facebook } from "lucide-react";

const HERO_IMG_DEFAULT = "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80";
const MASCOT_DEFAULT = "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80";

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

  const visibleGallery = (() => {
    if (gallery.length === 0) return [null, null, null];
    const arr = [];
    for (let i = 0; i < 3; i++) arr.push(gallery[(gIdx + i) % gallery.length] || null);
    return arr;
  })();

  const festivalCats = (s.festival_categories && s.festival_categories.length) ? s.festival_categories : ["Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18"];
  const premierCatsPar = (s.premier_categories_par && s.premier_categories_par.length) ? s.premier_categories_par : ["Sub-8", "Sub-10", "Sub-12"];
  const premierCatsImp = (s.premier_categories_imp && s.premier_categories_imp.length) ? s.premier_categories_imp : ["Sub-9", "Sub-11", "Sub-13"];

  const STENCIL = { fontFamily: "'Anton', 'Barlow Condensed', sans-serif", letterSpacing: "0.02em" };

  return (
    <div className="min-h-screen" data-testid="home-fsc-v2" style={{ background: "#fff", fontFamily: "'Barlow', 'Inter', sans-serif" }}>
      {/* ======= HERO — split horizontal azul→rojo con niños superpuestos ======= */}
      <section className="relative overflow-hidden" data-testid="home-hero">
        <div className="relative w-full" style={{ minHeight: "600px" }}>
          {/* Mitad superior azul */}
          <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: BLUE }} />
          {/* Mitad inferior roja */}
          <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: RED }} />
          {/* Imagen de fondo (niños) cubriendo todo, opacidad para mezclar con colores */}
          <img src={s.hero_image_url || HERO_IMG_DEFAULT} alt="Future Soccer Cup" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80" />
          {/* Contenido superpuesto */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16" style={{ minHeight: "600px" }}>
            <div className="flex items-start justify-end">
              <span className="text-2xl md:text-4xl text-white italic" style={{ fontFamily: "'Allura', 'Dancing Script', cursive", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }} data-testid="hero-tagline">
                Torneo Internacional
              </span>
            </div>
            <div className="mt-12 lg:mt-16">
              <h1 className="text-white font-black uppercase leading-[0.85]" style={{ ...STENCIL, fontSize: "clamp(72px, 12vw, 200px)", textShadow: "4px 4px 0 rgba(0,0,0,0.25)" }} data-testid="hero-edition">
                {s.hero_edition_label || "EDICIÓN"}
              </h1>
              <div className="text-white font-black uppercase leading-[0.85]" style={{ ...STENCIL, fontSize: "clamp(96px, 16vw, 260px)", textShadow: "4px 4px 0 rgba(0,0,0,0.25)" }} data-testid="hero-year">
                {s.hero_edition_year || "2026"}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-block px-6 py-3 bg-white font-bold uppercase tracking-[0.15em] text-sm md:text-base rounded shadow-lg" style={{ color: BLUE }} data-testid="hero-month-1">{s.hero_month_1 || "Octubre"}</span>
                <span className="inline-block px-6 py-3 bg-white font-bold uppercase tracking-[0.15em] text-sm md:text-base rounded shadow-lg" style={{ color: BLUE }} data-testid="hero-month-2">{s.hero_month_2 || "Diciembre"}</span>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-start" style={{ color: BLUE }}>
              <ChevronUp size={28} strokeWidth={3} className="rotate-180" />
              <ChevronUp size={28} strokeWidth={3} className="rotate-180 -mt-3" />
            </div>
          </div>
        </div>
      </section>

      {/* ======= STATS ======= */}
      <section className="py-16 lg:py-24 bg-white" data-testid="home-stats">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-black uppercase leading-[0.95]" style={{ ...STENCIL, color: RED, fontSize: "clamp(48px, 7vw, 96px)" }}>
            SOMOS MÁS<br/>QUE UN TORNEO
          </h2>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-6">
            {[
              { n: s.stat_1_number, l: s.stat_1_label, dn: "11", dl: "Ediciones" },
              { n: s.stat_2_number, l: s.stat_2_label, dn: "+1K", dl: "clubes participantes" },
              { n: s.stat_3_number, l: s.stat_3_label, dn: "+100", dl: "clubes Internacionales" },
              { n: s.stat_4_number, l: s.stat_4_label, dn: "+10K", dl: "Deportistas" },
            ].map((it, i) => (
              <div key={i} className="flex flex-col items-center" data-testid={`home-stat-${i + 1}`}>
                <div className="font-black leading-none" style={{ ...STENCIL, color: RED, fontSize: "clamp(64px, 9vw, 128px)" }}>{it.n || it.dn}</div>
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
                <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden" style={{ background: BLUE }} data-testid={`gallery-item-${i}`}>
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
            <h2 className="font-black uppercase leading-none" style={{ ...STENCIL, color: RED, fontSize: "clamp(56px, 9vw, 128px)" }}>FINALES</h2>
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
          <h2 className="font-black uppercase leading-tight" style={{ ...STENCIL, color: RED, fontSize: "clamp(40px, 6vw, 80px)" }} data-testid="region-title">
            {s.region_title || "EL EJE CAFETERO LOS ESPERA"}
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

      {/* ======= FOOTER ======= */}
      <footer className="py-16 lg:py-20" style={{ background: RED }} data-testid="home-footer">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <h2 className="font-black uppercase text-white leading-[0.9]" style={{ ...STENCIL, fontSize: "clamp(40px, 6vw, 88px)" }} data-testid="footer-heading">
            {(s.footer_heading || "¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?").split(" ").map((w, i) => (
              <span key={i} className="block">{w}</span>
            ))}
          </h2>
          <div className="text-white space-y-5 lg:text-left">
            {s.contact_phone && (
              <a href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "").replace(/\D/g, "")}`} className="flex items-center gap-4 text-xl md:text-2xl font-bold hover:opacity-80" data-testid="footer-whatsapp">
                <span className="bg-white rounded-full p-2 inline-flex items-center justify-center"><MessageCircle size={24} style={{ color: "#25D366" }} /></span>
                {s.contact_phone || "+57 324 6134658"}
              </a>
            )}
            {s.contact_email && (
              <a href={`mailto:${s.contact_email}`} className="flex items-center gap-4 text-xl md:text-2xl font-bold hover:opacity-80" data-testid="footer-email">
                <span className="bg-white rounded-full p-2 inline-flex items-center justify-center"><Mail size={24} style={{ color: BLUE }} /></span>
                {s.contact_email}
              </a>
            )}
            <div className="flex items-center gap-3 pt-2">
              {s.instagram && (
                <a href={s.instagram} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex" data-testid="footer-instagram">
                  <Instagram size={22} style={{ color: "#E4405F" }} />
                </a>
              )}
              {s.facebook && (
                <a href={s.facebook} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex" data-testid="footer-facebook">
                  <Facebook size={22} style={{ color: BLUE }} />
                </a>
              )}
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
          : <h3 className="font-black uppercase tracking-tight" style={{ fontFamily: "'Anton', sans-serif", color: "#e31f27", fontSize: "clamp(28px, 4vw, 48px)" }}>{title}</h3>}
      </div>
      <div className="rounded-2xl p-3 bg-white" style={{ border: `3px solid #e31f27` }}>
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            <div className="text-base md:text-lg font-bold mb-2" style={{ color: "#0640c8" }}>{g.label}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {g.items.map((c, i) => (
                <div key={i} className="h-7 md:h-8 rounded" style={{ background: "#e31f27" }} data-testid={`${testId}-item-${gi}-${i}`} title={c}>
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
