import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { FSC_LOGO, imgSrc } from "../lib/api";
import { ArrowRight, MapPin, Calendar, Trophy, Users, ChevronLeft, ChevronRight } from "lucide-react";

const HERO_DEFAULT =
  "https://images.pexels.com/photos/32694240/pexels-photo-32694240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1100&w=1800";
const ABOUT_DEFAULT =
  "https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";

export default function Home() {
  const [settings, setSettings] = useState({});
  const [featured, setFeatured] = useState(null);
  const [events, setEvents] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/home-settings"),
      api.get("/tournaments"),
      api.get("/gallery"),
    ]).then(([s, t, g]) => {
      if (!alive) return;
      setSettings(s.data || {});
      const ts = (t.data || []).filter((x) => !x.archived);
      setFeatured(ts.find((x) => x.featured) || ts[0] || null);
      setEvents(ts);
      // Galería en orden aleatorio en cada carga
      const gImgs = [...(g.data || [])];
      for (let i = gImgs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gImgs[i], gImgs[j]] = [gImgs[j], gImgs[i]];
      }
      setGallery(gImgs);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Auto-rotación aleatoria de la galería cada 5 segundos.
  useEffect(() => {
    if (gallery.length < 2) return;
    const t = setInterval(() => {
      setGalleryIdx((prev) => {
        if (gallery.length <= 1) return 0;
        let next = Math.floor(Math.random() * gallery.length);
        // Evitar repetir el mismo índice 2 veces consecutivas.
        if (next === prev) next = (prev + 1) % gallery.length;
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [gallery.length]);

  const heroImg = settings.hero_image_url ? imgSrc(settings.hero_image_url) : HERO_DEFAULT;
  const aboutImg = settings.about_image_url ? imgSrc(settings.about_image_url) : ABOUT_DEFAULT;
  // Próximo evento: estático en settings (si tiene nombre) o torneo destacado/primero
  const showUpcomingStatic = !!settings.upcoming_name;
  const upcoming = showUpcomingStatic ? {
    name: settings.upcoming_name,
    city: settings.upcoming_city,
    venue: settings.upcoming_venue,
    start_date: settings.upcoming_start_date,
    end_date: settings.upcoming_end_date,
    categories: settings.upcoming_categories,
    cover_url: settings.upcoming_cover_url ? imgSrc(settings.upcoming_cover_url) : null,
  } : featured ? {
    name: featured.name,
    city: featured.city || "",
    venue: featured.venue || "",
    start_date: featured.start_date,
    end_date: featured.end_date,
    categories: featured.category || "",
    cover_url: featured.cover_url ? imgSrc(featured.cover_url) : null,
  } : null;

  return (
    <div data-testid="home-page" className="bg-fsc-gris/20">
      {/* ============= HERO ============= */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center bg-gradient-to-br from-white via-fsc-gris/40 to-white">
        {/* Marca de agua: escudo FSC suave */}
        <div className="absolute inset-0 flex items-center justify-end pr-[-10%] pointer-events-none" aria-hidden="true">
          <img src={FSC_LOGO} alt="" className="h-[120%] w-auto opacity-[0.06] select-none" />
        </div>
        {/* Imagen de fondo opcional, muy sutil */}
        {settings.hero_image_url && (
          <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url(${heroImg})` }} />
        )}
        <div className="absolute inset-0 fsc-grain pointer-events-none opacity-30" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fsc-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border-2 border-fsc-azul text-fsc-azul text-[10px] font-bold uppercase tracking-[0.3em]" data-testid="hero-edition">
              <Trophy size={11}/> {settings.hero_edition || `Edición ${new Date().getFullYear()}`}
            </div>

            <h1 className="mt-6 font-display text-6xl sm:text-7xl md:text-8xl lg:text-[110px] leading-[0.85] text-fsc-negro tracking-wider">
              {settings.hero_title || "FUTURE\nSOCCER CUP"}
            </h1>
            <p className="font-cursive text-3xl sm:text-4xl text-fsc-rojo mt-3">
              {settings.hero_subtitle || "Somos más que un torneo"}
            </p>

            <p className="mt-8 text-lg text-slate-700 max-w-2xl leading-relaxed">
              La copa oficial del fútbol formativo infantil y juvenil de Colombia.
              Una iniciativa del Grupo Empresarial Ancla.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to={settings.hero_cta_url || "/registro-equipo"} className="fsc-btn-primary px-7 py-3.5 rounded-md text-sm flex items-center gap-2 group" data-testid="hero-cta-btn">
                {settings.hero_cta_label || "Inscribe tu equipo"}
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16}/>
              </Link>
              <Link to="/eventos" className="fsc-btn-dark px-7 py-3.5 rounded-md text-sm" data-testid="hero-events-btn">
                Ver eventos
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 hidden lg:block fsc-slide-in">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-fsc-azul/40 via-fsc-rojo/20 to-fsc-azul/40 rounded-3xl blur-2xl" />
              <div className="relative bg-fsc-negro border-2 border-fsc-azul p-12 rounded-2xl">
                <img src={FSC_LOGO} alt="Future Soccer Cup" className="w-full max-w-sm mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Tira inferior dorada con texto */}
        <div className="absolute bottom-0 left-0 right-0 bg-fsc-azul text-fsc-negro py-2 overflow-hidden">
          <div className="flex gap-12 whitespace-nowrap font-display text-sm tracking-[0.3em] animate-[scroll_30s_linear_infinite]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>FUTURE SOCCER CUP · SOMOS MÁS QUE UN TORNEO · COLOMBIA ·</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============= PRÓXIMO EVENTO ============= */}
      {upcoming && (
        <section className="bg-white py-20 border-t-4 border-fsc-azul" data-testid="upcoming-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block">
                <div className="font-cursive text-3xl text-fsc-azul">próximo evento</div>
                <h2 className="font-display text-5xl md:text-6xl tracking-wider text-fsc-negro">PREMIER FSC</h2>
                <div className="h-1 w-24 bg-fsc-rojo mx-auto mt-3" />
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-center bg-fsc-negro rounded-2xl overflow-hidden border-2 border-fsc-azul fsc-card-shadow">
              <div className="lg:col-span-5 relative aspect-square lg:aspect-auto lg:h-full min-h-[400px]">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${upcoming.cover_url || heroImg})` }} />
                <div className="absolute inset-0 bg-gradient-to-tr from-fsc-negro via-fsc-negro/50 to-transparent" />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <img src={FSC_LOGO} alt="" className="h-16 w-16" />
                  <span className="font-display text-fsc-azul text-2xl tracking-wider">FSC {new Date().getFullYear()}</span>
                </div>
              </div>

              <div className="lg:col-span-7 p-8 lg:p-12 text-white">
                <h3 className="font-display text-4xl md:text-5xl tracking-wider text-fsc-azul leading-tight">
                  {upcoming.name}
                </h3>
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  {upcoming.start_date && (
                    <InfoChip
                      icon={<Calendar size={18}/>}
                      label="Fechas"
                      value={`${upcoming.start_date} → ${upcoming.end_date || ""}`}
                    />
                  )}
                  {upcoming.city && <InfoChip icon={<MapPin size={18}/>} label="Ciudad" value={upcoming.city} />}
                  {upcoming.venue && <InfoChip icon={<Trophy size={18}/>} label="Sede" value={upcoming.venue} />}
                  {upcoming.categories && <InfoChip icon={<Users size={18}/>} label="Categorías" value={upcoming.categories} />}
                </div>
                <Link to="/registro-equipo" className="mt-8 fsc-btn-primary px-7 py-3.5 rounded-md text-sm inline-flex items-center gap-2 group" data-testid="upcoming-register-btn">
                  Inscribe tu equipo AQUÍ
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16}/>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============= NOSOTROS ============= */}
      <section className="bg-fsc-negro text-white py-20 relative overflow-hidden" data-testid="about-section">
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="fsc-fade-up">
            <div className="font-cursive text-2xl text-fsc-azul">conócenos</div>
            <h2 className="font-display text-5xl md:text-6xl tracking-wider mt-1">NOSOTROS</h2>
            <div className="h-1 w-20 bg-fsc-azul mt-3 mb-7" />
            <h3 className="font-display text-2xl md:text-3xl text-fsc-azul tracking-wider mb-4">
              {settings.about_title || "Somos más que un torneo"}
            </h3>
            <p className="text-fsc-gris/90 leading-relaxed whitespace-pre-line">
              {settings.about_body || "Future Soccer Cup es una iniciativa del Grupo Empresarial Ancla para impulsar el talento del fútbol infantil y juvenil en Colombia. Reunimos clubes, familias y formadores en una experiencia integral con calidad deportiva, hospedaje y turismo."}
            </p>
            <Link to="/nosotros" className="mt-8 fsc-btn-dark inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm" data-testid="about-more-btn">
              Saber más <ArrowRight size={16}/>
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-2 bg-fsc-azul rounded-2xl rotate-2" />
            <img src={aboutImg} alt="" className="relative rounded-2xl w-full h-[460px] object-cover border-2 border-fsc-azul" />
          </div>
        </div>
      </section>

      {/* ============= EVENTOS ACTIVOS ============= */}
      {events.length > 0 && (
        <section className="py-20 bg-white" data-testid="events-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <div className="font-cursive text-2xl text-fsc-azul">nuestros</div>
                <h2 className="font-display text-5xl md:text-6xl tracking-wider text-fsc-negro">EVENTOS</h2>
                <div className="h-1 w-20 bg-fsc-rojo mt-3" />
              </div>
              <Link to="/eventos" className="text-fsc-negro hover:text-fsc-azul font-bold uppercase text-sm tracking-widest flex items-center gap-2">
                Ver todos <ArrowRight size={14}/>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((e) => (
                <EventCard key={e.id} ev={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============= GALERÍA ============= */}
      {gallery.length > 0 && (
        <section className="py-20 bg-fsc-gris/30 text-fsc-negro relative" data-testid="gallery-section">
          <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none" />
          {/* Marca de agua del escudo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <img src={FSC_LOGO} alt="" className="h-[80%] w-auto opacity-[0.04] select-none" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="font-cursive text-2xl text-fsc-rojo">recuerdos</div>
              <h2 className="font-display text-5xl md:text-6xl tracking-wider text-fsc-negro">GALERÍA</h2>
              <div className="h-1 w-20 bg-fsc-azul mx-auto mt-3" />
            </div>
            <GalleryCarousel images={gallery} idx={galleryIdx} setIdx={setGalleryIdx} />
          </div>
        </section>
      )}
    </div>
  );
}

function InfoChip({ icon, label, value }) {
  return (
    <div className="border border-fsc-azul/40 rounded-md p-3 bg-white/5">
      <div className="flex items-center gap-2 text-fsc-azul text-[10px] font-bold uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function EventCard({ ev }) {
  return (
    <Link to="/datos-estadisticas" className="group block bg-white border-2 border-fsc-negro rounded-xl overflow-hidden fsc-card-shadow" data-testid={`event-card-${ev.id}`}>
      <div className="aspect-[16/9] bg-fsc-negro relative overflow-hidden">
        {ev.cover_url ? (
          <img src={imgSrc(ev.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 fsc-stripe opacity-40 bg-fsc-azul-noche flex items-center justify-center">
            <img src={FSC_LOGO} alt="" className="h-24 w-24 opacity-80" />
          </div>
        )}
        {ev.featured && (
          <span className="absolute top-3 right-3 bg-fsc-azul text-fsc-negro text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Destacado</span>
        )}
      </div>
      <div className="p-5">
        <div className="font-cursive text-xl text-fsc-azul-oscuro">edición {ev.season || ""}</div>
        <h3 className="font-display text-2xl tracking-wider text-fsc-negro mt-1">{ev.name}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-600">
          {ev.start_date && <span className="flex items-center gap-1"><Calendar size={12}/> {ev.start_date}</span>}
          {ev.city && <span className="flex items-center gap-1"><MapPin size={12}/> {ev.city}</span>}
        </div>
        {/* Todas las categorías inscritas — chips */}
        {((ev.categories && ev.categories.length > 0) || ev.category) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(ev.categories && ev.categories.length > 0
              ? ev.categories.map((c) => c.name).filter(Boolean)
              : [ev.category]
            ).map((cat) => (
              <span key={cat} className="text-[10px] font-bold uppercase tracking-widest bg-fsc-azul/10 text-fsc-azul-oscuro border border-fsc-azul/30 px-2 py-0.5 rounded">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function GalleryCarousel({ images, idx, setIdx }) {
  const visible = 3;
  const max = Math.max(0, images.length - visible);
  return (
    <div className="relative" data-testid="gallery-carousel" data-active-idx={idx}>
      <div className="overflow-hidden">
        <div className="flex gap-4 transition-transform duration-500" style={{ transform: `translateX(-${idx * (100 / visible)}%)` }}>
          {images.map((g, i) => (
            <div key={g.id} className="flex-none w-full sm:w-1/2 lg:w-1/3 group" data-testid={`gallery-slide-${i}`} data-active={i === idx ? "1" : "0"}>
              <div className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-fsc-azul/30 group-hover:border-fsc-azul transition-colors">
                <img src={imgSrc(g.image_url)} alt={g.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              {g.title && <div className="mt-3 font-display text-lg tracking-wider text-fsc-azul">{g.title}</div>}
              {g.caption && <div className="text-xs text-slate-600">{g.caption}</div>}
            </div>
          ))}
        </div>
      </div>
      {images.length > visible && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} className="h-10 w-10 rounded-full border-2 border-fsc-azul text-fsc-azul hover:bg-fsc-azul hover:text-fsc-negro transition-colors flex items-center justify-center disabled:opacity-30" disabled={idx === 0} data-testid="gallery-prev">
            <ChevronLeft size={18}/>
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-fsc-gris">{idx + 1} / {max + 1}</span>
          <button onClick={() => setIdx(Math.min(max, idx + 1))} className="h-10 w-10 rounded-full border-2 border-fsc-azul text-fsc-azul hover:bg-fsc-azul hover:text-fsc-negro transition-colors flex items-center justify-center disabled:opacity-30" disabled={idx === max} data-testid="gallery-next">
            <ChevronRight size={18}/>
          </button>
        </div>
      )}
    </div>
  );
}
