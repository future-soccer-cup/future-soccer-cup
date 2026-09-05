/**
 * Página Eventos — Future Soccer Cup (Iter58).
 * 9 secciones editables via CMS (home_settings.eventos):
 *  1. Hero con imagen (logo FSC centrado sobre imagen de fondo).
 *  2. Franja azul "Países que han Participado" + banderas.
 *  3. Selector FESTIVAL / EVENTOS Diseñados para ti / PREMIER (tabs).
 *  4A/4B. Contenido específico (título mes + categorías).
 *  5. Estadio Centenario (solo en PREMIER, con badge POR CONFIRMAR opcional).
 *  6. Día de Aventura (logos de actividades).
 *  7. Escenarios Deportivos (carrusel horizontal).
 *  8. Premiación (copas + individuales por evento activo).
 *  9. Clubes que han Participado (logos).
 */
import { useEffect, useState } from "react";
import api, { imgSrc } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, renderPlaneCrash, toTitleCaseForScript } from "../lib/designSystem";
import ChevronStack from "../components/ChevronStack";
import GalleryCarousel from "../components/GalleryCarousel";
import AnimateIn from "../components/AnimateIn";

const RED = "#e31f27";
const BLUE = "#0640c8";
const GOLD = "#f5c542";

export default function Eventos() {
  const [ev, setEv] = useState({});
  const [navLogo, setNavLogo] = useState("");
  const [tab, setTab] = useState("festival"); // "festival" | "premier"

  useEffect(() => {
    api.get("/home-settings").then((r) => {
      const d = r.data || {};
      setEv(d.eventos || {});
      setNavLogo(d.nav_logo_url || "");
    }).catch(() => {});
  }, []);

  const festival = ev.festival || {};
  const premier = ev.premier || {};
  const isFestival = tab === "festival";
  const active = isFestival ? festival : premier;

  return (
    <div data-testid="eventos-page" style={AGENCY_FB} className="bg-white">
      {/* SECCIÓN 1 — Hero */}
      <HeroSection heroVideoUrl={ev.hero_video_url} heroUrl={ev.hero_url} logoUrl={navLogo} />

      {/* SECCIÓN 2 — Países */}
      <CountriesBar title={ev.countries_title} countries={ev.countries || []} />

      {/* SECCIÓN 3 — Tabs */}
      <TabsBar
        tab={tab}
        onTab={setTab}
        festival={festival}
        premier={premier}
        center={{ top: ev.tabs_center_top, bottom: ev.tabs_center_bottom }}
      />

      {/* SECCIÓN 4 — Título + categorías del tab activo */}
      <EventTitleSection month={active.title_month} word={active.title_word} isFestival={isFestival} />

      {isFestival ? (
        <FestivalCategories categories={festival.categories || []} />
      ) : (
        <PremierCategories evenCats={premier.categories_even || []} oddCats={premier.categories_odd || []} />
      )}

      {/* SECCIÓN 5 — Estadio Centenario (solo PREMIER) */}
      {!isFestival && ev.stadium && <StadiumSection stadium={ev.stadium} />}

      {/* SECCIÓN 6 — Día de Aventura */}
      <AdventureSection title={ev.adventure_title} blocks={ev.adventure_blocks || []} />

      {/* SECCIÓN 7 — Escenarios */}
      <ScenariosSection
        title={ev.scenarios_title}
        cursive={ev.scenarios_cursive}
        subTop={ev.scenarios_subtitle_top}
        subBottom={ev.scenarios_subtitle_bottom}
      />

      {/* SECCIÓN 7B — Galería de Escenarios Deportivos (sin título, la única galería de esta sección) */}
      {ev.scenarios_gallery_2 && ev.scenarios_gallery_2.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-10 md:pb-14" data-testid="scenarios-gallery-2-section">
          <GalleryCarousel images={ev.scenarios_gallery_2.map((p) => imgSrc(p))} testIdPrefix="scenarios-gallery-2" accentColor={GOLD} />
        </section>
      )}

      {/* SECCIÓN 8 — Premiación (galería con transición automática) */}
      <PremiacionSection
        title={ev.premiacion_title}
        subtitle={ev.premiacion_subtitle}
        gallery={ev.premiacion_gallery || []}
      />

      {/* SECCIÓN 9 — Clubes */}
      <ClubsSection title={ev.clubs_title} logos={ev.clubs_logos || []} />
    </div>
  );
}


