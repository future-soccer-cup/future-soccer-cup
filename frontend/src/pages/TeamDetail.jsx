import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { imgSrc } from "../lib/api";

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    api.get(`/teams/${id}`).then((r) => setTeam(r.data));
    api.get(`/players?team_id=${id}`).then((r) => setPlayers(r.data));
  }, [id]);

  if (!team) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="team-detail-page">
      <Link to="/equipos" className="text-xs uppercase tracking-widest font-bold text-blue-700">← Clubes</Link>

      <div className="mt-4 flex items-center gap-6 pb-8 border-b border-slate-200">
        <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-4xl font-display font-black overflow-hidden" style={{ background: team.color || "#1d4ed8", color: "#fff" }}>
          {team.logo_url ? <img src={imgSrc(team.logo_url)} alt={team.name} className="h-full w-full object-contain p-2" /> : team.name[0]}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{team.category}</div>
          <h1 className="font-display text-5xl font-black uppercase tracking-tighter">{team.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-600">
            {team.city && <span>{team.city}</span>}
            {team.coach && <span>DT: <strong className="text-slate-900">{team.coach}</strong></span>}
          </div>
        </div>
      </div>

      <h2 className="mt-8 mb-4 font-display text-2xl font-black uppercase tracking-tight">Plantilla ({players.length})</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.length === 0 && <p className="text-slate-400 text-sm">Sin jugadores cargados aún.</p>}
        {players.map((p) => (
          <Link key={p.id} to={`/jugadores/${p.id}`} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:border-blue-700" data-testid={`player-link-${p.id}`}>
            <div className="font-display text-3xl font-black text-blue-700 w-10 text-center">{p.jersey_number}</div>
            {p.photo_url ? <img src={imgSrc(p.photo_url)} alt={p.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold">{p.name[0]}</div>}
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-slate-500">{p.position}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
