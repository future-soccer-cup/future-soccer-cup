import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { imgSrc, FSC_LOGO } from "../lib/api";
import { Calendar, MapPin, ArrowRight, Trophy } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";
import { formatDate } from "../lib/dateFormat";

export default function Eventos() {
  const [s, setS] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {});
    api.get("/tournaments").then((r) => { setTournaments(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const active = tournaments.filter((t) => !t.archived);
  const archived = tournaments.filter((t) => t.archived);
  return (
    <div data-testid="eventos-page" style={AGENCY_FB}>
      <section className="text-white relative overflow-hidden" style={{ background: "#000000" }}>
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="italic text-2xl" style={{ ...CURSIVE, color: BLUE }}>{s.eventos_hero_kicker || "temporada"} {new Date().getFullYear()}</div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] mt-1" style={PLANE_CRASH} data-testid="eventos-hero-title">
            {planeCrashSafe(s.eventos_hero_title || "EVENTOS")}
          </h1>
          <div className="h-1 w-24 mt-4" style={{ background: BLUE }}/>
          <p className="text-fsc-gris mt-6 max-w-2xl text-lg" style={AGENCY_FB} data-testid="eventos-hero-body">
            {s.eventos_hero_body || "Conoce todos los torneos del calendario FSC y revive las ediciones pasadas."}
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading && <div className="text-center py-20 text-slate-400">Cargando...</div>}
        {!loading && active.length === 0 && archived.length === 0 && (
          <div className="text-center py-20 text-slate-400">Sin eventos publicados aún.</div>
        )}
        {active.length > 0 && (
          <>
            <h2 className="text-3xl font-black tracking-wide mb-6" style={{ ...PLANE_CRASH, color: "#000000" }}>{planeCrashSafe("VIGENTES")}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {active.map((t) => <EventCard key={t.id} ev={t} />)}
            </div>
          </>
        )}
        {archived.length > 0 && (
          <>
            <h2 className="text-3xl font-black tracking-wide mb-6" style={{ ...PLANE_CRASH, color: "#000000" }}>{planeCrashSafe("ARCHIVO HISTORICO")}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archived.map((t) => <EventCard key={t.id} ev={t} historical />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function EventCard({ ev, historical }) {
  return (
    <Link to="/datos-estadisticas" className={`group block rounded-xl overflow-hidden bg-white fsc-card-shadow`} style={{ border: historical ? "2px solid #cbd5e1" : "2px solid #000000", ...AGENCY_FB }} data-testid={`eventos-card-${ev.id}`}>
      <div className="aspect-[16/9] relative overflow-hidden" style={{ background: "#000000" }}>
        {ev.cover_url ? (
          <img src={imgSrc(ev.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 fsc-stripe opacity-40 flex items-center justify-center" style={{ background: "#04299e" }}>
            <img src={FSC_LOGO} alt="" className="h-24 w-24 opacity-80" />
          </div>
        )}
        {ev.featured && <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ background: BLUE, color: "#000000" }}>Destacado</span>}
        {historical && <span className="absolute top-3 left-3 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ background: "#1f2937" }}>Histórico</span>}
      </div>
      <div className="p-5">
        <div className="italic text-xl" style={{ ...CURSIVE, color: "#04299e" }}>edición {ev.season || ""}</div>
        <h3 className="text-2xl font-black tracking-wide mt-1" style={{ ...PLANE_CRASH, color: "#000000" }}>{planeCrashSafe(ev.name || "")}</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600" style={AGENCY_FB}>
          {ev.start_date && <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(ev.start_date)}</span>}
          {ev.city && <span className="flex items-center gap-1"><MapPin size={12}/> {ev.city}</span>}
          {ev.category && <span className="font-bold uppercase flex items-center gap-1"><Trophy size={12}/> {ev.category}</span>}
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: BLUE }}>
          Ver detalles <ArrowRight size={12}/>
        </div>
      </div>
    </Link>
  );
}

