import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Users } from "lucide-react";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teams").then((r) => setTeams(r.data)).finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(teams.map((t) => t.category))).sort();
  const filtered = cat ? teams.filter((t) => t.category === cat) : teams;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="teams-page">
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Clubes participantes</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Equipos</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setCat("")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!cat ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`} data-testid="teams-filter-all">Todas</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${cat === c ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-200"}`} data-testid={`teams-filter-${c}`}>{c}</button>
        ))}
      </div>

      {loading && <div className="text-center text-slate-500 py-16">Cargando...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <Users className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 font-display text-2xl uppercase tracking-tight text-slate-500">Sin equipos aún</p>
          <p className="text-sm text-slate-400">El administrador puede agregar equipos desde el panel.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <Link key={t.id} to={`/equipos/${t.id}`} data-testid={`team-card-${t.id}`} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-display font-black" style={{ background: t.color || "#1d4ed8", color: "#fff" }}>
                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="h-full w-full object-contain p-1" /> : t.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">{t.category}</div>
                <div className="font-display text-2xl font-black uppercase tracking-tight truncate group-hover:text-blue-700">{t.name}</div>
                {t.city && <div className="text-xs text-slate-500 mt-0.5">{t.city}</div>}
              </div>
            </div>
            {t.coach && <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">DT: <span className="text-slate-900 font-medium">{t.coach}</span></div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
