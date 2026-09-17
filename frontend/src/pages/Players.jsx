import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { imgSrc } from "../lib/api";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");

  useEffect(() => {
    Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => {
      setPlayers(p.data);
      setTeams(t.data);
    });
  }, []);

  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const filtered = players.filter((p) => {
    if (team && p.team_id !== team) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="players-page">
      <div className="mb-6">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Roster</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Jugadores</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre..."
          data-testid="player-search-input"
          className="sm:col-span-2 px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700"
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-700" data-testid="player-team-filter">
          <option value="">Todos los equipos</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Sin resultados</p>}
        {filtered.map((p) => {
          const t = tmap[p.team_id];
          return (
            <Link key={p.id} to={`/jugadores/${p.id}`} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-700 hover:shadow-md transition-all flex items-center gap-3" data-testid={`player-card-${p.id}`}>
              {p.photo_url ? <img src={imgSrc(p.photo_url)} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{p.name[0]}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-black text-blue-700">#{p.jersey_number}</span>
                  <span className="font-semibold truncate">{p.name}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{p.position} · {t?.name || "—"}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
