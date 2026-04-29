import { useEffect, useState } from "react";
import api from "../lib/api";
import { Calendar, MapPin } from "lucide-react";

export default function Fixture() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState("");
  const [matchdayFilter, setMatchdayFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/matches"), api.get("/teams")])
      .then(([m, t]) => {
        setMatches(m.data);
        setTeams(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(teams.map((t) => t.category))).sort();
  const matchdays = Array.from(new Set(matches.map((m) => m.matchday).filter(Boolean))).sort((a, b) => a - b);

  const filtered = matches.filter((m) => {
    if (filter) {
      const ht = teams.find((t) => t.id === m.home_team_id);
      if (ht?.category !== filter) return false;
    }
    if (matchdayFilter && String(m.matchday) !== matchdayFilter) return false;
    return true;
  });

  // group by date
  const groups = filtered.reduce((acc, m) => {
    const d = (m.match_date || "").slice(0, 10);
    acc[d] = acc[d] || [];
    acc[d].push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="fixture-page">
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Calendario oficial</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Fixture</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("")}
          data-testid="filter-all"
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!filter ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            data-testid={`filter-${c}`}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${filter === c ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-200"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {matchdays.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">Jornada:</span>
          <button onClick={() => setMatchdayFilter("")} data-testid="matchday-all" className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded border ${!matchdayFilter ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200"}`}>Todas</button>
          {matchdays.map((md) => (
            <button key={md} onClick={() => setMatchdayFilter(String(md))} data-testid={`matchday-${md}`} className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded border ${matchdayFilter === String(md) ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200"}`}>
              F{md}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-center text-slate-500 py-16">Cargando partidos...</div>}

      {!loading && Object.keys(groups).length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <Calendar className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 font-display text-2xl uppercase tracking-tight text-slate-500">Aún no hay partidos programados</p>
          <p className="text-sm text-slate-400">El administrador puede agregar partidos desde el panel.</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.keys(groups)
          .sort()
          .map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-6 bg-red-600" />
                <div className="font-display text-2xl font-black uppercase tracking-tight">
                  {date ? new Date(date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }) : "Sin fecha"}
                </div>
              </div>
              <div className="grid gap-3">
                {groups[date].map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function MatchRow({ m }) {
  const time = m.match_date ? new Date(m.match_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—";
  const isFinished = m.status === "finalizado";
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-12 items-center gap-3 hover:border-blue-700 hover:shadow-md transition-all" data-testid={`match-${m.id}`}>
      <div className="col-span-2 text-xs uppercase tracking-wider font-bold text-slate-500">
        {time}
        {m.venue && (
          <div className="flex items-center gap-1 mt-1 normal-case font-medium text-slate-400">
            <MapPin size={12} /> {m.venue}
          </div>
        )}
      </div>
      <div className="col-span-4 flex items-center gap-3 justify-end text-right">
        <span className="font-bold truncate">{m.home_team_name}</span>
        {m.home_team_logo ? <img src={m.home_team_logo} alt="" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{m.home_team_name?.[0]}</div>}
      </div>
      <div className="col-span-2 text-center">
        {isFinished ? (
          <div className="font-display text-3xl font-black tabular-nums">
            {m.home_score} <span className="text-slate-300">·</span> {m.away_score}
          </div>
        ) : (
          <span className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold bg-slate-100 text-slate-600 rounded">
            {m.status === "en_curso" ? "EN VIVO" : "VS"}
          </span>
        )}
      </div>
      <div className="col-span-4 flex items-center gap-3">
        {m.away_team_logo ? <img src={m.away_team_logo} alt="" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">{m.away_team_name?.[0]}</div>}
        <span className="font-bold truncate">{m.away_team_name}</span>
      </div>
    </div>
  );
}
