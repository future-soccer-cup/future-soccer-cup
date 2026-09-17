/**
 * Página Estadísticas — "Marcador Oficial" (Iter61).
 * 5 secciones editables via CMS (home_settings.estadisticas):
 *  1. Hero rojo con "MARCADOR OFICIAL" + watermark ghost detrás.
 *  2. "ASÍ VA LA competencia!" + selector de evento (Festival / Premier Pares / Impares).
 *  3. Grid de categorías (pills azules) + logo/etiqueta del evento a la derecha.
 *  4. Franja roja CTA de redes sociales.
 *  5. Frase de cierre cursiva.
 * Al hacer clic en una categoría → muestra tabla de posiciones + goleadores conectados
 * al backend existente (`/api/stats/standings`, `/api/stats/top-scorers`).
 */
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import api, { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, renderPlaneCrash, toTitleCaseForScript } from "../lib/designSystem";
import AnimateIn from "../components/AnimateIn";

const RED = "#e31f27";
const BLUE = "#0640c8";
const GOLD = "#f5c542";

const FESTIVAL_LETTER_COLORS = [
  "#14b8a6", "#e31f27", "#0640c8", "#e31f27",
  "#facc15", "#a855f7", "#22c55e", "#a855f7",
];

export default function DatosEstadisticas() {
  const [cfg, setCfg] = useState({});
  const [activeKey, setActiveKey] = useState("");
  const [selectedCat, setSelectedCat] = useState(null); // categoría abierta

  useEffect(() => {
    api.get("/home-settings").then((r) => {
      const d = r.data?.estadisticas || {};
      setCfg(d);
      setActiveKey(d.active_event_key || (d.events?.[0]?.key || ""));
    }).catch(() => {});
  }, []);

  const events = useMemo(() => cfg.events || [], [cfg]);
  const activeEvent = events.find((e) => e.key === activeKey) || events[0] || {};

  return (
    <div data-testid="estadisticas-page" className="bg-white" style={AGENCY_FB}>
      <HeroSection
        heroUrl={cfg.hero_url}
        watermark={cfg.hero_watermark_text || "MARCADOR"}
        titleTop={cfg.hero_title_top || "MARCADOR"}
        titleBottom={cfg.hero_title_bottom || "OFICIAL"}
      />

      <IntroAndSelector
        top={cfg.intro_top || "ASÍ VA LA"}
        bottom={cfg.intro_bottom || "competencia!"}
        events={events}
        activeKey={activeEvent.key || activeKey}
        onSelect={(k) => { setActiveKey(k); setSelectedCat(null); }}
      />

      <CategoriesGrid
        event={activeEvent}
        onSelectCat={(cat) => setSelectedCat(cat)}
      />

      {selectedCat && (
        <CategoryDataPanel
          category={selectedCat}
          eventLabel={activeEvent.label || ""}
          onClose={() => setSelectedCat(null)}
        />
      )}
    </div>
  );
}


