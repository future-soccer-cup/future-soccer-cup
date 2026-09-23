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
import { Link } from "react-router-dom";
import { X, Trophy } from "lucide-react";
import api, { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, renderPlaneCrash, toTitleCaseForScript } from "../lib/designSystem";
import { formatDateTime } from "../lib/dateFormat";
import AnimateIn from "../components/AnimateIn";

const RED = "#e31f27";
const BLUE = "#0640c8";
const STAGE_LABEL = {
  treintaidosavos: "32avos",
  octavos: "Octavos",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
  tercer_puesto: "3er puesto",
};
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
  const noConfig = !category.tournament_id || !category.category;
  // null = aún sin resolver qué ver; { type: "group", name } o { type: "bracket", id, name } = ya elegido.
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    setSelectedItem(null);
    setAvailableItems([]);
    if (noConfig) {
      setGroupsLoading(false);
      return;
    }
    // Si el admin ya fijó un grupo específico para esta categoría (CMS), saltamos el
    // paso de elegir grupo/bracket y vamos directo a sus estadísticas.
    if (category.group_name) {
      const fixed = { type: "group", name: category.group_name };
      setAvailableItems([fixed]);
      setSelectedItem(fixed);
      setGroupsLoading(false);
      return;
    }
    let cancelled = false;
    setGroupsLoading(true);
    api.get("/stats/groups", { params: { tournament_id: category.tournament_id, category: category.category } })
      .then((r) => {
        if (cancelled) return;
        const items = r.data || [];
        setAvailableItems(items);
        if (items.length <= 1) setSelectedItem(items[0] || { type: "group", name: "" });
        setGroupsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableItems([]);
        setSelectedItem({ type: "group", name: "" });
        setGroupsLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, noConfig]);

  const showGroupPicker = !noConfig && !groupsLoading && selectedItem === null && availableItems.length > 1;
  const showBackToGroups = availableItems.length > 1 && !category.group_name;
  const itemKey = (it) => `${it.type}-${it.id || it.name}`;

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
          {noConfig ? (
            <div className="text-center py-10">
              <div className="text-slate-500 italic text-lg" style={AGENCY_FB}>Próximamente</div>
              <div className="text-sm text-slate-400 mt-1">
                Esta categoría aún no está vinculada a un torneo desde el CMS.
              </div>
            </div>
          ) : groupsLoading ? (
            <div className="text-center py-6 text-slate-500 text-lg" style={AGENCY_FB}>Cargando...</div>
          ) : showGroupPicker ? (
            <div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mb-4" style={{ color: BLUE }}>
                Elige un grupo
              </h3>
              <div className="flex flex-wrap gap-3" data-testid="stats-group-picker">
                {availableItems.map((it) => (
                  <button
                    key={itemKey(it)}
                    type="button"
                    onClick={() => setSelectedItem(it)}
                    className="rounded-full px-5 py-2.5 text-white transition-transform hover:scale-105 shadow-md flex items-center gap-1.5"
                    style={{ background: BLUE, ...PLANE_CRASH, fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)", letterSpacing: "0.05em" }}
                    data-testid={`stats-group-btn-${it.name}`}
                  >
                    {it.type === "bracket" && <Trophy size={16} />}
                    {renderPlaneCrash(it.name)}
                  </button>
                ))}
              </div>
            </div>
          ) : selectedItem?.type === "bracket" ? (
            <BracketStatsView
              bracketId={selectedItem.id}
              bracketName={selectedItem.name}
              showBackToGroups={showBackToGroups}
              onBack={() => setSelectedItem(null)}
            />
          ) : (
            <GroupStatsView
              tournamentId={category.tournament_id}
              categoryValue={category.category}
              groupName={selectedItem?.name || ""}
              showBackToGroups={showBackToGroups}
              onBack={() => setSelectedItem(null)}
            />
          )}
        </div>
      </div>
    </section>
  );
}


