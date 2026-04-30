import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { imgSrc } from "../lib/api";
import { Users } from "lucide-react";

const slugify = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teams").then((r) => setTeams(r.data)).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(teams.map((t) => t.category))).sort(), [teams]);

  const clubs = useMemo(() => {
    const map = new Map();
    teams
      .filter((t) => !cat || t.category === cat)
      .forEach((t) => {
        const key = slugify(t.name);
        if (!map.has(key)) {
          map.set(key, {
            slug: key,
            name: t.name,
            color: t.color || "#1d4ed8",
            logo_url: t.logo_url,
            city: t.city,
            categories: new Set(),
            teams: [],
          });
        }
        const c = map.get(key);
        c.categories.add(t.category);
        c.teams.push(t);
        // prefer the most recent logo/city if missing
        if (!c.logo_url && t.logo_url) c.logo_url = t.logo_url;
        if (!c.city && t.city) c.city = t.city;
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, cat]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="teams-page">
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Clubes participantes</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Clubes</h1>
        <p className="mt-2 text-sm text-slate-500">Haz clic en un club para ver sus categorías y plantillas.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setCat("")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!cat ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`} data-testid="teams-filter-all">Todas</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${cat === c ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-200"}`} data-testid={`teams-filter-${c}`}>{c}</button>
        ))}
      </div>

      {loading && <div className="text-center text-slate-500 py-16">Cargando...</div>}
      {!loading && clubs.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <Users className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 font-display text-2xl uppercase tracking-tight text-slate-500">Sin clubes aún</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {clubs.map((c) => (
          <Link key={c.slug} to={`/clubes/${c.slug}`} data-testid={`club-card-${c.slug}`} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-display font-black overflow-hidden" style={{ background: c.color, color: "#fff" }}>
                {c.logo_url ? <img src={imgSrc(c.logo_url)} alt={c.name} className="h-full w-full object-contain p-1" /> : c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">{c.teams.length} equipo{c.teams.length !== 1 ? "s" : ""}</div>
                <div className="font-display text-2xl font-black uppercase tracking-tight truncate group-hover:text-blue-700">{c.name}</div>
                {c.city && <div className="text-xs text-slate-500 mt-0.5">{c.city}</div>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
              {Array.from(c.categories).sort().map((cc) => (
                <span key={cc} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{cc}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