function HeroSection({ heroUrl, watermark, titleTop, titleBottom }) {
  const titleTopStyle = {
    ...PLANE_CRASH,
    fontSize: "clamp(2.4rem, 10vw, 9rem)",
    letterSpacing: "0.01em",
  };
  return (
    <section
      className="relative w-full aspect-[16/5] overflow-hidden bg-slate-800"
      data-testid="stats-hero"
    >
      {heroUrl && (
        <img src={imgSrc(heroUrl)} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      )}
      {/* Overlay rojo denso y oscuro (oscurece la foto de fondo) */}
      <div className="absolute inset-0" style={{ background: "rgba(200, 20, 20, 0.70)" }} />
      {/* Título principal + rastro de "ecos" que caen detrás (animación única al cargar, sin loop) */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
        <div className="relative leading-[0.9]">
          {/* Ecos: copias semitransparentes que quedan por ENCIMA del texto principal,
              como un rastro vertical hacia arriba. Mientras más arriba, más tenues. */}
          {[
            { opacity: 0.4, offset: -10, delay: 0.06 },
            { opacity: 0.2, offset: -20, delay: 0.12 },
            { opacity: 0.1, offset: -30, delay: 0.18 },
          ].map((echo, i) => (
            <div
              key={i}
              className="absolute inset-x-0 top-0 leading-[0.9] pointer-events-none select-none marcador-echo"
              style={{
                ...titleTopStyle,
                color: "#ffffff",
                "--echo-opacity": echo.opacity,
                "--echo-offset": `${echo.offset}px`,
                animationDelay: `${echo.delay}s`,
              }}
              aria-hidden="true"
              data-testid={`stats-hero-echo-${i + 1}`}
            >
              {renderPlaneCrash(titleTop)}
            </div>
          ))}
          {/* Principal: entra cayendo desde arriba hasta su posición final */}
          <div
            className="relative leading-[0.9] marcador-main"
            style={{ ...titleTopStyle, color: "#ffffff", textShadow: "3px 5px 0 rgba(0,0,0,0.25)" }}
            data-testid="stats-hero-title-top"
          >
            {renderPlaneCrash(titleTop)}
          </div>
        </div>
        <div
          className="leading-[0.9] mt-1 md:mt-3"
          style={{
            ...AGENCY_FB,
            fontWeight: 800,
            color: "#ffffff",
            fontSize: "clamp(2.6rem, 7vw, 6.5rem)",
            textShadow: "3px 5px 0 rgba(0,0,0,0.25)",
          }}
          data-testid="stats-hero-title-bottom"
        >
          {titleBottom}
        </div>
      </div>
    </section>
  );
}


function IntroAndSelector({ top, bottom, events, activeKey, onSelect }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 text-center" data-testid="stats-intro">
      <AnimateIn
        as="div"
        variant="slide-down"
        duration={1.3}
        distance={50}
        amount={0.4}
        className="leading-[0.9]"
        style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)" }}
        data-testid="stats-intro-top"
      >
        {renderPlaneCrash(top)}
      </AnimateIn>
      <AnimateIn
        as="div"
        variant="slide-up"
        duration={1.3}
        delay={0.15}
        distance={30}
        amount={0.4}
        className="mt-2"
        style={{ ...AGENCY_FB, fontWeight: 700, color: RED, fontSize: "clamp(1.8rem, 3.6vw, 3rem)" }}
        data-testid="stats-intro-bottom"
      >
        {bottom}
      </AnimateIn>

      {events.length > 1 && (
        <div className="mt-6 md:mt-8 flex items-center justify-center gap-2 md:gap-3 flex-wrap" data-testid="stats-event-selector">
          {events.map((ev) => {
            const isActive = ev.key === activeKey;
            return (
              <button
                key={ev.key}
                type="button"
                onClick={() => onSelect(ev.key)}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full transition-all text-sm md:text-base"
                style={{
                  ...PLANE_CRASH,
                  background: isActive ? RED : "transparent",
                  color: isActive ? "#ffffff" : RED,
                  border: `2px solid ${RED}`,
                  letterSpacing: "0.05em",
                }}
                data-testid={`stats-event-${ev.key}`}
              >
                {renderPlaneCrash(ev.label || ev.key)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}


function CategoriesGrid({ event, onSelectCat }) {
  const cats = event.categories || [];
  const isMulti = event.title_style === "multicolor";
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10" data-testid="stats-cats-section">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center">
        <div className="md:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {cats.map((c, i) => (
              <button
                key={`${event.key}-cat-${i}`}
                type="button"
                onClick={() => onSelectCat({ ...c, index: i })}
                className="rounded-full px-4 py-3 md:py-4 text-white text-center transition-transform hover:scale-105 shadow-md"
                style={{ background: BLUE, ...PLANE_CRASH, fontSize: "clamp(0.9rem, 1.8vw, 1.5rem)", letterSpacing: "0.05em" }}
                data-testid={`stats-cat-${event.key}-${i}`}
              >
                {renderPlaneCrash(c.label || `CAT: ${c.category}`)}
              </button>
            ))}
            {cats.length === 0 && (
              <div className="col-span-full text-slate-400 italic py-6" style={AGENCY_FB}>
                Aún no hay categorías configuradas para este evento.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <AnimateIn key={event.key} as="div" variant="slide-right" duration={1.3} distance={50} amount={0.4} className="flex flex-col items-center gap-3">
            {event.logo_url ? (
              <img src={imgSrc(event.logo_url)} alt="" className="max-h-24 md:max-h-32 object-contain" data-testid="stats-event-logo" />
            ) : null}
            <div className="text-center">
              <div className="leading-none" style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(2rem, 3.3vw, 3.1rem)" }}>
                {renderPlaneCrash(event.title_month || "")}
              </div>
              {isMulti ? (
                <div className="leading-none mt-1" style={{ ...PLANE_CRASH, fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }} data-testid="stats-event-title-word">
                  {Array.from(planeCrashSafe(event.title_word || "")).map((ch, i) => {
                    const color = ch === " " ? "transparent" : FESTIVAL_LETTER_COLORS[i % FESTIVAL_LETTER_COLORS.length];
                    return <span key={i} style={{ color, WebkitTextFillColor: color }}>{ch}</span>;
                  })}
                </div>
              ) : (
                <div className="italic mt-1" style={{ ...CURSIVE, color: GOLD, fontSize: "clamp(3.4rem, 5.6vw, 5.2rem)" }} data-testid="stats-event-title-word">
                  {toTitleCaseForScript(event.title_word)}
                </div>
              )}
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}


function CategoryDataPanel({ category, eventLabel, onClose }) {
  const [standings, setStandings] = useState(null);
  const [scorers, setScorers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasIds = category.tournament_id && category.category;
    if (!hasIds) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ tournament_id: category.tournament_id, category: category.category });
    if (category.group_name) params.set("group_name", category.group_name);
    setLoading(true);
    Promise.all([
      api.get(`/stats/standings?${params.toString()}`).then((r) => r.data || []).catch(() => []),
      api.get(`/stats/top-scorers?${params.toString()}&limit=10`).then((r) => r.data || []).catch(() => []),
    ]).then(([st, sc]) => {
      setStandings(st);
      setScorers(sc);
      setLoading(false);
    });
  }, [category]);

  const noConfig = !category.tournament_id || !category.category;
  const empty = !loading && (standings || []).length === 0 && (scorers || []).length === 0;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10" data-testid="stats-category-panel">
      <div className="bg-white border-2 rounded-lg shadow-lg" style={{ borderColor: BLUE }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: BLUE }}>
          <div className="text-white">
            <div className="text-xs uppercase tracking-widest opacity-80" style={AGENCY_FB}>{eventLabel}</div>
            <div className="leading-none mt-0.5" style={{ ...PLANE_CRASH, fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)" }}>
              {renderPlaneCrash(category.label || `CAT ${category.category}`)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white p-2 rounded-full hover:bg-white/10" aria-label="Cerrar" data-testid="stats-panel-close">
            <X size={24} />
          </button>
        </div>

        <div className="p-5 md:p-8">
          {loading ? (
            <div className="text-center py-6 text-slate-500 text-lg" style={AGENCY_FB}>Cargando...</div>
          ) : noConfig || empty ? (
            <div className="text-center py-10">
              <div className="text-slate-500 italic text-lg" style={AGENCY_FB}>Próximamente</div>
              {noConfig && (
                <div className="text-sm text-slate-400 mt-1">
                  Esta categoría aún no está vinculada a un torneo desde el CMS.
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mb-4" style={{ color: BLUE }}>
                  Tabla de posiciones
                </h3>
                {standings?.length ? <StandingsTable rows={standings} /> : <p className="text-slate-400 italic text-base">Sin datos aún.</p>}
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mb-4" style={{ color: BLUE }}>
                  Goleadores
                </h3>
                {scorers?.length ? <ScorersTable rows={scorers} /> : <p className="text-slate-400 italic text-base">Sin goles registrados.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function StandingsTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-base md:text-lg">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="text-left px-3 py-2.5">#</th>
            <th className="text-left px-3 py-2.5">Equipo</th>
            <th className="text-center px-3 py-2.5">PJ</th>
            <th className="text-center px-3 py-2.5">G</th>
            <th className="text-center px-3 py-2.5">E</th>
            <th className="text-center px-3 py-2.5">P</th>
            <th className="text-center px-3 py-2.5">DG</th>
            <th className="text-center px-3 py-2.5">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team_id} className="border-t border-slate-100" data-testid={`stats-row-${i}`}>
              <td className="px-3 py-2.5 font-bold">{i + 1}</td>
              <td className="px-3 py-2.5">{r.team_name}</td>
              <td className="text-center tabular-nums">{r.played}</td>
              <td className="text-center tabular-nums">{r.won}</td>
              <td className="text-center tabular-nums">{r.drawn}</td>
              <td className="text-center tabular-nums">{r.lost}</td>
              <td className="text-center tabular-nums">{r.gd}</td>
              <td className="text-center font-black text-lg md:text-xl" style={{ color: BLUE }}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function ScorersTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-base md:text-lg">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="text-left px-3 py-2.5">#</th>
            <th className="text-left px-3 py-2.5">Jugador</th>
            <th className="text-left px-3 py-2.5">Equipo</th>
            <th className="text-center px-3 py-2.5">Goles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`sc-${i}`} className="border-t border-slate-100" data-testid={`stats-scorer-row-${i}`}>
              <td className="px-3 py-2.5 font-bold">{i + 1}</td>
              <td className="px-3 py-2.5">{r.name || r.player_name || "—"}</td>
              <td className="px-3 py-2.5 text-slate-500">{r.team_name || ""}</td>
              <td className="text-center font-black text-lg md:text-xl" style={{ color: RED }}>{r.goals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
