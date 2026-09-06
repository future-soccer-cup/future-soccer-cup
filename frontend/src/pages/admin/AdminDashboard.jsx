import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  Users, Shirt, Calendar, Receipt, Building2, AlertCircle,
  TrendingUp, Wallet, CheckCircle2, Clock,
} from "lucide-react";

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const fmtNum = (n) => Number(n || 0).toLocaleString("es-CO");

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default function AdminDashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/clubs?status=").catch(() => ({ data: [] })),
      api.get("/teams?status=").catch(() => api.get("/teams")),
      api.get("/players?status=").catch(() => api.get("/players")),
      api.get("/matches").catch(() => ({ data: [] })),
      api.get("/quotes").catch(() => ({ data: [] })),
      api.get("/admin/payments").catch(() => ({ data: [] })),
    ]).then(([clubs, teams, players, matches, quotes, payments]) => {
      setD({
        clubs: clubs.data,
        teams: teams.data,
        players: players.data,
        matches: matches.data,
        quotes: quotes.data,
        payments: payments.data,
      });
    });
  }, []);

  if (!d) {
    return (
      <div data-testid="admin-dashboard">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-6">Cargando indicadores...</p>
      </div>
    );
  }

  const SOM = startOfMonth();

  // === KPIs ===
  const teamsApproved = d.teams.filter((t) => (t.status || "aprobado") === "aprobado").length;
  const teamsPending = d.teams.filter((t) => t.status === "pendiente").length;
  const playersApproved = d.players.filter((p) => (p.status || "aprobado") === "aprobado").length;
  const playersPending = d.players.filter((p) => p.status === "pendiente").length;
  const clubsApproved = d.clubs.filter((c) => (c.status || "aprobado") === "aprobado").length;
  const clubsPending = d.clubs.filter((c) => c.status === "pendiente").length;

  const matchesFinalizados = d.matches.filter((m) => m.status === "finalizado").length;
  const matchesProgramados = d.matches.filter((m) => m.status === "programado").length;
  const matchesEnCurso = d.matches.filter((m) => m.status === "en_curso").length;

  const quotesPagadas = d.quotes.filter((q) => q.status === "pagada");
  const quotesPagadasMes = quotesPagadas.filter((q) => q.created_at && q.created_at >= SOM);
  const quotesPendientes = d.quotes.filter((q) => q.status === "pendiente").length;
  const quotesAprobadas = d.quotes.filter((q) => q.status === "aprobada").length;

  const paymentsPorRevisar = d.payments.filter((p) => p.status === "sin_verificar").length;
  const paymentsAprobados = d.payments.filter((p) => p.status === "aprobado");
  const ingresoTotalCOP = paymentsAprobados.reduce((s, p) => s + Number(p.amount || 0), 0);
  const ingresoMesCOP = paymentsAprobados
    .filter((p) => (p.payment_date || p.created_at) >= SOM)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const ingresoQuotesTotal = quotesPagadas.reduce((s, q) => s + Number(q.total_amount || 0), 0);

  const aprobacionesPendientes = teamsPending + playersPending + clubsPending;

  // === KPI cards ===
  const kpis = [
    { label: "Clubes aprobados", value: fmtNum(clubsApproved), sub: clubsPending ? `${clubsPending} pendientes` : "Sin pendientes", icon: Building2, color: "bg-slate-900", to: "/admin/aprobaciones" },
    { label: "Equipos aprobados", value: fmtNum(teamsApproved), sub: teamsPending ? `${teamsPending} pendientes` : "Sin pendientes", icon: Shirt, color: "bg-blue-700", to: "/admin/equipos" },
    { label: "Jugadores activos", value: fmtNum(playersApproved), sub: playersPending ? `${playersPending} pendientes` : "Sin pendientes", icon: Users, color: "bg-red-600", to: "/admin/jugadores" },
    { label: "Partidos jugados", value: fmtNum(matchesFinalizados), sub: `${matchesProgramados} programados${matchesEnCurso ? ` · ${matchesEnCurso} en curso` : ""}`, icon: Calendar, color: "bg-emerald-700", to: "/admin/partidos" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">Salud del torneo en tiempo real.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map((it) => (
          <Link key={it.label} to={it.to} className={`${it.color} text-white rounded-xl p-5 fsc-card-shadow hover:scale-[1.02] transition-transform`} data-testid={`kpi-${it.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-start justify-between">
              <it.icon size={28} className="opacity-90" />
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 text-right">{it.sub}</span>
            </div>
            <div className="font-display text-5xl font-black mt-3 leading-none tabular-nums">{it.value}</div>
            <div className="text-xs uppercase tracking-widest font-bold mt-1 opacity-90">{it.label}</div>
          </Link>
        ))}
      </div>

      {/* Sección financiera */}
      <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-10 text-slate-700">Ingresos & Pagos</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
        <StatCard
          testid="kpi-ingresos-total"
          icon={Wallet} label="Ingresos COP totales"
          value={fmtCOP(ingresoTotalCOP)}
          sub={`${paymentsAprobados.length} abonos aprobados`}
          accent="text-green-700"
        />
        <StatCard
          testid="kpi-ingresos-mes"
          icon={TrendingUp} label="Ingresos COP del mes"
          value={fmtCOP(ingresoMesCOP)}
          sub={`${quotesPagadasMes.length} cotizaciones pagadas este mes`}
          accent="text-blue-700"
        />
        <StatCard
          testid="kpi-pagos-revisar"
          icon={Clock} label="Abonos por revisar"
          value={fmtNum(paymentsPorRevisar)}
          sub={paymentsPorRevisar ? "Requieren validación" : "Todo al día"}
          accent={paymentsPorRevisar ? "text-amber-600" : "text-slate-400"}
          to="/admin/pagos"
        />
        <StatCard
          testid="kpi-cotizaciones-pagadas"
          icon={CheckCircle2} label="Cotizaciones pagadas"
          value={fmtNum(quotesPagadas.length)}
          sub={`Facturado: ${fmtCOP(ingresoQuotesTotal)}`}
          accent="text-emerald-700"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <StatCard
          testid="kpi-cotizaciones-pendientes"
          icon={Receipt} label="Cotizaciones pendientes" value={fmtNum(quotesPendientes)}
          sub={`${quotesAprobadas} aprobadas listas para pago`}
          accent="text-yellow-600"
          to="/admin/cotizaciones"
        />
        <StatCard
          testid="kpi-aprobaciones-pendientes"
          icon={AlertCircle} label="Aprobaciones pendientes" value={fmtNum(aprobacionesPendientes)}
          sub={`${clubsPending} clubes · ${teamsPending} equipos · ${playersPending} jugadores`}
          accent={aprobacionesPendientes ? "text-red-600" : "text-slate-400"}
          to="/admin/aprobaciones"
        />
        <StatCard
          testid="kpi-clubes-totales"
          icon={Building2} label="Total clubes inscritos" value={fmtNum(d.clubs.length)}
          sub={`${clubsPending ? clubsPending + " esperan aprobación" : "Todos al día"}`}
          accent="text-slate-700"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6" data-testid="dash-quick-actions">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Acciones rápidas</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Link to="/admin/aprobaciones" className="px-4 py-3 bg-yellow-50 rounded-md font-bold uppercase tracking-wide text-yellow-800 hover:bg-yellow-100">⚡ Revisar aprobaciones</Link>
            <Link to="/admin/pagos" className="px-4 py-3 bg-amber-50 rounded-md font-bold uppercase tracking-wide text-amber-800 hover:bg-amber-100">💳 Validar abonos</Link>
            <Link to="/admin/generador-fixture" className="px-4 py-3 bg-slate-900 text-white rounded-md font-bold uppercase tracking-wide hover:bg-slate-800">📅 Generar fixture</Link>
            <Link to="/admin/cotizaciones" className="px-4 py-3 bg-blue-50 rounded-md font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-100">📄 Cotizaciones</Link>
            <Link to="/admin/carnets" className="px-4 py-3 bg-emerald-50 rounded-md font-bold uppercase tracking-wide text-emerald-700 hover:bg-emerald-100">🪪 Imprimir carnets</Link>
            <Link to="/admin/home" className="px-4 py-3 bg-red-50 rounded-md font-bold uppercase tracking-wide text-red-700 hover:bg-red-100">📢 Publicar noticia</Link>
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-6 fsc-stripe-blue">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Pulso del torneo</h3>
          <ul className="mt-3 text-sm text-slate-300 space-y-2">
            <li>· <span className="text-white font-bold">{matchesFinalizados}</span> de <span className="text-white">{d.matches.length}</span> partidos finalizados</li>
            <li>· <span className="text-white font-bold">{playersApproved}</span> jugadores activos distribuidos en <span className="text-white">{teamsApproved}</span> equipos</li>
            <li>· Cotizaciones aprobadas listas para cobrar: <span className="text-white font-bold">{quotesAprobadas}</span></li>
            <li>· Abonos por validar: <span className={paymentsPorRevisar ? "text-amber-400 font-bold" : "text-white font-bold"}>{paymentsPorRevisar}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = "text-slate-700", to, testid }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <Icon size={20} className={accent} />
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</span>
      </div>
      <div className={`font-display text-3xl font-black mt-3 leading-none tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-1 truncate">{sub}</div>
    </>
  );
  const cls = "bg-white border border-slate-200 rounded-xl p-4 block";
  if (to) return <Link to={to} className={`${cls} hover:border-blue-300 transition-colors`} data-testid={testid}>{inner}</Link>;
  return <div className={cls} data-testid={testid}>{inner}</div>;
}
