import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Users, Calendar, BarChart3, ShieldCheck, IdCard } from "lucide-react";
import { FSC_LOGO } from "../lib/api";

const HERO_BG =
  "https://images.pexels.com/photos/32694240/pexels-photo-32694240.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600";
const ACTION_IMG =
  "https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600";

export default function Home() {
  return (
    <div data-testid="home-page" className="bg-white">
      {/* ───────────────── HERO ───────────────── */}
      <section className="relative overflow-hidden bg-slate-950 min-h-[88vh] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/85 to-blue-950/60" />
        <div className="absolute inset-0 fsc-stripe-blue" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fsc-fade-up">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
                <ShieldCheck size={12} /> Edición Diciembre 2025
              </span>
              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-[0.25em]">
                Categorías Sub-8 a Sub-18
              </span>
            </div>

            <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.88] text-white tracking-tighter">
              La cumbre del<br />
              fútbol formativo<br />
              <span className="text-red-500">infantil</span> & <span className="text-blue-400">juvenil</span>.
            </h1>

            <p className="mt-7 text-lg text-slate-300 max-w-2xl leading-relaxed">
              Future Soccer Cup convoca clubes de toda la región en torneos certificados,
              con fixture profesional, transmisión de resultados en vivo y experiencia
              integral de viaje para los equipos visitantes.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/fixture"
                data-testid="hero-fixture-btn"
                className="fsc-btn-red px-7 py-3.5 rounded-md text-sm flex items-center gap-2 group"
              >
                Ver fixture en vivo
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
              </Link>
              <Link
                to="/datos-estadisticas"
                data-testid="hero-datos-btn"
                className="px-7 py-3.5 rounded-md text-sm font-bold uppercase tracking-wider text-white border border-white/40 hover:bg-white/10 transition-colors"
              >
                Datos y estadísticas
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg border-t border-white/10 pt-6">
              <Stat n="200+" l="Clubes participantes" />
              <Stat n="15" l="Categorías" />
              <Stat n="4" l="Partidos garantizados" />
            </div>
          </div>

          <div className="lg:col-span-5 hidden lg:block fsc-fade-up">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-blue-500/20 to-red-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white p-10 rounded-2xl shadow-2xl border border-white/20">
                <img src={FSC_LOGO} alt="Future Soccer Cup" className="w-full max-w-xs mx-auto" />
                <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Próximo evento</div>
                    <div className="font-display text-lg font-black text-slate-900 mt-1">Diciembre 2025</div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Sede</div>
                    <div className="font-display text-lg font-black text-slate-900 mt-1">Eje Cafetero</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── DTS BAR ───────────────── */}
      <section className="bg-gradient-to-r from-blue-700 to-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white">
            <div className="text-xs tracking-[0.3em] uppercase font-bold opacity-80">Directores Técnicos</div>
            <div className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
              Inscribe tu club y administra tu plantilla.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/registro-equipo"
              data-testid="dts-register-btn"
              className="bg-white text-blue-700 hover:text-blue-800 px-6 py-3 rounded-md text-sm font-bold uppercase tracking-wider shadow-lg"
            >
              Registrar club
            </Link>
            <Link
              to="/login"
              data-testid="dts-login-btn"
              className="text-white border border-white/40 hover:bg-white/10 px-6 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Ingresar al panel
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────── PLATAFORMA ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-end mb-12">
          <div className="lg:col-span-7">
            <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">La plataforma</span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-slate-900">
              Una infraestructura<br />deportiva profesional.
            </h2>
          </div>
          <div className="lg:col-span-5 text-slate-600 text-base leading-relaxed">
            Cada torneo de FSC corre sobre un sistema único que centraliza inscripción,
            fixture, resultados, posiciones y estadísticas individuales. Sin planillas
            sueltas, sin información perdida.
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-5">
          <Link
            to="/fixture"
            className="md:col-span-7 group relative overflow-hidden rounded-2xl bg-slate-900 text-white p-10 fsc-card-shadow min-h-[280px] flex items-end"
            data-testid="card-fixture"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
              style={{ backgroundImage: `url(${ACTION_IMG})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/60 to-transparent" />
            <div className="relative">
              <Calendar size={32} className="text-red-500" />
              <h3 className="mt-4 font-display text-3xl md:text-5xl font-black uppercase tracking-tight">
                Fixture en vivo
              </h3>
              <p className="mt-3 text-slate-300 max-w-md">
                Partidos por categoría, jornada y fase. Resultados actualizados al instante,
                con goleadores, tarjetas y juego limpio.
              </p>
            </div>
          </Link>

          <Link
            to="/datos-estadisticas"
            className="md:col-span-5 group bg-blue-700 hover:bg-blue-800 text-white rounded-2xl p-10 fsc-card-shadow transition-colors min-h-[280px] flex flex-col justify-end"
            data-testid="card-datos"
          >
            <BarChart3 size={32} className="text-white" />
            <h3 className="mt-4 font-display text-3xl md:text-4xl font-black uppercase tracking-tight">
              Datos & estadísticas
            </h3>
            <p className="mt-3 text-blue-100">
              Histórico completo de torneos, posiciones, goleadores y rendimiento por equipo.
            </p>
          </Link>

          <Link
            to="/equipos"
            className="md:col-span-4 group bg-white border-2 border-slate-900 rounded-2xl p-8 fsc-card-shadow hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="card-teams"
          >
            <Users size={28} className="text-blue-700 group-hover:text-white" />
            <h3 className="mt-4 font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
              Clubes
            </h3>
            <p className="mt-2 text-sm text-slate-600 group-hover:text-slate-300">
              Plantillas oficiales, escudos y datos de cada institución participante.
            </p>
          </Link>

          <Link
            to="/bracket"
            className="md:col-span-4 group bg-white border-2 border-slate-900 rounded-2xl p-8 fsc-card-shadow hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="card-bracket"
          >
            <Trophy size={28} className="text-red-600 group-hover:text-red-400" />
            <h3 className="mt-4 font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
              Bracket final
            </h3>
            <p className="mt-2 text-sm text-slate-600 group-hover:text-slate-300">
              Sembrado, cruces y campeones de cada fase de eliminación directa.
            </p>
          </Link>

          <Link
            to="/cotizar"
            className="md:col-span-4 group bg-red-600 hover:bg-red-700 text-white rounded-2xl p-8 fsc-card-shadow transition-colors"
            data-testid="card-cotizar"
          >
            <IdCard size={28} />
            <h3 className="mt-4 font-display text-2xl md:text-3xl font-black uppercase tracking-tight">
              Cotizar evento
            </h3>
            <p className="mt-2 text-sm text-red-50">
              Paquetes de inscripción, hospedaje y experiencias para clubes visitantes.
            </p>
          </Link>
        </div>
      </section>

      {/* ───────────────── REGLAMENTO / DIFERENCIAL ───────────────── */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-600">Cómo competimos</span>
              <h2 className="mt-2 font-display text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">
                Reglamento claro,<br />4 partidos garantizados.
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Cada equipo juega un mínimo de 4 partidos en la fase de grupos —incluido
                el sorteo de intergrupos cuando una categoría tiene 8 equipos. El
                desempate se resuelve por <strong>Puntos → Juego Limpio → Diferencia de gol → Goles a favor</strong>,
                porque para FSC el respeto en cancha es el primer trofeo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Pill emoji="🎯" title="Inscripción oficial" body="Plantillas y carnets digitalizados con QR único por jugador." />
              <Pill emoji="🏟️" title="Fixture profesional" body="Generador con doble jornada, cuadrangulares e intergrupos." />
              <Pill emoji="📊" title="Stats en vivo" body="Goleadores, tarjetas y posiciones recalculadas automáticamente." />
              <Pill emoji="🤝" title="Juego Limpio" body="Primer criterio de desempate por reglamento FSC." />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── CTA DT ───────────────── */}
      <section className="bg-slate-950 text-white fsc-stripe-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase font-bold text-red-400">Para directores técnicos</span>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-black uppercase tracking-tight">
              Inscribe tu club<br />en minutos.
            </h2>
            <p className="mt-4 text-slate-300 max-w-xl leading-relaxed">
              Solo los Directores Técnicos gestionan inscripciones, plantillas y
              pagos en FSC. Crea tu cuenta, sube tu logo y carga la plantilla
              desde la plantilla Excel oficial. El resto lo coordinamos contigo.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/registro-equipo"
                className="fsc-btn-red px-7 py-3.5 rounded-md text-sm"
                data-testid="cta-register-team-btn"
              >
                Registrar mi club
              </Link>
              <Link
                to="/login"
                className="px-7 py-3.5 rounded-md text-sm font-bold uppercase tracking-wider text-white border border-white/30 hover:bg-white/10 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              className="rounded-xl object-cover h-56 w-full"
              src="https://images.unsplash.com/photo-1747561088583-b8b849045895?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
              alt="Hospedaje FSC"
            />
            <img
              className="rounded-xl object-cover h-56 w-full mt-8"
              src="https://images.pexels.com/photos/29586609/pexels-photo-29586609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=900"
              alt="Transporte FSC"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="font-display text-3xl md:text-4xl font-black text-white leading-none tabular-nums">{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{l}</div>
    </div>
  );
}

function Pill({ emoji, title, body }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-display text-lg font-black uppercase tracking-tight text-slate-900">{title}</div>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
