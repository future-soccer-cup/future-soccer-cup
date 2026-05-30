import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { imgSrc, FSC_LOGO } from "../lib/api";
import { Calendar, MapPin, ArrowRight, Trophy } from "lucide-react";

export default function Eventos() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/tournaments").then((r) => { setTournaments(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const active = tournaments.filter((t) => !t.archived);
  const archived = tournaments.filter((t) => t.archived);
  return (
    <div data-testid="eventos-page">
      <section className="bg-fsc-negro text-white relative overflow-hidden">
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="font-cursive text-2xl text-fsc-azul">temporada {new Date().getFullYear()}</div>
          <h1 className="font-display text-6xl md:text-8xl tracking-wider mt-1">EVENTOS</h1>
          <div className="h-1 w-24 bg-fsc-azul mt-4"/>
          <p className="text-fsc-gris mt-6 max-w-2xl text-lg">
            Conoce todos los torneos del calendario FSC y revive las ediciones pasadas.
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
            <h2 className="font-display text-3xl tracking-wider text-fsc-negro mb-6">VIGENTES</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {active.map((t) => <EventCard key={t.id} ev={t} />)}
            </div>
          </>
        )}
        {archived.length > 0 && (
          <>
            <h2 className="font-display text-3xl tracking-wider text-fsc-negro mb-6">ARCHIVO HISTÓRICO</h2>
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
    <Link to="/datos-estadisticas" className={`group block border-2 ${historical ? "border-slate-300" : "border-fsc-negro"} rounded-xl overflow-hidden bg-white fsc-card-shadow`} data-testid={`eventos-card-${ev.id}`}>
      <div className="aspect-[16/9] bg-fsc-negro relative overflow-hidden">
        {ev.cover_url ? (
          <img src={imgSrc(ev.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 fsc-stripe opacity-40 bg-fsc-azul-noche flex items-center justify-center">
            <img src={FSC_LOGO} alt="" className="h-24 w-24 opacity-80" />
          </div>
        )}
        {ev.featured && <span className="absolute top-3 right-3 bg-fsc-azul text-fsc-negro text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Destacado</span>}
        {historical && <span className="absolute top-3 left-3 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Histórico</span>}
      </div>
      <div className="p-5">
        <div className="font-cursive text-xl text-fsc-azul-oscuro">edición {ev.season || ""}</div>
        <h3 className="font-display text-2xl tracking-wider text-fsc-negro mt-1">{ev.name}</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
          {ev.start_date && <span className="flex items-center gap-1"><Calendar size={12}/> {ev.start_date}</span>}
          {ev.city && <span className="flex items-center gap-1"><MapPin size={12}/> {ev.city}</span>}
          {ev.category && <span className="font-bold uppercase flex items-center gap-1"><Trophy size={12}/> {ev.category}</span>}
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-widest text-fsc-azul flex items-center gap-1 group-hover:gap-2 transition-all">
          Ver detalles <ArrowRight size={12}/>
        </div>
      </div>
    </Link>
  );
}
