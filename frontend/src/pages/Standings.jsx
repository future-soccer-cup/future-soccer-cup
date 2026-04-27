import { useEffect, useState } from "react";
import api from "../lib/api";
import { Trophy, Goal } from "lucide-react";

export default function Standings() {
  const [rows, setRows] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/stats/standings", { params: cat ? { category: cat } : {} }),
      api.get("/stats/top-scorers", { params: cat ? { category: cat } : {} }),
      api.get("/teams"),
    ])
      .then(([s, sc, t]) => {
        setRows(s.data);
        setScorers(sc.data);
        setTeams(t.data);
      })
      .finally(() => setLoading(false));
  }, [cat]);

  const categories = Array.from(new Set(teams.map((t) => t.category))).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="standings-page">
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Estadísticas</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Posiciones</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setCat("")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!cat ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`} data-testid="standings-filter-all">Todas</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${cat === c ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-200"}`} data-testid={`standings-filter-${c}`}>{c}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-blue-700" />
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Tabla</h2>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm" data-testid="standings-table">
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
                  <th className="px-2 py-2 text-blue-700">Pts</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="10" className="text-center py-12 text-slate-400">Cargando...</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan="10" className="text-center py-12 text-slate-400">Sin datos aún</td></tr>}
                {rows.map((r, i) => (
                  <tr key={r.team_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-display font-black text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {r.team_logo ? <img src={r.team_logo} alt="" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{r.team_name[0]}</div>}
                        <span className="font-semibold">{r.team_name}</span>
                      </div>
                    </td>
                    <td className="text-center tabular-nums">{r.played}</td>
                    <td className="text-center tabular-nums">{r.won}</td>
                    <td className="text-center tabular-nums">{r.drawn}</td>
                    <td className="text-center tabular-nums">{r.lost}</td>
                    <td className="text-center tabular-nums">{r.gf}</td>
                    <td className="text-center tabular-nums">{r.ga}</td>
                    <td className="text-center tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="text-center tabular-nums font-display text-lg font-black text-blue-700">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Goal className="text-red-600" />
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Goleadores</h2>
          </div>
          <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100" data-testid="top-scorers-list">
            {scorers.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Sin goles registrados</div>}
            {scorers.map((s, i) => (
              <div key={s.player_id} className="px-3 py-3 flex items-center gap-3">
                <span className="font-display font-black text-slate-400 w-5">{i + 1}</span>
                {s.photo_url ? <img src={s.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">{s.name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.team_name}</div>
                </div>
                <div className="font-display text-2xl font-black text-red-600 tabular-nums">{s.goals}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
