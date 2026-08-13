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
import { ChevronLeft, ChevronRight, Trophy, Medal } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe } from "../lib/designSystem";
import ChevronStack from "../components/ChevronStack";

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
        photos={ev.scenarios_photos || []}
      />

      {/* SECCIÓN 8 — Premiación (según tab activo) */}
      <PremiacionSection
        title={ev.premiacion_title}
        subtitle={ev.premiacion_subtitle}
        cups={active.awards_cups || []}
        individual={active.awards_individual || []}
      />

      {/* SECCIÓN 9 — Clubes */}
      <ClubsSection title={ev.clubs_title} logos={ev.clubs_logos || []} />
    </div>
  );
}


function HeroSection({ heroVideoUrl, heroUrl, logoUrl }) {
  return (
    <section className="relative w-full h-64 md:h-96 lg:h-[500px] bg-slate-100 overflow-hidden" data-testid="eventos-hero">
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
  return (
    <section className="w-full py-4 md:py-5" style={{ background: BLUE }} data-testid="eventos-countries">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <h2
          className="text-white text-lg md:text-xl lg:text-2xl"
          style={{ ...AGENCY_FB, fontWeight: 700 }}
          data-testid="countries-title"
        >
          {title || "Países que han Participado"}
        </h2>
        <div className="flex items-center gap-3 md:gap-5 flex-wrap justify-center">
          {countries.map((c, i) => (
            <div
              key={`country-${i}`}
              className="flex items-center gap-2"
              title={c.name}
              data-testid={`country-${i}`}
            >
              {c.flag_url ? (
                <img
                  src={imgSrc(c.flag_url)}
                  alt={c.name}
                  className="h-6 md:h-8 lg:h-9 w-auto object-contain"
                  style={{ border: "1px solid rgba(255,255,255,0.4)" }}
                />
              ) : (
                <span className="text-white/70 text-xs italic px-2 py-1 border border-white/30 rounded">{c.name || "—"}</span>
              )}
            </div>
          ))}
        </div>
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
            {planeCrashSafe(festival.tab_label || "FESTIVAL")}
          </div>
          <div className="text-white text-center mt-2 text-lg md:text-xl lg:text-2xl" style={AGENCY_FB}>
            {festival.tab_dates || ""}
          </div>
        </button>

        <div className="text-center px-3 py-4 md:py-6 bg-white flex flex-col items-center justify-center" data-testid="tab-center">
          <div className="leading-none" style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(1.5rem, 3.6vw, 3rem)" }}>
            {planeCrashSafe(center?.top || "EVENTOS")}
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
            {planeCrashSafe(premier.tab_label || "PREMIER")}
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
            {planeCrashSafe(month || "")}
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
              {word || ""}
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


function CategoryBlock({ year, cat, testId }) {
  // "20" = año 2000-2019 (usamos "20" fijo como muestra el wireframe: los niños nacieron en 20XX).
  return (
    <div className="bg-white/95 rounded-md px-3 py-2 md:px-4 md:py-3 shadow flex flex-col items-center justify-center leading-none" data-testid={testId}>
      <div className="font-black tabular-nums" style={{ color: BLUE, ...PLANE_CRASH, fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)" }}>
        {planeCrashSafe(String(year))}
      </div>
      <div className="mt-1 tracking-wider" style={{ color: BLUE, ...PLANE_CRASH, fontSize: "clamp(0.7rem, 1vw, 0.9rem)", opacity: 0.85 }}>
        {planeCrashSafe(`CAT.${cat}`)}
      </div>
    </div>
  );
}


function FestivalCategories({ categories }) {
  return (
    <section className="w-full py-8 md:py-12" style={{ background: BLUE }} data-testid="festival-categories">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-white tracking-widest mb-6" style={{ ...PLANE_CRASH, fontSize: "clamp(1.4rem, 2.5vw, 2rem)" }}>
          {planeCrashSafe("CAT")}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 place-items-center">
          {categories.map((c, i) => (
            <CategoryBlock key={`fc-${i}`} year="20" cat={c} testId={`festival-cat-${i}`} />
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
              {planeCrashSafe("PARES")}
            </h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4 place-items-center">
              {evenCats.map((c, i) => <CategoryBlock key={`pe-${i}`} year="20" cat={c} testId={`premier-even-${i}`} />)}
            </div>
          </div>
          <div>
            <h3 className="text-center text-white tracking-widest mb-6" style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.8rem)" }}>
              {planeCrashSafe("IMPARES")}
            </h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4 place-items-center">
              {oddCats.map((c, i) => <CategoryBlock key={`po-${i}`} year="20" cat={c} testId={`premier-odd-${i}`} />)}
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
    <section className="relative w-full h-72 md:h-[420px] overflow-hidden bg-slate-800" data-testid="stadium-section">
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <div className="italic" style={{ ...CURSIVE, color: "#000000", fontSize: "clamp(2.8rem, 6vw, 4.8rem)", textShadow: "0 2px 10px rgba(255,255,255,0.55)" }}>
          {stadium.cursive || "Estadio"}
        </div>
        <div className="leading-none mt-1 uppercase" style={{ ...AGENCY_FB, fontWeight: 800, color: "#000000", fontSize: "clamp(2.6rem, 6vw, 4.8rem)", textShadow: "0 2px 10px rgba(255,255,255,0.4)" }}>
          {stadium.title_top || "CENTENARIO"}
        </div>
        <div className="leading-none mt-1 uppercase" style={{ ...AGENCY_FB, fontWeight: 800, color: "#000000", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", textShadow: "0 2px 10px rgba(255,255,255,0.4)" }}>
          {stadium.title_bottom || "ARMENIA"}
        </div>
        {showBadge && (
          <div
            className="mt-4 px-4 py-1.5 rounded-sm text-black uppercase tracking-widest text-xs md:text-sm"
            style={{ background: GOLD, ...AGENCY_FB, fontWeight: 900 }}
            data-testid="stadium-badge"
          >
            {stadium.badge_text || "POR CONFIRMAR"}
          </div>
        )}
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
      <div className={`grid gap-4 md:gap-6 ${blocks.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} ${blocks.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {blocks.map((b, i) => (
          <div
            key={`adv-${i}`}
            className="flex items-center justify-center py-10 md:py-16 rounded-sm"
            style={{ background: RED, minHeight: 200 }}
            data-testid={`adventure-block-${i}`}
          >
            {b.logo_url ? (
              <img src={imgSrc(b.logo_url)} alt="" className="max-h-32 md:max-h-40 max-w-full object-contain" />
            ) : (
              <span className="text-white/70 italic" style={AGENCY_FB}>Logo no configurado</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}


function ScenariosSection({ title, cursive, subTop, subBottom, photos }) {
  const [idx, setIdx] = useState(0);
  const perView = 3;
  const canPrev = idx > 0;
  const canNext = idx + perView < photos.length;
  const visible = photos.slice(idx, idx + perView);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="scenarios-section">
      <div className="mb-6">
        <div
          className="leading-[0.85] w-full text-center"
          style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(3rem, 11vw, 8rem)", letterSpacing: "clamp(0rem, 0.8vw, 0.2rem)" }}
          data-testid="scenarios-title"
        >
          {planeCrashSafe(title || "ESCENARIOS")}
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 mt-1">
          <div className="italic leading-none" style={{ ...CURSIVE, color: RED, fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}>
            {cursive || "Deportivos!"}
          </div>
          <div className="leading-tight" style={{ ...AGENCY_FB, color: "#0a0a0a", fontWeight: 700 }}>
            <div className="text-sm md:text-base">{subTop || "COMFENALCO"}</div>
            <div className="text-sm md:text-base">{subBottom || "ESTADIO DE ARMENIA"}</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visible.length ? visible.map((p, i) => (
            <div key={`sc-${idx}-${i}`} className="overflow-hidden rounded-sm bg-slate-100 aspect-video" data-testid={`scenario-photo-${idx + i}`}>
              <img src={imgSrc(p)} alt="" className="w-full h-full object-cover" />
            </div>
          )) : (
            <div className="md:col-span-3 text-center py-10 text-slate-400" style={AGENCY_FB}>Aún no hay fotos configuradas.</div>
          )}
        </div>
        {photos.length > perView && (
          <>
            <button
              type="button"
              onClick={() => canPrev && setIdx(idx - 1)}
              disabled={!canPrev}
              className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 md:w-10 md:h-10 bg-white shadow flex items-center justify-center disabled:opacity-30"
              aria-label="Anterior"
              data-testid="scenarios-prev"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => canNext && setIdx(idx + 1)}
              disabled={!canNext}
              className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 md:w-10 md:h-10 bg-white shadow flex items-center justify-center disabled:opacity-30"
              aria-label="Siguiente"
              data-testid="scenarios-next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}


function PremiacionSection({ title, subtitle, cups, individual }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="premiacion-section">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="leading-none" style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }} data-testid="premiacion-title">
          {planeCrashSafe(title || "PREMIACIÓN")}
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-slate-800 text-sm md:text-base" style={AGENCY_FB}>
          {subtitle || ""}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-center">
        <div className="space-y-2" data-testid="premiacion-cups">
          {cups.map((c, i) => (
            <div
              key={`cup-${i}`}
              className="text-center px-4 py-2 rounded-sm text-white uppercase tracking-wider"
              style={{ background: RED, ...PLANE_CRASH, fontSize: "clamp(1rem, 1.4vw, 1.2rem)" }}
              data-testid={`cup-${i}`}
            >
              {planeCrashSafe(c)}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2 order-first md:order-none" aria-hidden>
          {cups.slice(0, Math.max(cups.length, 1)).map((_, i) => (
            <div key={`icon-${i}`} className="flex items-center gap-3">
              <Trophy size={28} color={GOLD} fill={GOLD} />
              <span className="text-slate-700 font-black">V</span>
              <Medal size={28} color={GOLD} fill={GOLD} />
            </div>
          ))}
        </div>
        <div className="space-y-1" data-testid="premiacion-individual">
          {individual.map((a, i) => (
            <div
              key={`ind-${i}`}
              className="leading-tight"
              style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(1.4rem, 2.4vw, 2rem)" }}
              data-testid={`indiv-${i}`}
            >
              {planeCrashSafe(a)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function ClubsSection({ title, logos }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-center" data-testid="clubs-section">
      <h2 className="italic mb-6 md:mb-8" style={{ ...CURSIVE, color: BLUE, fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
        {title || "Clubes que han Participado"}
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8">
        {logos.length ? logos.map((l, i) => (
          <img key={`club-${i}`} src={imgSrc(l)} alt="" className="h-14 md:h-16 lg:h-20 w-auto object-contain" data-testid={`club-logo-${i}`} />
        )) : (
          <span className="text-slate-400 text-sm italic" style={AGENCY_FB}>Aún no hay clubes configurados.</span>
        )}
      </div>
    </section>
  );
}
