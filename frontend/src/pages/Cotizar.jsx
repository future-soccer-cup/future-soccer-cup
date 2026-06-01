import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Trophy, Hotel, Utensils, Bus, Map, BadgeCheck, ArrowRight, Lock, Clock, CheckCircle2, Plus, X } from "lucide-react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Cotizar() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");
  const [config, setConfig] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [tournaments, setTournaments] = useState([]); // eventos activos del Admin (no archivados)
  const [form, setForm] = useState({
    // Evento clásico (legacy, requerido por backend para fallback de precios)
    event_type: "festival",
    birth_year: "",
    // Nuevo flujo dinámico:
    tournament_id: "",
    tournament_name: "",
    categories: [], // [{name, fee}] — categorías inscritas seleccionadas
    lodging_tier: "",
    pax: 0,
    nights: 5,
    days: 6,
    includes_breakfast: false,
    includes_lunch: false,
    includes_dinner: false,
    meal_entries: [],
    extra_pax_entries: [], // PAX adicionales con sus propias noches (acompañantes)
    transport_routes: [],
    transport_entries: [], // {route_id, pax, date}
    tour_entries: [],
    tour_ids: [],
    include_registration: true,
    contact_phone: "",
    notes: "",
  });
  const [estimate, setEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Solo dispara cálculo en vivo cuando el usuario interactúa con el form (resumen arranca en $0).
  const [userTouched, setUserTouched] = useState(false);

  useEffect(() => { api.get("/event-types").then((r) => setConfig(r.data)); }, []);
  // Cargar tournaments activos (no archivados) — son los eventos que el Admin creó
  useEffect(() => {
    api.get("/tournaments").then((r) => {
      const list = (r.data || []).filter((t) => !t.archived);
      setTournaments(list);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (user?.team_id) {
      api.get(`/teams/${user.team_id}`).then((r) => {
        setMyTeam(r.data);
        setForm((f) => ({ ...f, event_type: r.data.event_type || f.event_type, birth_year: r.data.birth_year || "" }));
      });
    }
  }, [user]);

  // Cargar cotización existente si viene ?id=
  useEffect(() => {
    if (!editingId) return;
    api.get(`/quotes/${editingId}`).then((r) => {
      const q = r.data || {};
      setForm((f) => ({
        ...f,
        event_type: q.event_type ?? f.event_type,
        birth_year: q.birth_year ?? f.birth_year,
        lodging_tier: q.lodging_tier ?? f.lodging_tier,
        pax: q.pax ?? f.pax,
        nights: q.nights ?? f.nights,
        days: q.days ?? f.days,
        includes_breakfast: !!q.includes_breakfast,
        includes_lunch: !!q.includes_lunch,
        includes_dinner: !!q.includes_dinner,
        meal_entries: q.meal_entries || [],
        extra_pax_entries: q.extra_pax_entries || [],
        transport_routes: q.transport_routes || [],
        transport_entries: q.transport_entries || [],
        tour_entries: q.tour_entries || [],
        tour_ids: q.tour_ids || [],
        include_registration: q.include_registration !== false,
        contact_phone: q.contact_phone || "",
        notes: q.notes || "",
      }));
    }).catch(() => toast.error("No se pudo cargar la cotización"));
  }, [editingId]);

  // Live recalculation (solo después que el usuario interactúa con el form)
  useEffect(() => {
    if (!userTouched && !editingId) return; // resumen arranca en $0
    if (!form.event_type || !form.lodging_tier || !form.pax) return;
    const handler = setTimeout(() => {
      api.post("/quotes/calculate", { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null })
        .then((r) => setEstimate(r.data))
        .catch(() => setEstimate(null));
    }, 250);
    return () => clearTimeout(handler);
  }, [form, userTouched, editingId]);

  // Wrapper para marcar interacción en cualquier cambio del usuario
  const setFormUser = (next) => {
    if (!userTouched) setUserTouched(true);
    setForm(typeof next === "function" ? next : next);
  };

  if (authLoading || !config) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  // === GATE: solo DTs aprobados o admins ===
  if (!user) return <CotizarGate variant="login" />;
  if (user.role === "admin") {
    // admin can preview
  } else if (user.role !== "team") {
    return <CotizarGate variant="role" />;
  } else if ((user.manager_role || "").trim().toLowerCase() === "cuerpo técnico") {
    return <CotizarGate variant="cuerpo-tecnico" />;
  } else if (myTeam && myTeam.status === "pendiente") {
    return <CotizarGate variant="pending" team={myTeam} />;
  } else if (myTeam && myTeam.status === "rechazado") {
    return <CotizarGate variant="rejected" team={myTeam} />;
  } else if (user.role === "team" && !myTeam) {
    return <CotizarGate variant="no-team" />;
  }

  const tier = config.lodging_tiers.find((t) => t.id === form.lodging_tier);
  const isDomicilio = form.lodging_tier === "domicilio";

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión como director técnico"); nav("/login"); return; }
    if (user.role !== "team" && user.role !== "admin") { toast.error("Solo los DT pueden cotizar"); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, birth_year: form.birth_year ? Number(form.birth_year) : null };
      if (editingId) {
        await api.put(`/quotes/${editingId}`, payload);
        toast.success("Cotización actualizada. Quedó pendiente de re-aprobación.");
      } else {
        await api.post("/quotes", payload);
        toast.success("Cotización enviada. El admin la revisará.");
      }
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
          <Section icon={Trophy} title="1) Evento" testId="block-event" subtitle="Selecciona el evento creado por el Admin al que vas a participar y marca las categorías inscritas">
            {tournaments.length === 0 && (
              <p className="text-sm text-slate-500 italic">No hay eventos activos disponibles. Contacta al administrador.</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="cotizar-events-list">
              {tournaments.map((t) => {
                const selected = form.tournament_id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormUser({
                      ...form,
                      tournament_id: t.id,
                      tournament_name: t.name,
                      event_type: t.event_type || "festival", // fallback para backend
                      categories: [],
                    })}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${selected ? "border-fsc-rojo bg-red-50" : "border-slate-200 hover:border-slate-400"}`}
                    data-testid={`tournament-${t.id}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fsc-azul">{t.event_type || "evento"}</div>
                    <div className="font-display text-xl font-black uppercase tracking-tight">{t.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {t.start_date} → {t.end_date}
                    </div>
                    {t.city && <div className="text-[10px] text-slate-500">{t.city}</div>}
                    {(t.categories?.length || 0) > 0 && (
                      <div className="text-[10px] text-slate-500 mt-2">{t.categories.length} categoría(s) disponibles</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Categorías inscritas — checkboxes múltiples */}
            {form.tournament_id && (() => {
              const sel = tournaments.find((t) => t.id === form.tournament_id);
              const cats = sel?.categories || [];
              if (cats.length === 0) {
                return (
                  <p className="mt-4 text-sm text-amber-600 italic" data-testid="no-categories-warn">
                    Este evento aún no tiene categorías configuradas por el Admin.
                  </p>
                );
              }
              const isChecked = (cat) => (form.categories || []).some((c) => c.name === cat.name);
              const toggle = (cat) => {
                const exists = isChecked(cat);
                const next = exists
                  ? form.categories.filter((c) => c.name !== cat.name)
                  : [...form.categories, { name: cat.name, fee: Number(cat.fee || 0) }];
                setFormUser({ ...form, categories: next });
              };
              return (
                <div className="mt-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Categorías</div>
                  <div className="grid sm:grid-cols-2 gap-2" data-testid="cotizar-categories">
                    {cats.map((c, i) => {
                      const checked = isChecked(c);
                      return (
                        <label
                          key={`${c.name}-${i}`}
                          className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${checked ? "border-fsc-azul bg-fsc-azul/10" : "border-slate-200 hover:border-slate-400"}`}
                          data-testid={`category-opt-${i}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(c)}
                            className="h-4 w-4 accent-fsc-azul"
                          />
                          <span className="flex-1">
                            <span className="font-bold uppercase tracking-wide">{c.name}</span>
                            <span className="block text-[11px] text-slate-500 tabular-nums">Inscripción: {fmt(c.fee || 0)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 mt-3 text-sm">
                    <input type="checkbox" checked={form.include_registration} onChange={(e) => setFormUser({ ...form, include_registration: e.target.checked })} className="h-4 w-4 accent-fsc-rojo" data-testid="cotizar-include-reg" />
                    <span>Incluir inscripción de las categorías seleccionadas en el total</span>
                  </label>
                </div>
              );
            })()}
          </Section>

          {/* 2. Paquete de hospedaje */}
          <Section icon={Hotel} title="2) Paquete de hospedaje" testId="block-lodging" subtitle="Precio POR PERSONA · base 5 noches/6 días + valor por noche adicional (la noche adicional incluye alimentación)">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.lodging_tiers.map((t) => {
                const selected = form.lodging_tier === t.id;
                const isDom = t.id === "domicilio";
                return (
                  <button key={t.id} type="button" onClick={() => setFormUser({ ...form, lodging_tier: t.id })} className={`text-left p-4 rounded-xl border-2 transition-colors ${selected ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={`tier-${t.id}`}>
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

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Personas (pax)</span>
                <input type="number" min="1" value={form.pax} onChange={(e) => setFormUser({ ...form, pax: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-pax" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noches</span>
                <input type="number" min="1" disabled={isDomicilio} value={form.nights} onChange={(e) => setFormUser({ ...form, nights: Number(e.target.value) || 1 })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="cotizar-nights" />
                <span className="text-[10px] text-slate-400">Base 5n incluye 5 desayunos · 4 almuerzos · 5 cenas. Cada noche adicional ya incluye alimentación.</span>
              </label>
            </div>

            {!isDomicilio && (
              <ExtraPaxEditor
                entries={form.extra_pax_entries || []}
                onChange={(entries) => setFormUser({ ...form, extra_pax_entries: entries })}
              />
            )}
          </Section>

          {/* 3. Alimentación */}
          <Section icon={Utensils} title="3) Alimentación adicional" testId="block-meals" subtitle="Para llegadas tempranas o días extra fuera de las comidas ya incluidas en el paquete.">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900" data-testid="meals-banner">
              <strong>Importante:</strong> el paquete ya incluye <strong>5 desayunos, 4 almuerzos y 5 cenas</strong>. Agrega aquí comidas adicionales con su fecha y cantidad de personas.
            </div>
            <DomicilioMealsEditor
              entries={form.meal_entries || []}
              mealPlans={config.meal_plans}
              tier={form.lodging_tier}
              onChange={(entries) => setFormUser({ ...form, meal_entries: entries })}
            />
          </Section>

          {/* 4. Transporte */}
          <Section icon={Bus} title="4) Transporte" testId="block-transport" subtitle="Agrega cada traslado indicando cantidad de personas y fecha.">
            <TransportEntriesEditor
              entries={form.transport_entries || []}
              routes={config.transport_routes}
              defaultPax={form.pax}
              onChange={(entries) => setFormUser({
                ...form,
                transport_entries: entries,
                transport_routes: Array.from(new Set(entries.map((e) => e.route_id))),
              })}
            />
          </Section>

          {/* 5. Tours */}
          <Section icon={Map} title="5) Tours y actividades" testId="block-tours" subtitle="Indica cuántas personas tomarán cada tour (puede ser solo parte del equipo).">
            <TourEntriesEditor
              entries={form.tour_entries || []}
              tours={config.tours_catalog}
              defaultPax={form.pax}
              onChange={(entries) => setFormUser({ ...form, tour_entries: entries, tour_ids: entries.map((e) => e.tour_id) })}
            />
          </Section>

          {/* 6. Contacto */}
          <Section icon={BadgeCheck} title="6) Contacto y notas" testId="block-contact" subtitle="Información adicional para coordinar tu paquete">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono de contacto</span>
                <input value={form.contact_phone} onChange={(e) => setFormUser({ ...form, contact_phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-phone" />
              </label>
            </div>
            <label className="block mt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas adicionales</span>
              <textarea value={form.notes} onChange={(e) => setFormUser({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="cotizar-notes" />
            </label>
          </Section>
        </div>

        {/* Sticky summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 bg-fsc-negro text-white rounded-2xl p-6 border-2 border-fsc-azul">
            <div className="text-xs uppercase tracking-[0.25em] text-white" data-testid="resumen-en-vivo-label">Resumen en vivo</div>
            <div className="font-display text-2xl tracking-wider text-white">Tu paquete</div>
            {(!form.pax || !form.lodging_tier) && (
              <div className="mt-3 text-[11px] text-fsc-gris italic bg-fsc-azul/15 border border-fsc-azul/30 rounded px-2 py-1.5" data-testid="cotizar-hint-empty">
                Selecciona un <strong>paquete de hospedaje</strong> e indica al menos <strong>1 persona</strong> para ver el total.
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm" data-testid="cotizar-summary">
              <Row k="Evento" v={estimate?.event_name || "—"} />
              <Row k="Paquete" v={estimate?.lodging_name || "—"} />
              {estimate?.rate_per_person_total > 0 && <Row k="Tarifa/pax" v={fmt(estimate.rate_per_person_total)} />}
              {estimate?.extra_nights > 0 && <Row k="Noches extra" v={`${estimate.extra_nights} × ${fmt(estimate.rate_per_person_additional_night || 0)}`} />}
              <Row k={`Hospedaje (${estimate?.pax || 0}×${estimate?.nights || 0}n)`} v={fmt(estimate?.lodging_subtotal || 0)} />
              {estimate?.free_lodging_units > 0 && (
                <div className="flex items-center justify-between bg-fsc-rojo/20 border border-fsc-rojo/40 rounded px-2 py-1 text-xs">
                  <span className="font-bold uppercase tracking-wider">🎉 Promo 21 gratis</span>
                  <span className="tabular-nums">{estimate.free_lodging_units} pax sin costo</span>
                </div>
              )}
              {estimate?.extra_pax_subtotal > 0 && <Row k="Adicionales" v={fmt(estimate.extra_pax_subtotal)} />}
              <Row k="Alimentación" v={fmt((estimate?.breakfast_subtotal || 0) + (estimate?.lunch_subtotal || 0) + (estimate?.dinner_subtotal || 0))} />
              <Row k="Transporte" v={fmt(estimate?.transport_subtotal || 0)} />
              <Row k="Tours" v={fmt(estimate?.tours_subtotal || 0)} />
              {estimate?.registration_fee > 0 && <Row k="Inscripción" v={fmt(estimate.registration_fee)} />}
              {(estimate?.registration_breakdown || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] text-fsc-gris pl-3">
                  <span>· {c.name}</span>
                  <span className="tabular-nums">{fmt(c.fee)}</span>
                </div>
              ))}
              <div className="border-t border-fsc-azul/30 pt-3 mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-white">Total</span>
                  <span className="font-display text-3xl tracking-wider text-white tabular-nums" data-testid="cotizar-total">{fmt(estimate?.total_amount || 0)}<span className="text-xs text-fsc-gris ml-1">COP</span></span>
                </div>
              </div>
            </div>
            <button onClick={submit} disabled={submitting || !estimate || (estimate?.total_amount || 0) === 0} className="mt-5 fsc-btn-red w-full py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50" data-testid="cotizar-submit">
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
            {(tours.find((t) => t.id === e.tour_id)?.description) && (
              <span className="block text-[10px] italic text-slate-600 mt-1" data-testid={`tour-desc-${idx}`}>
                {tours.find((t) => t.id === e.tour_id).description}
              </span>
            )}
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
    "cuerpo-tecnico": { icon: Lock, title: "Solo el Directivo puede cotizar", text: "Tu rol es Cuerpo Técnico. Las cotizaciones del club solo las puede generar el Directivo. Puedes seguir gestionando equipos, jugadores y cuerpo técnico desde Mi Club.", cta: { label: "Ir a Mi Club", to: "/mi-equipo" } },
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

function ExtraPaxEditor({ entries, onChange }) {
  const add = () => onChange([...entries, { label: "", pax: 1, nights: 5, start_date: "", end_date: "" }]);
  const update = (i, k, v) => {
    const next = [...entries];
    next[i] = { ...next[i], [k]: (k === "label" || k === "start_date" || k === "end_date") ? v : Number(v) || 0 };
    onChange(next);
  };
  const remove = (i) => onChange(entries.filter((_, j) => j !== i));
  return (
    <div className="mt-5 border-t-2 border-dashed border-slate-200 pt-4" data-testid="extra-pax-editor">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-fsc-azul-oscuro">Personas adicionales</div>
          <div className="text-[11px] text-slate-500">Acompañantes con noches/fechas distintas al grupo principal.</div>
        </div>
        <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wider text-fsc-negro border-2 border-fsc-azul bg-fsc-azul/10 hover:bg-fsc-azul/20 px-3 py-1.5 rounded" data-testid="extra-pax-add">+ Agregar</button>
      </div>
      {entries.length === 0 && (
        <div className="text-[11px] text-slate-400 italic">Aún no has agregado personas adicionales.</div>
      )}
      <div className="space-y-2">
        {entries.map((ep, i) => (
          <div key={i} className="grid sm:grid-cols-12 gap-2 items-end bg-slate-50 rounded-md p-3 border border-slate-200" data-testid={`extra-pax-row-${i}`}>
            <label className="sm:col-span-4 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Etiqueta</span>
              <input value={ep.label || ""} onChange={(e) => update(i, "label", e.target.value)} placeholder="Padres, fisio..." className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
            </label>
            <label className="sm:col-span-2 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cantidad</span>
              <input type="number" min="1" value={ep.pax} onChange={(e) => update(i, "pax", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
            </label>
            <label className="sm:col-span-2 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Noches</span>
              <input type="number" min="1" value={ep.nights} onChange={(e) => update(i, "nights", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
            </label>
            <label className="sm:col-span-2 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Desde</span>
              <input type="date" value={ep.start_date || ""} onChange={(e) => update(i, "start_date", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
            </label>
            <label className="sm:col-span-1 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hasta</span>
              <input type="date" value={ep.end_date || ""} onChange={(e) => update(i, "end_date", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
            </label>
            <button type="button" onClick={() => remove(i)} className="sm:col-span-1 text-fsc-rojo text-xs font-bold uppercase tracking-wider py-1.5" data-testid={`extra-pax-remove-${i}`}>Quitar</button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ----- Transport entries editor (route + qty + date) -----
function TransportEntriesEditor({ entries, routes, defaultPax, onChange }) {
  const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
  const add = () => {
    if (routes.length === 0) return;
    onChange([...entries, { route_id: routes[0].id, pax: defaultPax || 1, date: "" }]);
  };
  const update = (idx, patch) => onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx) => onChange(entries.filter((_, i) => i !== idx));
  const priceOf = (rid) => routes.find((r) => r.id === rid)?.price || 0;
  return (
    <div className="space-y-2" data-testid="transport-entries">
      {entries.length === 0 && <p className="text-xs italic text-slate-400">Sin transportes agregados. Pulsa "Agregar transporte".</p>}
      {entries.map((e, idx) => (
        <div key={`${e.route_id}-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-blue-50 border border-blue-200 rounded-md p-2" data-testid={`transport-row-${idx}`}>
          <label className="col-span-5 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ruta</span>
            <select value={e.route_id} onChange={(ev) => update(idx, { route_id: ev.target.value })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs bg-white">
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span className="text-[10px] text-slate-500">{priceOf(e.route_id) > 0 ? `${fmtMoney(priceOf(e.route_id))} / persona` : "Incluido"}</span>
          </label>
          <label className="col-span-2 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cantidad</span>
            <input type="number" min="1" value={e.pax} onChange={(ev) => update(idx, { pax: Number(ev.target.value) || 1 })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs tabular-nums" data-testid={`transport-pax-${idx}`} />
          </label>
          <label className="col-span-3 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha</span>
            <input type="date" value={e.date || ""} onChange={(ev) => update(idx, { date: ev.target.value })} className="w-full mt-1 px-2 py-1 border border-slate-200 rounded text-xs" />
          </label>
          <div className="col-span-1 text-right text-xs font-bold tabular-nums text-blue-700 pb-1">{fmtMoney(priceOf(e.route_id) * (e.pax || 0))}</div>
          <button type="button" onClick={() => remove(idx)} className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded justify-self-end" aria-label="Quitar"><X size={14}/></button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wide text-fsc-azul-oscuro hover:underline flex items-center gap-1" data-testid="transport-add">
        <Plus size={12}/> Agregar transporte
      </button>
    </div>
  );
}

