import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { imgSrc } from "../lib/api";
import { Trophy, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { formatDate } from "../lib/dateFormat";

const STAGE_LABEL = {
  treintaidosavos: "32avos",
  octavos: "Octavos",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
  tercer_puesto: "3er puesto",
};

function MatchCard({ m }) {
  const homeFinal = m.status === "finalizado" && (m.winner_team_id === m.home_team_id || (m.home_score > m.away_score));
  const awayFinal = m.status === "finalizado" && (m.winner_team_id === m.away_team_id || (m.away_score > m.home_score));
  return (
    <div className="bg-white border border-slate-200 rounded-md p-2.5 min-w-[240px] shadow-sm" data-testid={`bracket-match-${m.id}`}>
      <Side name={m.home_team_name} logo={m.home_team_logo} color={m.home_team_color} score={m.home_score} winner={homeFinal} pending={!m.home_team_id} />
      <div className="border-t border-slate-100 my-1.5"></div>
      <Side name={m.away_team_name} logo={m.away_team_logo} color={m.away_team_color} score={m.away_score} winner={awayFinal} pending={!m.away_team_id} />
      <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 truncate">
        <Calendar size={12}/> {formatDate(m.match_date)}
        {m.venue && <><MapPin size={12} className="ml-1"/> {m.venue}</>}
      </div>
    </div>
  );
}

function Side({ name, logo, color, score, winner, pending }) {
  return (
    <div className={`flex items-center gap-2 px-1 py-1 rounded ${winner ? "bg-green-50" : ""}`}>
      <div className="h-7 w-7 rounded flex items-center justify-center text-xs font-display font-black text-white shrink-0" style={{ background: color || "#1d4ed8" }}>
        {logo ? <img src={imgSrc(logo)} alt="" className="h-full w-full object-contain" /> : (pending ? "?" : (name?.[0] || "?"))}
      </div>
      <span className={`text-sm flex-1 truncate ${pending ? "text-slate-400 italic" : winner ? "font-black text-green-700" : "font-semibold"}`}>{name}</span>
      <span className={`text-base font-display font-black tabular-nums w-7 text-right ${winner ? "text-green-700" : "text-slate-700"}`}>{score ?? "—"}</span>
    </div>
  );
}

export default function Bracket() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [brackets, setBrackets] = useState([]);
  const [selectedId, setSelectedId] = useState(sp.get("id") || "");
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/brackets").then((r) => {
      setBrackets(r.data);
      if (!selectedId && r.data.length > 0) setSelectedId(r.data[0].id);
      if (!r.data.length) setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.get(`/brackets/${selectedId}`).then((r) => setBracket(r.data)).finally(() => setLoading(false));
  }, [selectedId]);

  if (loading && !bracket) {
    return <div className="max-w-7xl mx-auto px-4 py-12"><p className="text-slate-500">Cargando bracket...</p></div>;
  }

  if (!brackets.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Trophy className="mx-auto text-slate-300" size={64}/>
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter mt-4">Bracket no disponible</h1>
        <p className="text-slate-500 mt-2">Aún no se ha creado un bracket de eliminación directa.</p>
        <Link to="/fixture" className="inline-block mt-6 fsc-btn-primary px-6 py-3 rounded-md text-sm">Ver fixture de grupos</Link>
      </div>
    );
  }

  if (!bracket) return null;

  const goBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate("/estadisticas");
  };

  // Group regular bracket matches by round
  const regular = bracket.matches.filter((m) => !m.is_third_place);
  const thirdMatch = bracket.matches.find((m) => m.is_third_place);
  const byRound = {};
  regular.forEach((m) => {
    if (!byRound[m.bracket_round]) byRound[m.bracket_round] = [];
    byRound[m.bracket_round].push(m);
  });
  // Sort positions
  Object.keys(byRound).forEach((r) => byRound[r].sort((a, b) => a.bracket_position - b.bracket_position));
  const rounds = Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map((r) => ({ round: Number(r), matches: byRound[r] }));

  const finalMatch = regular.find((m) => m.stage === "final");
  const champion = finalMatch && finalMatch.status === "finalizado"
    ? (finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team_name : finalMatch.home_score < finalMatch.away_score ? finalMatch.away_team_name : null)
    : null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="bracket-page">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900"
        data-testid="bracket-back-btn"
      >
        <ArrowLeft size={16} /> Volver
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Eliminación directa</span>
          <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter flex items-center gap-3"><Trophy size={48}/> {bracket.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{bracket.category} · {bracket.size} equipos · {bracket.total_rounds} rondas{bracket.include_third_place ? " · con 3er puesto" : ""}</p>
        </div>
        {brackets.length > 1 && (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white" data-testid="bracket-selector">
            {brackets.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.category})</option>)}
          </select>
        )}
      </div>

      {champion && (
        <div className="mb-6 bg-gradient-to-r from-yellow-100 to-amber-50 border-2 border-yellow-300 rounded-2xl p-5 flex items-center gap-4" data-testid="bracket-champion">
          <Trophy className="text-yellow-600" size={48}/>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-800">Campeón</div>
            <div className="font-display text-4xl font-black uppercase tracking-tight text-yellow-900">{champion}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-min" data-testid="bracket-tree">
          {rounds.map(({ round, matches }) => {
            const totalSlots = bracket.size / 2 ** round; // matches in this round
            const verticalGap = 2 ** (round - 1) * 18; // px spacing increases per round
            return (
              <div key={round} className="flex flex-col" style={{ gap: `${verticalGap}px`, paddingTop: `${(2 ** (round - 1) - 1) * 56}px` }} data-testid={`bracket-round-${round}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{STAGE_LABEL[matches[0]?.stage] || `Ronda ${round}`}</h3>
                {matches.map((m) => <MatchCard key={m.id} m={m} />)}
              </div>
            );
          })}
        </div>
      </div>

      {thirdMatch && (
        <div className="mt-10 max-w-md" data-testid="third-place-section">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><Trophy size={14} className="text-amber-700"/> Partido por el 3er puesto</h3>
          <MatchCard m={thirdMatch} />
        </div>
      )}
    </div>
  );
}
