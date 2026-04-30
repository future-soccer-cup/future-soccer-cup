import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Users, Calendar, Hotel } from "lucide-react";
import { FSC_LOGO } from "../lib/api";

const HERO_BG = "https://images.pexels.com/photos/32694240/pexels-photo-32694240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const ACTION_IMG = "https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/30" />
        <div className="absolute inset-0 fsc-stripe-blue" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 fsc-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              Edición 2025 · Categorías Sub-10 a Sub-17
            </span>
            <h1 className="mt-5 font-display text-5xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] text-white tracking-tighter">
              Donde nace<br />
              el <span className="text-red-500">futuro</span> del<br />
              fútbol.
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl leading-relaxed">
              Future Soccer Cup reúne a los mejores clubes infantiles y juveniles. Sigue el fixture, consulta posiciones, conoce a los jugadores y reserva tu estadía con la familia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/fixture" data-testid="hero-fixture-btn" className="fsc-btn-red px-6 py-3 rounded-md text-sm">
                Ver Fixture <ArrowRight className="inline ml-1" size={16} />
              </Link>
              <Link to="/cotizar" data-testid="hero-quote-btn" className="fsc-btn-primary px-6 py-3 rounded-md text-sm">
                Cotizar Evento
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 hidden md:block fsc-fade-up">
            <div className="relative bg-white p-6 rounded-2xl shadow-2xl border-4 border-red-500/40 -rotate-2">
              <img src={FSC_LOGO} alt="FSC" className="w-full max-w-xs mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "32", l: "Clubes Inscritos" },
            { n: "8", l: "Categorías" },
            { n: "120+", l: "Partidos" },
            { n: "1,500", l: "Jugadores" },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <div className="font-display text-5xl md:text-6xl font-black text-blue-700 leading-none">{s.n}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">La plataforma</span>
            <h2 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight">Todo el torneo,<br/>en un solo lugar.</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6">
          <Link to="/fixture" className="md:col-span-7 group bg-slate-900 text-white rounded-2xl p-8 relative overflow-hidden fsc-card-shadow" data-testid="card-fixture">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: `url(${ACTION_IMG})` }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/70 to-transparent" />
            <div className="relative">
              <Calendar size={28} className="text-red-500" />
              <h3 className="mt-3 font-display text-3xl md:text-4xl font-black uppercase">Fixture en vivo</h3>
              <p className="mt-2 text-slate-300 max-w-md">Consulta partidos por categoría, fase y fecha. Resultados actualizados al instante.</p>
            </div>
          </Link>

          <Link to="/posiciones" className="md:col-span-5 bg-blue-700 text-white rounded-2xl p-8 fsc-card-shadow" data-testid="card-standings">
            <Trophy size={28} className="text-white" />
            <h3 className="mt-3 font-display text-3xl md:text-4xl font-black uppercase">Posiciones</h3>
            <p className="mt-2 text-blue-100">Tabla de posiciones, goleadores y rendimiento por categoría.</p>
          </Link>

          <Link to="/equipos" className="md:col-span-4 bg-white border-2 border-slate-900 rounded-2xl p-8 fsc-card-shadow" data-testid="card-teams">
            <Users size={28} className="text-blue-700" />
            <h3 className="mt-3 font-display text-2xl md:text-3xl font-black uppercase">Equipos</h3>
            <p className="mt-2 text-slate-600 text-sm">Conoce a todos los clubes que compiten en FSC 2025.</p>
          </Link>

          <Link to="/jugadores" className="md:col-span-4 bg-white border-2 border-slate-900 rounded-2xl p-8 fsc-card-shadow" data-testid="card-players">
            <Users size={28} className="text-red-600" />
            <h3 className="mt-3 font-display text-2xl md:text-3xl font-black uppercase">Jugadores</h3>
            <p className="mt-2 text-slate-600 text-sm">Plantillas, posiciones y estadísticas individuales.</p>
          </Link>

          <Link to="/cotizar" className="md:col-span-4 bg-red-600 text-white rounded-2xl p-8 fsc-card-shadow" data-testid="card-cotizar">
            <Hotel size={28} className="text-white" />
            <h3 className="mt-3 font-display text-2xl md:text-3xl font-black uppercase">Cotiza tu viaje</h3>
            <p className="mt-2 text-red-50 text-sm">Hospedaje, transporte y tours para acompañar a tu equipo.</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white fsc-stripe-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-400">Para las familias</span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-black uppercase tracking-tight">Acompaña a tu campeón.</h2>
            <p className="mt-4 text-slate-300 max-w-xl">
              Reserva hoteles cercanos a las sedes, transporte directo a los partidos y tours por la ciudad. Todo desde un solo lugar.
            </p>
            <Link to="/registro" className="mt-6 inline-block fsc-btn-red px-6 py-3 rounded-md text-sm" data-testid="cta-register-btn">
              Crear cuenta familiar
            </Link>
            <Link to="/registro-equipo" className="mt-3 ml-3 inline-block fsc-btn-primary px-6 py-3 rounded-md text-sm" data-testid="cta-register-team-btn">
              Registrar equipo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img className="rounded-xl object-cover h-48 w-full" src="https://images.unsplash.com/photo-1747561088583-b8b849045895?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBmYW1pbHklMjByZXNvcnQlMjBob3RlbHxlbnwwfHx8fDE3NzczMzIxMjB8MA&ixlib=rb-4.1.0&q=85" alt="Hotel" />
            <img className="rounded-xl object-cover h-48 w-full mt-6" src="https://images.pexels.com/photos/29586609/pexels-photo-29586609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Transporte" />
          </div>
        </div>
      </section>
    </div>
  );
}
