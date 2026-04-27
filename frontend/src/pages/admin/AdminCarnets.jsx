import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Carnet } from "../PlayerDetail";
import { Printer, Search } from "lucide-react";

export default function AdminCarnets() {
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
    <div data-testid="admin-carnets">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Carnets</h1>
        <button onClick={() => window.print()} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2"><Printer size={16}/> Imprimir vista</button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Genera e imprime los carnets oficiales de cada jugador con código QR.</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-search" />
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-team-filter">
          <option value="">Todos los equipos</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 carnet-print">
        {filtered.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Sin jugadores</p>}
        {filtered.map((p) => (
          <Carnet key={p.id} player={p} team={tmap[p.team_id]} qrValue={`${window.location.origin}/jugadores/${p.id}`} />
        ))}
      </div>
    </div>
  );
}
