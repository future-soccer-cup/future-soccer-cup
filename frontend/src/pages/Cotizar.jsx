import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Trophy, Hotel, Utensils, Bus, Map, BadgeCheck, ArrowRight } from "lucide-react";

const ROOM_TYPES = [
  { id: "single",   label: "Sencilla (1 pax)" },
  { id: "double",   label: "Doble (2 pax)" },
  { id: "triple",   label: "Triple (3 pax)" },
  { id: "multiple", label: "Múltiple (hasta 20 pax)" },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Cotizar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [config, setConfig] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [form, setForm] = useState({
    event_type: "",
    birth_year: "",
    lodging_tier: "gold",
    room_type: "triple",
    pax: 20,
    nights: 5,
    days: 6,
    includes_breakfast: false,
    includes_lunch: false,
    transport_routes: [],
    tour_ids: [],
    include_registration: true,
    contact_phone: "",
    notes: "",
  });
  const [estimate, setEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get("/event-types").then((r) => setConfig(r.data)); }, []);
  useEffect(() => {
    if (user?.team_id) {
      api.get(`/teams/${user.team_id}`).then((r) => {
        setMyTeam(r.data);
        setForm((f) => ({ ...f, event_type: r.data.event_type || f.event_type, birth_year: r.data.birth_year || "" }));
      });
    }
  }, [user]);

  // Live recalculation
  useEffect(() => {
    if (!form.event_type || !form.lodging_tier || !form.room_type || !form.pax) return;
    const handler = setTimeout(() => {
      api.post("/quotes/calculate", { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null })
        .then((r) => setEstimate(r.data))
        .catch(() => setEstimate(null));
    }, 250);
    return () => clearTimeout(handler);
  }, [form]);

  if (!config) return <div className="p-12 text-center text-slate-500">Cargando catálogo...</div>;

  const ev = config.events.find((e) => e.id === form.event_type);
  const tier = config.lodging_tiers.find((t) => t.id === form.lodging_tier);
  const roomAvail = tier?.rates?.[form.room_type] > 0;

  const toggleRoute = (id) => {
    const set = new Set(form.transport_routes);
    set.has(id) ? set.delete(id) : set.add(id);
    setForm({ ...form, transport_routes: Array.from(set) });
  };
  const toggleTour = (id) => {
    const set = new Set(form.tour_ids);
    set.has(id) ? set.delete(id) : set.add(id);
    setForm({ ...form, tour_ids: Array.from(set) });
  };

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión como director técnico"); nav("/login"); return; }
    if (user.role !== "team" && user.role !== "admin") { toast.error("Solo los DT pueden cotizar"); return; }
    if (!roomAvail) { toast.error(`El tier ${tier?.name} no ofrece esa habitación`); return; }
    setSubmitting(true);
    try {
      await api.post("/quotes", { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null });
      toast.success("Cotización enviada. El admin la revisará.");
      nav("/mis-cotizaciones");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="cotizar-page">
      <Toaster position="top-right" />
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-600">Armar paquete</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Cotiza tu evento</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">5 noches / 6 días. Calcula en vivo el costo total por jugadores y acompañantes según el plan que elijas.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Evento */}
          <Section icon={Trophy} title="1) Evento" testId="block-event" subtitle="Selecciona en qué evento participará tu equipo">
            <div className="grid sm:grid-cols-3 gap-3">
              {config.events.map((e) => (
                <button key={e.id} type="button" onClick={() => setForm({ ...form, event_type: e.id, birth_year: "" })} className={`text-left p-4 rounded-xl border-2 ${form.event_type === e.id ? "border-red-600 bg-red-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`event-${e.id}`}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Evento</div>
                  <div className="font-display text-xl font-black uppercase tracking-tight">{e.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{e.dates}</div>
                </button>
              ))}
            </div>
            {ev && (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Año de nacimiento del equipo</span>
                  <select value={form.birth_year || ""} onChange={(e) => setForm({ ...form, birth_year: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-year">
                    <option value="">— (sin inscripción)</option>
                    {ev.birth_years.map((y) => <option key={y} value={y}>{y} — {fmt(ev.fees_by_year[String(y)] || 0)}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={form.include_registration} onChange={(e) => setForm({ ...form, include_registration: e.target.checked })} className="h-4 w-4 accent-red-600" data-testid="cotizar-include-reg" />
                  <span className="text-sm">Incluir inscripción del equipo en el total</span>
                </label>
              </div>
            )}
          </Section>

          {/* 2. Hospedaje */}
          <Section icon={Hotel} title="2) Alojamiento" testId="block-lodging" subtitle="6 niveles disponibles · precios POR PERSONA por 5 noches">
            <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {config.lodging_tiers.map((t) => (
                <button key={t.id} type="button" onClick={() => setForm({ ...form, lodging_tier: t.id })} className={`p-3 rounded-xl border-2 text-left ${form.lodging_tier === t.id ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`tier-${t.id}`}>
                  <div className="font-display text-sm font-black uppercase tracking-tight">{t.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">desde {fmt(Math.min(...Object.values(t.rates).filter(Boolean)))}</div>
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Habitación</span>
                <select value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-room">
                  {ROOM_TYPES.map((r) => {
                    const avail = tier?.rates?.[r.id] > 0;
                    return <option key={r.id} value={r.id} disabled={!avail}>{r.label}{!avail ? " — no disponible" : ` — ${fmt(tier?.rates?.[r.id] || 0)}`}</option>;
                  })}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Personas (pax)</span>
                <input type="number" min="1" value={form.pax} onChange={(e) => setForm({ ...form, pax: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-pax" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noches</span>
                <input type="number" min="1" value={form.nights} onChange={(e) => setForm({ ...form, nights: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-nights" />
              </label>
            </div>
            {!roomAvail && <p className="mt-2 text-xs text-red-600 font-bold">⚠ La habitación seleccionada no está disponible en este tier.</p>}
          </Section>

          {/* 3. Alimentación */}
          <Section icon={Utensils} title="3) Alimentación" testId="block-meals" subtitle="Planes por persona × día — varían según el tier de hospedaje">
            <div className="grid sm:grid-cols-2 gap-3">
              {config.meal_plans.map((m) => {
                const price = m.per_day_by_tier[form.lodging_tier] || 0;
                const key = `includes_${m.id}`;
                return (
                  <label key={m.id} className={`cursor-pointer border-2 rounded-xl p-4 ${form[key] ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`meal-${m.id}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                      <span className="font-display text-lg font-black uppercase tracking-tight">{m.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{fmt(price)} / persona / día</div>
                  </label>
                );
              })}
            </div>
            <label className="block mt-3 max-w-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días con alimentación</span>
              <input type="number" min="1" value={form.meal_days ?? form.days} onChange={(e) => setForm({ ...form, meal_days: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-meal-days" />
            </label>
          </Section>

          {/* 4. Transporte */}
          <Section icon={Bus} title="4) Transporte" testId="block-transport" subtitle="Rutas por persona — múltiple selección">
            <div className="grid sm:grid-cols-2 gap-3">
              {config.transport_routes.map((r) => (
                <label key={r.id} className={`cursor-pointer border-2 rounded-xl p-4 ${form.transport_routes.includes(r.id) ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`transport-${r.id}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.transport_routes.includes(r.id)} onChange={() => toggleRoute(r.id)} className="h-4 w-4 accent-blue-700" />
                    <span className="font-bold">{r.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{r.price > 0 ? `${fmt(r.price)} / persona` : "Incluido"}</div>
                </label>
              ))}
            </div>
          </Section>

          {/* 5. Tours */}
          <Section icon={Map} title="5) Tours y actividades" testId="block-tours" subtitle="Excursiones turísticas por persona">
            <div className="grid sm:grid-cols-2 gap-3">
              {config.tours_catalog.map((t) => (
                <label key={t.id} className={`cursor-pointer border-2 rounded-xl p-4 ${form.tour_ids.includes(t.id) ? "border-orange-600 bg-orange-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`tour-${t.id}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.tour_ids.includes(t.id)} onChange={() => toggleTour(t.id)} className="h-4 w-4 accent-orange-600" />
                    <span className="font-bold">{t.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{fmt(t.price)} / persona</div>
                </label>
              ))}
            </div>
          </Section>

          {/* 6. Contacto */}
          <Section icon={BadgeCheck} title="6) Contacto y notas" testId="block-contact" subtitle="Información adicional para coordinar tu paquete">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono de contacto</span>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-phone" />
              </label>
            </div>
            <label className="block mt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas adicionales</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-notes" />
            </label>
          </Section>
        </div>

        {/* Sticky summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 bg-slate-900 text-white rounded-2xl p-6 fsc-stripe-blue">
            <div className="text-xs uppercase tracking-[0.25em] text-blue-200">Resumen en vivo</div>
            <div className="font-display text-2xl font-black uppercase tracking-tight">Tu paquete</div>
            {!estimate && <p className="mt-4 text-sm text-slate-300">Completa los bloques para ver el total.</p>}
            {estimate && (
              <div className="mt-4 space-y-2 text-sm" data-testid="cotizar-summary">
                <Row k="Evento" v={estimate.event_name} />
                <Row k="Hospedaje" v={`${estimate.lodging_name} · ${form.room_type}`} />
                <Row k={`Tarifa/pax (5n)`} v={fmt(estimate.rate_per_person_5nights)} />
                <Row k={`Hospedaje (${estimate.pax}×${estimate.nights}n)`} v={fmt(estimate.lodging_subtotal)} />
                {estimate.breakfast_subtotal > 0 && <Row k="Desayunos" v={fmt(estimate.breakfast_subtotal)} />}
                {estimate.lunch_subtotal > 0 && <Row k="Almuerzos" v={fmt(estimate.lunch_subtotal)} />}
                {estimate.transport_subtotal > 0 && <Row k={`Transporte (${estimate.transport_routes_applied?.length || 0} rutas)`} v={fmt(estimate.transport_subtotal)} />}
                {estimate.tours_subtotal > 0 && <Row k={`Tours (${estimate.tour_ids_applied?.length || 0})`} v={fmt(estimate.tours_subtotal)} />}
                {estimate.registration_fee > 0 && <Row k="Inscripción" v={fmt(estimate.registration_fee)} />}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-slate-300">Total</span>
                    <span className="font-display text-3xl font-black text-red-400 tabular-nums">{fmt(estimate.total_amount)}<span className="text-xs text-slate-400 font-bold ml-1">COP</span></span>
                  </div>
                </div>
              </div>
            )}
            <button onClick={submit} disabled={submitting || !estimate} className="mt-5 fsc-btn-red w-full py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50" data-testid="cotizar-submit">
              {submitting ? "Enviando..." : (<>Enviar cotización <ArrowRight size={16}/></>)}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, testId, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6" data-testid={testId}>
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
          <Icon size={18}/>
        </div>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{k}</span>
      <span className="font-semibold text-right tabular-nums">{v}</span>
    </div>
  );
}