function GroupStatsView({ tournamentId, categoryValue, groupName, showBackToGroups, onBack }) {
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchesTab, setMatchesTab] = useState("results"); // "results" | "pending"

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { tournament_id: tournamentId, category: categoryValue };
    if (groupName) params.group_name = groupName;
    Promise.all([
      api.get("/stats/standings", { params }).then((r) => r.data || []).catch(() => []),
      api.get("/stats/matches", { params }).then((r) => r.data || []).catch(() => []),
      api.get("/stats/top-scorers", { params: { ...params, limit: 10 } }).then((r) => r.data || []).catch(() => []),
    ]).then(([st, ms, sc]) => {
      if (cancelled) return;
      setStandings(st);
      setMatches(ms);
      setScorers(sc);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tournamentId, categoryValue, groupName]);

  const results = useMemo(() => matches.filter((m) => m.status === "finalizado" || m.status === "descansa").slice().reverse(), [matches]);
  const pending = useMemo(() => matches.filter((m) => m.status !== "finalizado" && m.status !== "descansa"), [matches]);
  const empty = !loading && standings.length === 0 && matches.length === 0 && scorers.length === 0;

  return (
    <div className="space-y-8" data-testid="stats-group-view">
      {showBackToGroups && (
        <button type="button" onClick={onBack} className="text-sm font-bold" style={{ color: BLUE }} data-testid="stats-group-back">
          ← Elegir otro grupo
        </button>
      )}
      {groupName && (
        <div className="font-black uppercase tracking-wider text-sm" style={{ color: BLUE }}>{groupName}</div>
      )}

      {loading ? (
        <div className="text-center py-6 text-slate-500 text-lg" style={AGENCY_FB}>Cargando...</div>
      ) : empty ? (
        <div className="text-center py-10">
          <div className="text-slate-500 italic text-lg" style={AGENCY_FB}>Próximamente</div>
        </div>
      ) : (
        <>
          <div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mb-4" style={{ color: BLUE }}>
              Tabla de posiciones
            </h3>
            {standings.length ? <StandingsTable rows={standings} /> : <p className="text-slate-400 italic text-base">Sin datos aún.</p>}
          </div>

          <div>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMatchesTab("results")}
                className="px-4 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-colors"
                style={matchesTab === "results" ? { background: BLUE, color: "#fff" } : { background: "#f1f5f9", color: BLUE }}
                data-testid="stats-tab-results"
              >
                Resultados {results.length > 0 && `(${results.length})`}
              </button>
              <button
                type="button"
                onClick={() => setMatchesTab("pending")}
                className="px-4 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-colors"
                style={matchesTab === "pending" ? { background: BLUE, color: "#fff" } : { background: "#f1f5f9", color: BLUE }}
                data-testid="stats-tab-pending"
              >
                Próximos partidos {pending.length > 0 && `(${pending.length})`}
              </button>
            </div>
            {matchesTab === "results" ? (
              results.length ? <MatchesList rows={results} testPrefix="stats-result" /> : <p className="text-slate-400 italic text-base">Aún no hay resultados.</p>
            ) : (
              pending.length ? <MatchesList rows={pending} testPrefix="stats-pending" showDate /> : <p className="text-slate-400 italic text-base">No hay partidos pendientes.</p>
            )}
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mb-4" style={{ color: BLUE }}>
              Goleadores
            </h3>
            {scorers?.length ? <ScorersTable rows={scorers} /> : <p className="text-slate-400 italic text-base">Sin goles registrados.</p>}
          </div>
        </>
      )}
    </div>
  );
}


