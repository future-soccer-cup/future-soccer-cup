import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { Trophy, Archive, Calendar, BarChart3, Goal } from "lucide-react";
import { formatDateTime } from "../lib/dateFormat";

/** Pestaña pública con histórico de torneos: fixture, posiciones (live o histórico) y goleadores. */
export default function DatosEstadisticas() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("posiciones");
  const [loading, setLoading] = useState(true);
  // datos por torneo
  const [liveStandings, setLiveStandings] = useState([]);
  const [historical, setHistorical] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scorers, setScorers] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get("/tournaments").then((r) => {
      if (!alive) return;
      setTournaments(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  const selected = useMemo(() => tournaments.find((t) => t.id === selectedId), [tournaments, selectedId]);

  const loadData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const [m, s, h, sc] = await Promise.all([
        api.get("/matches", { params: { tournament_id: selectedId } }),
        api.get("/stats/standings", { params: { tournament_id: selectedId } }),
        api.get("/historical/standings", { params: { tournament_id: selectedId } }),
        api.get("/stats/top-scorers"),
      ]);
      setMatches(m.data || []);
      setLiveStandings(s.data || []);
      setHistorical(h.data || []);
      setScorers(sc.data || []);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);
  useEffect(() => { loadData(); }, [loadData]);

  const groupedHistorical = useMemo(() => {
    const map = {};
    for (const row of historical) {
      const key = `${row.category}__${row.group_name}`;
      if (!map[key]) map[key] = { category: row.category, group_name: row.group_name, rows: [] };
      map[key].rows.push(row);
    }
    return Object.values(map).sort((a, b) => a.category.localeCompare(b.category) || a.group_name.localeCompare(b.group_name));
  }, [historical]);

  const isArchived = !!selected?.archived;

  return (
    <div data-testid="datos-estadisticas-page">
      {/* Header */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-400">Future Soccer Cup</span>
          <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter mt-2">Datos y Estadísticas</h1>
          <p className="text-slate-300 mt-3 max-w-2xl">
            Consulta el fixture, posiciones y goleadores de cada torneo. Incluye torneos vigentes y ediciones históricas archivadas.
          </p>
        </div>
      </section>

      {/* Selector + tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Torneo</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full px-4 py-3 border border-slate-200 rounded-md font-bold text-lg"
              data-testid="tournament-selector"
            >
              {tournaments.length === 0 && <option value="">Sin torneos disponibles</option>}
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {`${t.archived ? "[Hist] " : ""}${t.name} · ${t.season} · ${t.category}`}
                </option>
              ))}
            </select>
          </label>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center gap-2 text-blue-700">
              {isArchived ? <Archive size={18}/> : <Trophy size={18}/>}
              <span className="text-xs font-bold uppercase tracking-wider">
                {isArchived ? "Torneo histórico" : "Torneo activo"}
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-700">
              {selected ? `${selected.start_date} → ${selected.end_date}` : "—"}
            </div>
            {selected?.fmt === "cuadrangular_x2" && (
              <div className="mt-2 text-[11px] text-blue-700 font-semibold uppercase tracking-wider">
                Formato Cuadrangulares + Intergrupos
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200">
          {[
            { v: "posiciones", l: "Posiciones", I: BarChart3 },
            { v: "fixture", l: "Fixture", I: Calendar },
            { v: "goleadores", l: "Goleadores", I: Goal },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                tab === t.v ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
              data-testid={`datos-tab-${t.v}`}
            >
              <t.I size={14}/> {t.l}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-16 text-slate-400">Cargando...</div>}

        {!loading && tab === "posiciones" && (
          <PosicionesView
            isArchived={isArchived}
            liveStandings={liveStandings}
            groupedHistorical={groupedHistorical}
          />
        )}

        {!loading && tab === "fixture" && (
          <FixtureView matches={matches} />
        )}

        {!loading && tab === "goleadores" && (
          <GoleadoresView scorers={scorers} />
        )}
      </section>
    </div>
  );
}

function PosicionesView({ isArchived, liveStandings, groupedHistorical }) {
  if (isArchived) {
    if (groupedHistorical.length === 0) {
      return <div className="text-center py-16 text-slate-400" data-testid="historical-empty">Este torneo histórico aún no tiene posiciones cargadas.</div>;
    }
    return (
      <div className="space-y-8" data-testid="historical-standings">
        <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
          📦 <strong>Snapshot histórico:</strong> posiciones finales registradas al cierre del torneo. Desempate: Puntos → Juego Limpio → Diferencia de gol → Goles a favor.
        </p>
        {groupedHistorical.map((g) => (
          <div key={`${g.category}-${g.group_name}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="font-display text-lg font-black uppercase tracking-tight">{g.category} · {g.group_name}</div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400">{g.rows.length} equipos</span>
            </div>
            <StandingsTable rows={g.rows} historical />
          </div>
        ))}
      </div>
    );
  }
  if (liveStandings.length === 0) {
    return <div className="text-center py-16 text-slate-400">Sin partidos finalizados aún en este torneo.</div>;
  }
  return (
    <div data-testid="live-standings">
      <p className="text-xs text-slate-500 mb-3">
        Desempate: Puntos → <strong className="text-emerald-700">Juego Limpio</strong> → Diferencia de gol → Goles a favor.
      </p>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <StandingsTable rows={liveStandings} />
      </div>
    </div>
  );
}

function StandingsTable({ rows, historical }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-blue-50 text-xs uppercase tracking-wider">
        <tr>
          <th className="text-left px-3 py-2 w-8">#</th>
          <th className="text-left px-3 py-2">Equipo</th>
          <th className="px-2 py-2">PJ</th>
          <th className="px-2 py-2">G</th>
          <th className="px-2 py-2">E</th>
          <th className="px-2 py-2">P</th>
          <th className="px-2 py-2">GF</th>
          <th className="px-2 py-2">GC</th>
          <th className="px-2 py-2">DG</th>
          <th className="px-2 py-2 text-emerald-700">J.L</th>
          <th className="px-2 py-2 text-blue-700">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={historical ? `${r.team_name}-${i}` : r.team_id} className="border-t border-slate-100 hover:bg-slate-50">
            <td className="px-3 py-2 font-display font-black text-slate-400">{historical ? r.rank : i + 1}</td>
            <td className="px-3 py-2 font-semibold">{historical ? r.team_name : r.team_name}</td>
            <td className="text-center tabular-nums">{r.played}</td>
            <td className="text-center tabular-nums">{r.won}</td>
            <td className="text-center tabular-nums">{r.drawn}</td>
            <td className="text-center tabular-nums">{r.lost}</td>
            <td className="text-center tabular-nums">{r.gf}</td>
            <td className="text-center tabular-nums">{r.ga}</td>
            <td className="text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
            <td className="text-center tabular-nums text-emerald-700 font-semibold">{r.fair_play || 0}</td>
            <td className="text-center tabular-nums font-display text-lg font-black text-blue-700">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FixtureView({ matches }) {
  if (matches.length === 0) {
    return <div className="text-center py-16 text-slate-400">Sin partidos programados aún.</div>;
  }
  // Agrupar por jornada
  const byMd = {};
  for (const m of matches) {
    const k = m.matchday ?? 99;
    if (!byMd[k]) byMd[k] = [];
    byMd[k].push(m);
  }
  const keys = Object.keys(byMd).sort((a, b) => Number(a) - Number(b));
  return (
    <div className="space-y-6" data-testid="tournament-fixture">
      {keys.map((k) => (
        <div key={k} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
            <div className="font-display text-sm font-black uppercase tracking-tight">
              {k === "99" ? "Sin jornada" : `Jornada ${k}`}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400">{byMd[k].length} partidos</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-1.5">Fecha</th>
                <th className="text-right px-3 py-1.5">Local</th>
                <th className="text-center px-2 py-1.5">Score</th>
                <th className="text-left px-3 py-1.5">Visitante</th>
                <th className="text-left px-3 py-1.5">Grupo</th>
                <th className="text-left px-3 py-1.5">Cancha</th>
              </tr>
            </thead>
            <tbody>
              {byMd[k].map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-600 text-xs whitespace-nowrap">
                    {m.match_date ? formatDateTime(m.match_date) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold">{m.home_team_name || "—"}</td>
                  <td className="px-2 py-1.5 text-center font-display font-black tabular-nums">
                    {m.status === "finalizado" ? `${m.home_score} - ${m.away_score}` : "vs"}
                  </td>
                  <td className="px-3 py-1.5 font-semibold">{m.away_team_name || "—"}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-500">
                    {m.group_name || "—"}
                    {m.match_type === "intergrupo" && <span className="ml-1 inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-100 text-red-700 rounded">Intergrupo</span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-slate-500">{m.venue || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function GoleadoresView({ scorers }) {
  if (scorers.length === 0) {
    return <div className="text-center py-16 text-slate-400">Sin goles registrados aún.</div>;
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100" data-testid="tournament-scorers">
      {scorers.map((s, i) => (
        <div key={s.player_id} className="px-4 py-3 flex items-center gap-3">
          <span className="font-display font-black text-slate-400 w-6">{i + 1}</span>
          {s.photo_url
            ? <img src={s.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            : <div className="h-9 w-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">{(s.name || "?")[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{s.name}</div>
            <div className="text-xs text-slate-500 truncate">{s.team_name}</div>
          </div>
          <div className="font-display text-2xl font-black text-red-600 tabular-nums">{s.goals}</div>
        </div>
      ))}
    </div>
  );
}
