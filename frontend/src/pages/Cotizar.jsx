import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Trophy, Hotel, Utensils, Bus, Map, BadgeCheck, ArrowRight, Lock, Clock, CheckCircle2, Plus, X } from "lucide-react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Cotizar() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [config, setConfig] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [form, setForm] = useState({
    event_type: "",
    birth_year: "",
    lodging_tier: "gold",
    pax: 20,
    nights: 5,
    days: 6,
    includes_breakfast: false,
    includes_lunch: false,
    includes_dinner: false,
    meal_days: null,
    meal_entries: [],
    transport_routes: [],
    tour_entries: [],
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
    if (!form.event_type || !form.lodging_tier || !form.pax) return;
    const handler = setTimeout(() => {
      api.post("/quotes/calculate", { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null })
        .then((r) => setEstimate(r.data))
        .catch(() => setEstimate(null));
    }, 250);
    return () => clearTimeout(handler);
  }, [form]);

  if (authLoading || !config) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  // === GATE: solo DTs aprobados o admins ===
  if (!user) return <CotizarGate variant="login" />;
  if (user.role === "admin") {
    // admin can preview
  } else if (user.role !== "team") {
    return <CotizarGate variant="role" />;
  } else if (myTeam && myTeam.status === "pendiente") {
    return <CotizarGate variant="pending" team={myTeam} />;
  } else if (myTeam && myTeam.status === "rechazado") {
    return <CotizarGate variant="rejected" team={myTeam} />;
  } else if (user.role === "team" && !myTeam) {
    return <CotizarGate variant="no-team" />;
  }

  const ev = config.events.find((e) => e.id === form.event_type);
  const tier = config.lodging_tiers.find((t) => t.id === form.lodging_tier);
  const isDomicilio = form.lodging_tier === "domicilio";

  const toggleRoute = (id) => {
    const set = new Set(form.transport_routes);
    if (set.has(id)) set.delete(id); else set.add(id);
    setForm({ ...form, transport_routes: Array.from(set) });
  };

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión como director técnico"); nav("/login"); return; }
    if (user.role !== "team" && user.role !== "admin") { toast.error("Solo los DT pueden cotizar"); return; }
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
        <p className="text-sm text-slate-500 mt-2 max-w-xl">Paquete base de 5 noches / 6 días. Personaliza alimentación, transporte y tours. Total en vivo.</p>
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

          {/* 2. Paquete de hospedaje */}
          <Section icon={Hotel} title="2) Paquete de hospedaje" testId="block-lodging" subtitle="Precio POR PERSONA · base 5 noches/6 días + valor por noche adicional (la noche adicional incluye alimentación)">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.lodging_tiers.map((t) => {
                const selected = form.lodging_tier === t.id;
                const isDom = t.id === "domicilio";
                return (
                  <button key={t.id} type="button" onClick={() => setForm({ ...form, lodging_tier: t.id })} className={`text-left p-4 rounded-xl border-2 transition-colors ${selected ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`tier-${t.id}`}>
                    <div className="font-display text-2xl font-black uppercase tracking-tight">{t.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.description}</div>
                    {!isDom ? (
                      <>
                        <div className="mt-3 text-xs">
                          <span className="text-slate-500">5 noches:</span>{" "}
                          <span className="font-bold tabular-nums">{fmt(t.base_5_nights)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Noche adicional: <span className="font-bold tabular-nums">{fmt(t.additional_night)}</span></div>
                      </>
                    ) : (
                      <div className="mt-3 text-[11px] italic text-slate-500">Sin hospedaje (alojamiento propio). Solo alimentación si la añades.</div>
                    )}
                  </button>
                );
              })}
            </div>

            {tier?.includes?.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4" data-testid="tier-includes">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 mb-2">Incluye en {tier.name}</div>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                  {tier.includes.map((it, i) => (
                    <li key={`${tier.id}-inc-${i}`} className="flex items-start gap-1.5"><CheckCircle2 size={12} className="text-blue-600 mt-0.5 shrink-0"/> {it}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Personas (pax)</span>
                <input type="number" min="1" value={form.pax} onChange={(e) => setForm({ ...form, pax: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-pax" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noches</span>
                <input type="number" min="1" disabled={isDomicilio} value={form.nights} onChange={(e) => setForm({ ...form, nights: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="cotizar-nights" />
                <span className="text-[10px] text-slate-400">Base 5n incluye 5 desayunos · 4 almuerzos · 5 cenas. Cada noche adicional ya incluye alimentación.</span>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días para comidas adicionales</span>
                <input type="number" min="0" disabled={isDomicilio} value={form.meal_days ?? form.days} onChange={(e) => setForm({ ...form, meal_days: Number(e.target.value) || 0 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="cotizar-meal-days" />
              </label>
            </div>
          </Section>

          {/* 3. Alimentación */}
          <Section icon={Utensils} title="3) Alimentación adicional" testId="block-meals" subtitle="Para llegadas tempranas o días extra fuera de las comidas ya incluidas en el paquete.">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900" data-testid="meals-banner">
              <strong>Importante:</strong> el paquete ya incluye <strong>5 desayunos, 4 almuerzos y 5 cenas</strong>. Si el equipo llega antes del registro al hotel o necesita más comidas en días extra, agrégalas aquí (precio por persona × día, según paquete).
            </div>
            {!isDomicilio ? (
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                {config.meal_plans.map((m) => {
                  const price = m.per_day_by_tier[form.lodging_tier] || 0;
                  const key = `includes_${m.id}`;
                  const available = price > 0;
                  return (
                    <label key={m.id} className={`border-2 rounded-xl p-4 ${!available ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer"} ${form[key] && available ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`meal-${m.id}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={form[key] && available} disabled={!available} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                        <span className="font-display text-lg font-black uppercase tracking-tight">{m.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {available ? `${fmt(price)} / persona / día` : <span className="italic">No disponible en este paquete</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <DomicilioMealsEditor
                entries={form.meal_entries || []}
                mealPlans={config.meal_plans}
                tier={form.lodging_tier}
                onChange={(entries) => setForm({ ...form, meal_entries: entries })}
              />
            )}
          </Section>

          {/* 4. Transporte */}
          <Section icon={Bus} title="4) Transporte" testId="block-transport" subtitle="Rutas por persona — selección múltiple">
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
          <Section icon={Map} title="5) Tours y actividades" testId="block-tours" subtitle="Indica cuántas personas tomarán cada tour (puede ser solo parte del equipo).">
            <TourEntriesEditor
              entries={form.tour_entries || []}
              tours={config.tours_catalog}
              defaultPax={form.pax}
              onChange={(entries) => setForm({ ...form, tour_entries: entries, tour_ids: entries.map((e) => e.tour_id) })}
            />
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
                <Row k="Paquete" v={estimate.lodging_name} />
                {estimate.rate_per_person_total > 0 && <Row k="Tarifa/pax" v={fmt(estimate.rate_per_person_total)} />}
                {estimate.extra_nights > 0 && <Row k="Noches extra" v={`${estimate.extra_nights} × ${fmt(estimate.rate_per_person_additional_night)}`} />}
                {estimate.lodging_subtotal > 0 && <Row k={`Hospedaje (${estimate.pax}×${estimate.nights}n)`} v={fmt(estimate.lodging_subtotal)} />}
                {estimate.breakfast_subtotal > 0 && <Row k="Desayunos" v={fmt(estimate.breakfast_subtotal)} />}
                {estimate.lunch_subtotal > 0 && <Row k="Almuerzos" v={fmt(estimate.lunch_subtotal)} />}
                {estimate.dinner_subtotal > 0 && <Row k="Cenas" v={fmt(estimate.dinner_subtotal)} />}
                {estimate.transport_subtotal > 0 && <Row k={`Transporte (${estimate.transport_routes_applied?.length || 0} rutas)`} v={fmt(estimate.transport_subtotal)} />}
                {estimate.tours_subtotal > 0 && <Row k={`Tours (${estimate.tour_ids_applied?.length || 0})`} v={fmt(estimate.tours_subtotal)} />}
                {estimate.registration_fee > 0 && <Row k="Inscripción" v={fmt(estimate.registration_fee)} />}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-slate-300">Total</span>
                    <span className="font-display text-3xl font-black text-red-400 tabular-nums" data-testid="cotizar-total">{fmt(estimate.total_amount)}<span className="text-xs text-slate-400 font-bold ml-1">COP</span></span>
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


// ----- Domicilio meal entries editor (date + meal_type + pax) -----
function DomicilioMealsEditor({ entries, mealPlans, tier, onChange }) {
  const add = () => onChange([...entries, { _uid: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), meal_type: "breakfast", pax: 1 }]);
  const update = (idx, patch) => onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx) => onChange(entries.filter((_, i) => i !== idx));
  const priceOf = (mt) => (mealPlans.find((m) => m.id === mt)?.per_day_by_tier?.[tier] || 0);

  return (
    <div className="mt-3 space-y-3" data-testid="domicilio-meals">
      <p className="text-xs text-slate-500">Agrega una fila por cada comida que necesite el equipo (fecha + tipo + número de personas).</p>
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-xs italic text-slate-400">Sin comidas agregadas aún.</p>}
        {entries.map((e, idx) => (
          <div key={e._uid || `meal-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-slate-50 border border-slate-200 rounded-md p-2" data-testid={`domicilio-meal-row-${idx}`}>
            <label className="col-span-4 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha</span>
              <input type="date" value={e.date} onChange={(ev) => update(idx, { date: ev.target.value })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs" />
            </label>
            <label className="col-span-3 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Comida</span>
              <select value={e.meal_type} onChange={(ev) => update(idx, { meal_type: ev.target.value })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs bg-white">
                {mealPlans.map((m) => <option key={m.id} value={m.id} disabled={priceOf(m.id) <= 0}>{m.name}{priceOf(m.id) <= 0 ? " (N/A)" : ""}</option>)}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Personas</span>
              <input type="number" min="1" value={e.pax} onChange={(ev) => update(idx, { pax: Number(ev.target.value) || 1 })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs tabular-nums" />
            </label>
            <div className="col-span-2 text-right text-xs font-bold tabular-nums text-emerald-700 pb-1">{`$${(priceOf(e.meal_type) * (e.pax || 0)).toLocaleString("es-CO")}`}</div>
            <button type="button" onClick={() => remove(idx)} className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded justify-self-end" aria-label="Quitar"><X size={14}/></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:underline flex items-center gap-1" data-testid="domicilio-add-meal"><Plus size={12}/> Agregar comida</button>
    </div>
  );
}

// ----- Tour entries editor (tour_id + pax) -----
function TourEntriesEditor({ entries, tours, defaultPax, onChange }) {
  const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
  const used = new Set(entries.map((e) => e.tour_id));
  const available = tours.filter((t) => !used.has(t.id));
  const add = () => {
    const next = available[0];
    if (!next) return;
    onChange([...entries, { tour_id: next.id, pax: defaultPax || 1 }]);
  };
  const update = (idx, patch) => onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx) => onChange(entries.filter((_, i) => i !== idx));
  const priceOf = (tid) => tours.find((t) => t.id === tid)?.price || 0;

  return (
    <div className="space-y-2" data-testid="tour-entries">
      {entries.length === 0 && <p className="text-xs italic text-slate-400">Aún no agregaste tours. Pulsa "Agregar tour" para incluir uno.</p>}
      {entries.map((e, idx) => (
        <div key={`${e.tour_id}-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-orange-50 border border-orange-200 rounded-md p-2" data-testid={`tour-row-${idx}`}>
          <label className="col-span-5 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tour</span>
            <select value={e.tour_id} onChange={(ev) => update(idx, { tour_id: ev.target.value })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs bg-white">
              <option value={e.tour_id}>{tours.find((t) => t.id === e.tour_id)?.name || e.tour_id}</option>
              {available.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <span className="text-[10px] text-slate-500">{fmtMoney(priceOf(e.tour_id))} / persona</span>
          </label>
          <label className="col-span-3 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Personas</span>
            <input type="number" min="1" value={e.pax} onChange={(ev) => update(idx, { pax: Number(ev.target.value) || 1 })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs tabular-nums" data-testid={`tour-pax-${idx}`} />
          </label>
          <div className="col-span-3 text-right text-xs font-bold tabular-nums text-orange-700 pb-1">{fmtMoney(priceOf(e.tour_id) * (e.pax || 0))}</div>
          <button type="button" onClick={() => remove(idx)} className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded justify-self-end" aria-label="Quitar"><X size={14}/></button>
        </div>
      ))}
      {available.length > 0 && (
        <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wide text-orange-700 hover:underline flex items-center gap-1" data-testid="add-tour"><Plus size={12}/> Agregar tour</button>
      )}
    </div>
  );
}

// ----- Public gate: only approved DTs see /cotizar -----
function CotizarGate({ variant, team }) {
  const M = {
    login: { icon: Lock, title: "Acceso restringido", text: "Las cotizaciones son exclusivas para directores técnicos registrados y aprobados por la organización.", cta: { label: "Iniciar sesión / Registrar equipo", to: "/login" } },
    pending: { icon: Clock, title: "Tu equipo está en revisión", text: `El equipo "${team?.name}" está pendiente de aprobación por el organizador. Apenas se apruebe podrás generar cotizaciones aquí.`, cta: { label: "Volver a Mi Equipo", to: "/mi-equipo" } },
    rejected: { icon: Lock, title: "Equipo rechazado", text: "Tu equipo fue rechazado por el organizador. Contacta a Future Soccer Cup para más información.", cta: { label: "Ir al inicio", to: "/" } },
    "no-team": { icon: Lock, title: "Aún no tienes equipo", text: "Debes registrar un equipo para poder generar cotizaciones.", cta: { label: "Registrar equipo", to: "/registrar-equipo" } },
    role: { icon: Lock, title: "Función exclusiva para DTs", text: "Esta sección solo está disponible para directores técnicos.", cta: { label: "Volver al inicio", to: "/" } },
  };
  const cfg = M[variant] || M.login;
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center" data-testid={`cotizar-gate-${variant}`}>
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-900 text-white mb-6">
        <cfg.icon size={36} />
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter">{cfg.title}</h1>
      <p className="text-slate-600 mt-3">{cfg.text}</p>
      <Link to={cfg.cta.to} className="inline-block mt-6 fsc-btn-primary px-6 py-3 rounded-md text-sm">{cfg.cta.label}</Link>
    </div>
  );
}