function BracketStatsView({ bracketId, bracketName, showBackToGroups, onBack }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchesTab, setMatchesTab] = useState("results"); // "results" | "pending"

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get("/stats/matches", { params: { bracket_id: bracketId } })
      .then((r) => { if (!cancelled) setMatches(r.data || []); })
      .catch(() => { if (!cancelled) setMatches([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bracketId]);

  // Agrupar por ronda en el orden real del bracket (cuartos → semis → final).
  const byStage = useMemo(() => {
    const map = {};
    matches.forEach((m) => {
      const key = m.stage || "otros";
      (map[key] = map[key] || []).push(m);
    });
    return map;
  }, [matches]);
  const stageOrder = useMemo(() => {
    const known = ["treintaidosavos", "octavos", "cuartos", "semis", "tercer_puesto", "final"];
    return Object.keys(byStage).sort((a, b) => known.indexOf(a) - known.indexOf(b));
  }, [byStage]);

  return (
    <div className="space-y-8" data-testid="stats-bracket-view">
      {showBackToGroups && (
        <button type="button" onClick={onBack} className="text-sm font-bold" style={{ color: BLUE }} data-testid="stats-group-back">
          ← Elegir otro grupo
        </button>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-black uppercase tracking-wider text-sm flex items-center gap-1.5" style={{ color: BLUE }}>
          <Trophy size={16} /> {bracketName}
        </div>
        <Link
          to={`/bracket?id=${bracketId}`}
          className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full text-white"
          style={{ background: RED }}
          data-testid="stats-bracket-full-link"
        >
          Ver bracket completo →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-6 text-slate-500 text-lg" style={AGENCY_FB}>Cargando...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-slate-500 italic text-lg" style={AGENCY_FB}>Próximamente</div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMatchesTab("results")}
              className="px-4 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-colors"
              style={matchesTab === "results" ? { background: BLUE, color: "#fff" } : { background: "#f1f5f9", color: BLUE }}
              data-testid="stats-bracket-tab-results"
            >
              Resultados
            </button>
            <button
              type="button"
              onClick={() => setMatchesTab("pending")}
              className="px-4 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-colors"
              style={matchesTab === "pending" ? { background: BLUE, color: "#fff" } : { background: "#f1f5f9", color: BLUE }}
              data-testid="stats-bracket-tab-pending"
            >
              Próximos partidos
            </button>
          </div>
          <div className="space-y-6">
            {stageOrder.map((stage) => {
              const rows = byStage[stage];
              const label = STAGE_LABEL[stage] || stage;
              const visible = rows.filter((m) => matchesTab === "results" ? (m.status === "finalizado" || m.status === "descansa") : (m.status !== "finalizado" && m.status !== "descansa"));
              if (visible.length === 0) return null;
              return (
                <div key={stage}>
                  <div className="text-sm font-black uppercase tracking-widest mb-2 text-slate-500">{label}</div>
                  <MatchesList rows={visible} testPrefix={`stats-bracket-${matchesTab}-${stage}`} showDate={matchesTab === "pending"} />
                </div>
              );
            })}
            {stageOrder.every((stage) => byStage[stage].filter((m) => matchesTab === "results" ? (m.status === "finalizado" || m.status === "descansa") : (m.status !== "finalizado" && m.status !== "descansa")).length === 0) && (
              <p className="text-slate-400 italic text-base">{matchesTab === "results" ? "Aún no hay resultados." : "No hay partidos pendientes."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function MatchesList({ rows, testPrefix, showDate }) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {rows.map((m, i) => (
        <div key={m.id || i} className="bg-slate-50 rounded-md px-3 py-2 text-sm md:text-base" data-testid={`${testPrefix}-${i}`}>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 truncate font-semibold text-right">{m.home_team_name}</span>
            <span className="tabular-nums font-black shrink-0 px-1" style={{ color: BLUE }}>
              {m.status === "finalizado" ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : m.status === "descansa" ? "—" : "vs"}
            </span>
            <span className="flex-1 min-w-0 truncate font-semibold">{m.away_team_name}</span>
          </div>
          {(showDate || m.status !== "finalizado") && (
            <div className="text-xs text-slate-400 mt-0.5 text-center">{formatDateTime(m.match_date)}{m.venue ? ` · ${m.venue}` : ""}</div>
          )}
        </div>
      ))}
    </div>
  );
}


function StandingsTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] sm:text-base md:text-lg">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="text-left px-1.5 sm:px-3 py-2 sm:py-2.5">#</th>
            <th className="text-left px-1.5 sm:px-3 py-2 sm:py-2.5">Equipo</th>
            <th className="text-center px-1 sm:px-3 py-2 sm:py-2.5">PJ</th>
            <th className="text-center px-1 sm:px-3 py-2 sm:py-2.5">G</th>
            <th className="text-center px-1 sm:px-3 py-2 sm:py-2.5">E</th>
            <th className="text-center px-1 sm:px-3 py-2 sm:py-2.5">P</th>
            <th className="text-center px-1 sm:px-3 py-2 sm:py-2.5">DG</th>
            <th className="text-center px-1.5 sm:px-3 py-2 sm:py-2.5">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team_id} className="border-t border-slate-100" data-testid={`stats-row-${i}`}>
              <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 font-bold">{i + 1}</td>
              <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 max-w-[92px] sm:max-w-none truncate">{r.team_name}</td>
              <td className="text-center tabular-nums px-1 sm:px-3">{r.played}</td>
              <td className="text-center tabular-nums px-1 sm:px-3">{r.won}</td>
              <td className="text-center tabular-nums px-1 sm:px-3">{r.drawn}</td>
              <td className="text-center tabular-nums px-1 sm:px-3">{r.lost}</td>
              <td className="text-center tabular-nums px-1 sm:px-3">{r.gd}</td>
              <td className="text-center font-black text-base sm:text-lg md:text-xl px-1.5 sm:px-3" style={{ color: BLUE }}>{r.points}</td>
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
      <table className="w-full text-[13px] sm:text-base md:text-lg">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="text-left px-1.5 sm:px-3 py-2 sm:py-2.5">#</th>
            <th className="text-left px-1.5 sm:px-3 py-2 sm:py-2.5">Jugador</th>
            <th className="text-left px-1.5 sm:px-3 py-2 sm:py-2.5">Equipo</th>
            <th className="text-center px-1.5 sm:px-3 py-2 sm:py-2.5">Goles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`sc-${i}`} className="border-t border-slate-100" data-testid={`stats-scorer-row-${i}`}>
              <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 font-bold">{i + 1}</td>
              <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 max-w-[100px] sm:max-w-none truncate">{r.name || r.player_name || "—"}</td>
              <td className="px-1.5 sm:px-3 py-2 sm:py-2.5 text-slate-500 max-w-[90px] sm:max-w-none truncate">{r.team_name || ""}</td>
              <td className="text-center font-black text-lg md:text-xl" style={{ color: RED }}>{r.goals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
