import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { imgSrc } from "../lib/api";
import { ArrowLeft } from "lucide-react";

const slugify = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ClubDetail() {
  const { slug } = useParams();
  const [teams, setTeams] = useState([]);
  const [playersByTeam, setPlayersByTeam] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teams").then(async (r) => {
      const matches = (r.data || []).filter((t) => slugify(t.name) === slug);
      setTeams(matches);
      const results = await Promise.all(
        matches.map((t) => api.get(`/players?team_id=${t.id}`).then((p) => [t.id, p.data]).catch(() => [t.id, []]))
      );
      setPlayersByTeam(Object.fromEntries(results));
    }).finally(() => setLoading(false));
  }, [slug]);

  const club = useMemo(() => {
    if (!teams.length) return null;
    return {
      name: teams[0].name,
      color: teams[0].color || "#1d4ed8",
      logo_url: teams.find((t) => t.logo_url)?.logo_url,
      city: teams.find((t) => t.city)?.city,
    };
  }, [teams]);

  if (loading) return <div className="p-12 text-center text-slate-500">Cargando...</div>;
  if (!club) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center" data-testid="club-detail-not-found">
        <h1 className="font-display text-4xl font-black uppercase">Club no encontrado</h1>
        <Link to="/equipos" className="inline-block mt-6 fsc-btn-primary px-5 py-3 rounded-md text-sm">Volver a Clubes</Link>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => (a.category || "").localeCompare(b.category || ""));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="club-detail-page">
      <Link to="/equipos" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-blue-700"><ArrowLeft size={14}/> Clubes</Link>

      <div className="mt-4 flex items-center gap-6 pb-8 border-b border-slate-200">
        <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-4xl font-display font-black overflow-hidden" style={{ background: club.color, color: "#fff" }}>
          {club.logo_url ? <img src={imgSrc(club.logo_url)} alt={club.name} className="h-full w-full object-contain p-2" /> : club.name[0]}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Club</div>
          <h1 className="font-display text-5xl font-black uppercase tracking-tighter">{club.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-600">
            {club.city && <span>{club.city}</span>}
            <span>{sortedTeams.length} categoría{sortedTeams.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {sortedTeams.map((t) => {
          const players = (playersByTeam[t.id] || []).slice().sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
          return (
            <section key={t.id} data-testid={`club-category-${t.category}`}>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-600">Categoría</span>
                  <h2 className="font-display text-4xl font-black uppercase tracking-tight">{t.category}</h2>
                  <div className="text-xs text-slate-500 mt-1">{t.coach ? `DT: ${t.coach}` : "Sin DT registrado"} · {players.length} jugadores</div>
                </div>
                <Link to={`/equipos/${t.id}`} className="text-xs font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900">Ver equipo →</Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.length === 0 && <p className="col-span-full text-slate-400 text-sm">Sin jugadores cargados aún.</p>}
                {players.map((p) => (
                  <Link key={p.id} to={`/jugadores/${p.id}`} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:border-blue-700" data-testid={`club-player-${p.id}`}>
                    <div className="font-display text-3xl font-black text-blue-700 w-10 text-center">{p.jersey_number}</div>
                    {p.photo_url ? <img src={imgSrc(p.photo_url)} alt={p.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold">{p.name[0]}</div>}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.position}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