function HeroSection({ heroVideoUrl, heroUrl, logoUrl }) {
  return (
    <section className="relative w-full h-80 md:h-[460px] lg:h-[620px] bg-slate-100 overflow-hidden" data-testid="eventos-hero">
      {heroVideoUrl ? (
        <video
          src={imgSrc(heroVideoUrl)}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          data-testid="eventos-hero-video"
        />
      ) : heroUrl ? (
        <img src={imgSrc(heroUrl)} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300" style={AGENCY_FB}>Imagen no configurada</div>
      )}
      {logoUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={imgSrc(logoUrl)} alt="FSC" className="w-28 md:w-36 lg:w-44 drop-shadow-2xl" />
        </div>
      )}
    </section>
  );
}


function CountriesBar({ title, countries }) {
  const hasFlags = countries.length > 0;
  // 3 copias para garantizar que el track siempre sea más ancho que el contenedor (incluso con pocas
  // banderas) y así el desplazamiento cubra todo el ancho hasta el borde derecho, sin dejar hueco vacío.
  const track = hasFlags ? [...countries, ...countries, ...countries] : [];
  const durationSec = Math.max(16, countries.length * 4);
  return (
    <section className="w-full py-6 md:py-8 bg-white" data-testid="eventos-countries">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-5">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl shrink-0"
          style={{ ...AGENCY_FB, fontWeight: 800, color: RED }}
          data-testid="countries-title"
        >
          {title || "Países que han Participado"}
        </h2>
        {hasFlags ? (
          <div
            className="relative flex-1 w-full overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
          >
            <div className="flex items-center gap-8 md:gap-14 w-max" style={{ animation: `scroll3x ${durationSec}s linear infinite` }}>
              {track.map((c, i) => (
                <div
                  key={`country-${i}`}
                  className="flex items-center gap-2 shrink-0"
                  title={c.name}
                  data-testid={`country-${i % countries.length}`}
                >
                  {c.flag_url ? (
                    <img
                      src={imgSrc(c.flag_url)}
                      alt={c.name}
                      className="h-12 md:h-16 lg:h-20 w-auto object-contain rounded-sm shadow-md"
                      style={{ border: "1px solid rgba(0,0,0,0.12)" }}
                    />
                  ) : (
                    <span className="text-slate-400 text-xs italic px-2 py-1 border border-slate-200 rounded">{c.name || "—"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-sm italic" style={AGENCY_FB}>Aún no hay países configurados.</span>
        )}
      </div>
    </section>
  );
}


function TabsBar({ tab, onTab, festival, premier, center }) {
  const isFest = tab === "festival";
  const isPrem = tab === "premier";
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="eventos-tabs">
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        <button
          type="button"
          onClick={() => onTab("festival")}
          className={`text-center px-3 py-4 md:py-6 rounded-sm transition-all ${isFest ? "ring-4 ring-red-300 scale-[1.02]" : "opacity-90 hover:opacity-100"}`}
          style={{ background: RED }}
          data-testid="tab-festival"
        >
          <div className="leading-none" style={{ ...PLANE_CRASH, color: "#ffffff", fontSize: "clamp(1.5rem, 3.6vw, 3rem)" }}>
            {renderPlaneCrash(festival.tab_label || "FESTIVAL")}
          </div>
          <div className="text-white text-center mt-2 text-lg md:text-xl lg:text-2xl" style={AGENCY_FB}>
            {festival.tab_dates || ""}
          </div>
        </button>

        <div className="text-center px-3 py-4 md:py-6 bg-white flex flex-col items-center justify-center" data-testid="tab-center">
          <div className="leading-none" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(1.5rem, 3.6vw, 3rem)" }}>
            {renderPlaneCrash(center?.top || "EVENTOS")}
          </div>
          <div className="mt-1" style={{ ...AGENCY_FB, color: RED, fontWeight: 700, fontSize: "clamp(1.1rem, 2vw, 1.7rem)" }}>
            {center?.bottom || "Diseñados para ti"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onTab("premier")}
          className={`text-center px-3 py-4 md:py-6 rounded-sm transition-all ${isPrem ? "ring-4 ring-blue-300 scale-[1.02]" : "opacity-90 hover:opacity-100"}`}
          style={{ background: BLUE }}
          data-testid="tab-premier"
        >
          <div className="leading-none" style={{ ...PLANE_CRASH, color: "#ffffff", fontSize: "clamp(1.5rem, 3.6vw, 3rem)" }}>
            {renderPlaneCrash(premier.tab_label || "PREMIER")}
          </div>
          <div className="text-white text-center mt-2 text-base md:text-lg lg:text-xl space-y-0.5" style={AGENCY_FB}>
            <div>{premier.tab_dates_even || ""}</div>
            <div>{premier.tab_dates_odd || ""}</div>
          </div>
        </button>
      </div>
    </section>
  );
}


// Paleta de colores por letra para "FESTIVAL" (idéntica al ejemplo del usuario).
// Se cicla si la palabra tiene más letras.
const FESTIVAL_LETTER_COLORS = [
  "#14b8a6", // F - teal
  "#e31f27", // E - rojo
  "#0640c8", // S - azul
  "#e31f27", // T - rojo
  "#facc15", // I - amarillo
  "#a855f7", // V - morado
  "#22c55e", // A - verde
  "#a855f7", // L - morado
];

function EventTitleSection({ month, word, isFestival }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-8" data-testid="eventos-title-section">
      {/* Mismo grid-cols-3 + gap que TabsBar arriba, para que cada flecha quede centrada
          exactamente respecto al ancho del botón FESTIVAL (col 1) o PREMIER (col 3). */}
      <div className="grid grid-cols-3 gap-3 md:gap-5 items-center">
        <div className="flex justify-center">
          <button type="button" aria-hidden className="fsc-bounce cursor-default bg-transparent border-0" data-testid="event-chevron-left">
            <ChevronStack color={RED} size={56} direction="up" count={5} />
          </button>
        </div>
        <div className="text-center">
          <div className="leading-[0.9]" style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(2.2rem, 5vw, 4rem)" }} data-testid="event-title-month">
            {renderPlaneCrash(month || "")}
          </div>
          {isFestival ? (
            // "FESTIVAL" con cada letra en un color distinto — misma fuente grunge Plane Crash
            // que usa "EDICIÓN 2026" en el hero de INICIO.
            <div
              className="leading-[0.9] mt-2"
              style={{
                ...PLANE_CRASH,
                fontSize: "clamp(2.8rem, 6.5vw, 5rem)",
                letterSpacing: "0.02em",
              }}
              data-testid="event-title-word"
            >
              {Array.from(planeCrashSafe(word || "")).map((ch, i) => {
                const color = ch === " " ? "transparent" : FESTIVAL_LETTER_COLORS[i % FESTIVAL_LETTER_COLORS.length];
                return (
                  <span key={i} style={{ color, WebkitTextFillColor: color }}>{ch}</span>
                );
              })}
            </div>
          ) : (
            // Premier: cursivo dorado (estilo original).
            <div
              className="italic mt-1"
              style={{ ...CURSIVE, color: GOLD, fontSize: "clamp(3.4rem, 8.5vw, 6.4rem)", textShadow: "0 2px 0 rgba(0,0,0,0.05)" }}
              data-testid="event-title-word"
            >
              {toTitleCaseForScript(word)}
            </div>
          )}
        </div>
        <div className="flex justify-center">
          <button type="button" aria-hidden className="fsc-bounce cursor-default bg-transparent border-0" data-testid="event-chevron-right">
            <ChevronStack color={RED} size={56} direction="up" count={5} />
          </button>
        </div>
      </div>
    </section>
  );
}


function CategoryBlock({ value, testId }) {
  // El admin ingresa el año completo (ej: "2018", "1999"). Se divide en 2+2 dígitos para el diseño visual
  // (arriba los primeros 2, abajo "CAT." + los últimos 2). Fallback: si solo ingresan 2 dígitos (dato viejo),
  // se asume "20" como prefijo para no romper configuraciones ya guardadas.
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  const top = digits.length >= 4 ? digits.slice(0, digits.length - 2) : "20";
  const bottom = digits.length >= 4 ? digits.slice(-2) : (digits || raw);
  return (
    <div
      className="bg-white/25 rounded-md px-3 py-2 md:px-4 md:py-3 shadow flex flex-col items-center justify-center leading-none gap-1 transition-transform duration-200 ease-out hover:-translate-y-2 hover:shadow-xl hover:bg-white/35 cursor-default"
      data-testid={testId}
    >
      <div className="font-black tabular-nums text-white" style={{ ...PLANE_CRASH, fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)" }}>
        {renderPlaneCrash(top)}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="tracking-wider text-white" style={{ ...AGENCY_FB, fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)", opacity: 0.9 }}>
          CAT.
        </div>
        <div className="font-black tabular-nums text-white" style={{ ...PLANE_CRASH, fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)" }}>
          {renderPlaneCrash(bottom)}
        </div>
      </div>
    </div>
  );
}


function FestivalCategories({ categories }) {
  return (
    <section className="w-full py-8 md:py-12" style={{ background: BLUE }} data-testid="festival-categories">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-white tracking-widest mb-6" style={{ ...AGENCY_FB, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 800 }}>
          CAT
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 place-items-center">
          {categories.map((c, i) => (
            <CategoryBlock key={`fc-${i}`} value={c} testId={`festival-cat-${i}`} />
          ))}
        </div>
      </div>
    </section>
  );
}


function PremierCategories({ evenCats, oddCats }) {
  return (
    <section className="w-full py-8 md:py-12" style={{ background: BLUE }} data-testid="premier-categories">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:gap-10 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40 hidden md:block" aria-hidden />
          <div>
            <h3 className="text-center text-white tracking-widest mb-6" style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.8rem)" }}>
              {renderPlaneCrash("PARES")}
            </h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4 place-items-center">
              {evenCats.map((c, i) => <CategoryBlock key={`pe-${i}`} value={c} testId={`premier-even-${i}`} />)}
            </div>
          </div>
          <div>
            <h3 className="text-center text-white tracking-widest mb-6" style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.8rem)" }}>
              {renderPlaneCrash("IMPARES")}
            </h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4 place-items-center">
              {oddCats.map((c, i) => <CategoryBlock key={`po-${i}`} value={c} testId={`premier-odd-${i}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function StadiumSection({ stadium }) {
  const showBadge = !!stadium.badge_text && !stadium.confirmed;
  return (
    <section className="w-full px-10 md:px-14" data-testid="stadium-section-wrap">
      <div className="relative w-full h-96 md:h-[520px] lg:h-[600px] overflow-hidden bg-slate-800 rounded-sm" data-testid="stadium-section">
        {stadium.image_url ? (
          <img
            src={imgSrc(stadium.image_url)}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(100%)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40" style={AGENCY_FB}>Imagen no configurada</div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-8 md:pt-14 text-center px-4">
          <AnimateIn variant="slide-down" duration={1.3} distance={50} amount={0.4}>
            <div className="italic" style={{ ...CURSIVE, color: "#000000", fontSize: "clamp(3.2rem, 7vw, 5.4rem)", textShadow: "0 2px 10px rgba(255,255,255,0.55)" }}>
              {stadium.cursive || "Estadio"}
            </div>
            <div className="leading-none mt-1 uppercase" style={{ ...AGENCY_FB, fontWeight: 800, color: "#000000", fontSize: "clamp(3rem, 7vw, 5.4rem)", textShadow: "0 2px 10px rgba(255,255,255,0.4)" }}>
              {stadium.title_top || "CENTENARIO"}
            </div>
            <div className="leading-none mt-1 uppercase" style={{ ...AGENCY_FB, fontWeight: 800, color: "#000000", fontSize: "clamp(2.6rem, 5.8vw, 4.4rem)", textShadow: "0 2px 10px rgba(255,255,255,0.4)" }}>
              {stadium.title_bottom || "ARMENIA"}
            </div>
          </AnimateIn>
          {showBadge && (
            <AnimateIn variant="zoom-in" duration={1.1} delay={0.2} amount={0.4}>
              <div
                className="mt-6 px-10 py-2 md:py-2.5 rounded-sm text-black uppercase tracking-widest text-lg md:text-xl"
                style={{
                  background: "linear-gradient(135deg, #fff4c2 0%, #ffd23f 30%, #f0a500 70%, #c9820a 100%)",
                  ...AGENCY_FB,
                  fontWeight: 900,
                  boxShadow: "0 4px 20px rgba(240, 165, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.8)",
                  border: "1px solid rgba(0,0,0,0.15)",
                }}
                data-testid="stadium-badge"
              >
                {stadium.badge_text || "POR CONFIRMAR"}
              </div>
            </AnimateIn>
          )}
        </div>
      </div>
    </section>
  );
}


function AdventureSection({ title, blocks }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="adventure-section">
      <h2 className="text-center mb-6 md:mb-8" style={{ ...AGENCY_FB, fontWeight: 700, color: BLUE, fontSize: "clamp(2rem, 3.8vw, 3rem)" }}>
        {title || "Día de Aventura"}
      </h2>
      <div className={`grid gap-6 md:gap-8 ${blocks.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} ${blocks.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {blocks.map((b, i) => (
          <div
            key={`adv-${i}`}
            className="flex items-center justify-center py-14 md:py-24 rounded-sm overflow-hidden"
            style={{ background: RED, minHeight: 280 }}
            data-testid={`adventure-block-${i}`}
          >
            {b.logo_url ? (
              <AnimateIn variant={i % 2 === 0 ? "slide-left" : "slide-right"} duration={1.3} amount={0.35}>
                <img src={imgSrc(b.logo_url)} alt="" className="max-h-48 md:max-h-64 max-w-full object-contain" />
              </AnimateIn>
            ) : (
              <span className="text-white/70 italic" style={AGENCY_FB}>Logo no configurado</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}


function ScenariosSection({ title, cursive, subTop, subBottom }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="scenarios-section">
      <div>
        <AnimateIn
          as="div"
          variant="slide-down"
          duration={1.3}
          distance={60}
          amount={0.4}
          className="leading-[0.85] w-full text-center"
          style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(3rem, 11vw, 8rem)", letterSpacing: "clamp(0rem, 0.8vw, 0.2rem)" }}
          data-testid="scenarios-title"
        >
          {renderPlaneCrash(title || "ESCENARIOS")}
        </AnimateIn>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1">
          <AnimateIn
            as="div"
            variant="slide-left"
            duration={1.3}
            distance={60}
            amount={0.4}
            className="leading-[0.85]"
            style={{ ...AGENCY_FB, color: RED, fontWeight: 800, fontSize: "clamp(2.8rem, 10.5vw, 7.2rem)" }}
          >
            {cursive || "Deportivos!"}
          </AnimateIn>
          <AnimateIn
            as="div"
            variant="slide-left"
            duration={1.3}
            delay={0.15}
            distance={60}
            amount={0.4}
            className="leading-[1.05]"
            style={{ ...AGENCY_FB, color: RED, fontWeight: 800 }}
          >
            <div style={{ fontSize: "clamp(1.5rem, 4.6vw, 3rem)" }}>{subTop || "COMFENALCO"}</div>
            <div style={{ fontSize: "clamp(1.5rem, 4.6vw, 3rem)" }}>{subBottom || "ESTADIO DE ARMENIA"}</div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}


function PremiacionSection({ title, subtitle, gallery }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="premiacion-section">
      <div className="text-center mb-6 md:mb-8">
        <AnimateIn
          as="h2"
          variant="slide-down"
          duration={1.3}
          distance={60}
          amount={0.4}
          className="leading-none"
          style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(3rem, 11vw, 8rem)", letterSpacing: "clamp(0rem, 0.8vw, 0.2rem)" }}
          data-testid="premiacion-title"
        >
          {renderPlaneCrash(title || "PREMIACIÓN")}
        </AnimateIn>
        <AnimateIn
          as="p"
          variant="slide-up"
          duration={1.3}
          delay={0.15}
          distance={40}
          amount={0.4}
          className="mt-3 max-w-2xl mx-auto"
          style={{ ...AGENCY_FB, color: RED, fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2.2rem)" }}
        >
          {subtitle || ""}
        </AnimateIn>
      </div>
      {gallery.length > 0 ? (
        <GalleryCarousel images={gallery.map((g) => imgSrc(g))} testIdPrefix="premiacion-gallery" accentColor={BLUE} />
      ) : (
        <div className="w-full h-48 md:h-64 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm italic" style={AGENCY_FB} data-testid="premiacion-gallery-empty">
          Aún no hay fotos de premiación configuradas.
        </div>
      )}
    </section>
  );
}


function ClubsSection({ title, logos }) {
  const hasLogos = logos.length > 0;
  // Se duplica la lista para que la cinta haga loop perfecto: al desplazar exactamente
  // -50% del ancho total (2 copias idénticas), el corte es invisible.
  const track = hasLogos ? [...logos, ...logos] : [];
  const durationSec = Math.max(18, logos.length * 3.5);
  return (
    <section className="py-10 md:py-14 text-center" data-testid="clubs-section">
      <h2 className="italic mb-6 md:mb-8" style={{ ...CURSIVE, color: BLUE, fontSize: "clamp(2.4rem, 7vw, 4.6rem)" }}>
        {title || "Clubes que han Participado"}
      </h2>
      {hasLogos ? (
        <div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-10 md:gap-16 w-max"
            style={{ animation: `scroll ${durationSec}s linear infinite` }}
          >
            {track.map((l, i) => (
              <div key={`club-${i}`} className="flex items-center justify-center shrink-0 h-20 md:h-28 w-28 md:w-36" data-testid={`club-logo-${i % logos.length}`}>
                <img src={imgSrc(l)} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <span className="text-slate-400 text-sm italic" style={AGENCY_FB}>Aún no hay clubes configurados.</span>
      )}
    </section>
  );
}
