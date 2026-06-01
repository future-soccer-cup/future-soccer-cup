import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Trophy, Hotel, Utensils, Bus, Map, BadgeCheck, ArrowRight, Lock, Clock, Plus, X, Trash2 } from "lucide-react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Cotizar() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");
  const [config, setConfig] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [tournaments, setTournaments] = useState([]); // eventos activos del Admin
  const [form, setForm] = useState({
    // === Nuevo modelo: arrays ===
    events: [],   // [{tournament_id, tournament_name, event_type, categories: [{name, fee}]}]
    lodgings: [], // [{tier_id, pax, nights, extra_pax_entries: [{label,pax,nights,date_from,date_to}]}]
    // Globales:
    include_registration: true,
    includes_breakfast: false,
    includes_lunch: false,
    includes_dinner: false,
    meal_entries: [],
    transport_routes: [],
    transport_entries: [],
    tour_entries: [],
    tour_ids: [],
    contact_phone: "",
    notes: "",
  });
  const [estimate, setEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userTouched, setUserTouched] = useState(false);

  useEffect(() => { api.get("/event-types").then((r) => setConfig(r.data)); }, []);
  useEffect(() => {
    api.get("/tournaments").then((r) => {
      const list = (r.data || []).filter((t) => !t.archived);
      setTournaments(list);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (user?.team_id) {
      api.get(`/teams/${user.team_id}`).then((r) => setMyTeam(r.data));
    }
  }, [user]);

  // Cargar cotización existente si viene ?id=
  useEffect(() => {
    if (!editingId) return;
    api.get(`/quotes/${editingId}`).then((r) => {
      const q = r.data || {};
      // Migración: si la cotización vieja tiene scalars (lodging_tier, tournament_id), los promovemos a arrays.
      let lodgings = Array.isArray(q.lodgings) && q.lodgings.length > 0 ? q.lodgings : [];
      if (lodgings.length === 0 && q.lodging_tier) {
        lodgings = [{
          tier_id: q.lodging_tier,
          pax: q.pax || 1,
          nights: q.nights || 5,
          extra_pax_entries: q.extra_pax_entries || [],
        }];
      }
      let events = Array.isArray(q.events) && q.events.length > 0 ? q.events : [];
      if (events.length === 0 && (q.tournament_id || (q.categories || []).length > 0)) {
        events = [{
          tournament_id: q.tournament_id || "",
          tournament_name: q.tournament_name || "",
          event_type: q.event_type || "",
          categories: q.categories || [],
        }];
      }
      setForm((f) => ({
        ...f,
        events,
        lodgings,
        include_registration: q.include_registration !== false,
        meal_entries: q.meal_entries || [],
        transport_routes: q.transport_routes || [],
        transport_entries: q.transport_entries || [],
        tour_entries: q.tour_entries || [],
        tour_ids: q.tour_ids || [],
        contact_phone: q.contact_phone || "",
        notes: q.notes || "",
      }));
    }).catch(() => toast.error("No se pudo cargar la cotización"));
  }, [editingId]);

  // Live recalculation
  useEffect(() => {
    if (!userTouched && !editingId) return;
    const hasLodging = (form.lodgings || []).some((l) => l.tier_id && (l.pax || 0) > 0);
    const hasEvent = (form.events || []).length > 0;
    if (!hasLodging && !hasEvent) return;
    const handler = setTimeout(() => {
      api.post("/quotes/calculate", form)
        .then((r) => setEstimate(r.data))
        .catch(() => setEstimate(null));
    }, 250);
    return () => clearTimeout(handler);
  }, [form, userTouched, editingId]);

  const setFormUser = (next) => {
    if (!userTouched) setUserTouched(true);
    setForm(typeof next === "function" ? next : next);
  };

  if (authLoading || !config) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  if (!user) return <CotizarGate variant="login" />;
  if (user.role === "admin") {
    // admin puede ver
  } else if (user.role !== "team") {
    return <CotizarGate variant="role" />;
  } else if ((user.manager_role || "").trim().toLowerCase() === "cuerpo técnico") {
    return <CotizarGate variant="cuerpo-tecnico" />;
  } else if (myTeam && myTeam.status === "pendiente") {
    return <CotizarGate variant="pending" team={myTeam} />;
  } else if (myTeam && myTeam.status === "rechazado") {
    return <CotizarGate variant="rejected" team={myTeam} />;
  }

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión como Directivo"); nav("/login"); return; }
    if ((form.lodgings || []).length === 0 && (form.events || []).length === 0) {
      toast.error("Agrega al menos un evento o un paquete de hospedaje");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/quotes/${editingId}`, form);
        toast.success("Cotización actualizada. Quedó pendiente de re-aprobación.");
      } else {
        await api.post("/quotes", form);
        toast.success("Cotización enviada. El admin la revisará.");
      }
      nav("/mis-cotizaciones");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Helpers de eventos ======
  const toggleEvent = (t) => {
    const exists = form.events.find((e) => e.tournament_id === t.id);
    const next = exists
      ? form.events.filter((e) => e.tournament_id !== t.id)
      : [...form.events, { tournament_id: t.id, tournament_name: t.name, event_type: t.event_type || "festival", categories: [] }];
    setFormUser({ ...form, events: next });
  };
  const toggleEventCategory = (tournamentId, cat) => {
    const next = form.events.map((e) => {
      if (e.tournament_id !== tournamentId) return e;
      const has = (e.categories || []).some((c) => c.name === cat.name);
      const cats = has
        ? e.categories.filter((c) => c.name !== cat.name)
        : [...(e.categories || []), { name: cat.name, fee: Number(cat.fee || 0) }];
      return { ...e, categories: cats };
    });
    setFormUser({ ...form, events: next });
  };

  // ====== Helpers de hospedajes ======
  const addLodging = () => {
    const tiers = config.lodging_tiers || [];
    const used = new Set(form.lodgings.map((l) => l.tier_id));
    const next = tiers.find((t) => !used.has(t.id)) || tiers[0];
    if (!next) { toast.error("No hay paquetes disponibles. El admin debe configurarlos."); return; }
    setFormUser({
      ...form,
      lodgings: [...form.lodgings, { tier_id: next.id, pax: 1, nights: 5, extra_pax_entries: [] }],
    });
  };
  const updateLodging = (idx, patch) => {
    setFormUser({
      ...form,
      lodgings: form.lodgings.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    });
  };
  const removeLodging = (idx) => {
    setFormUser({ ...form, lodgings: form.lodgings.filter((_, i) => i !== idx) });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="cotizar-page">
      <Toaster position="top-right" />
      <div className="mb-8">
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-red-600">Armar cotización</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Cotiza tu evento</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">Selecciona uno o varios eventos y paquetes de hospedaje. Cada paquete admite personas adicionales con noches y fechas propias. Total en vivo.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* 1. EVENTOS (múltiples) */}
          <Section icon={Trophy} title="1) Eventos" testId="block-events" subtitle="Marca uno o más eventos del Admin. Por cada evento, marca las categorías inscritas (cada una suma su fee).">
            {tournaments.length === 0 && (
              <p className="text-sm text-slate-500 italic">No hay eventos activos. Contacta al administrador.</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="cotizar-events-list">
              {tournaments.map((t) => {
                const selected = !!form.events.find((e) => e.tournament_id === t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleEvent(t)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${selected ? "border-fsc-rojo bg-red-50" : "border-slate-200 hover:border-slate-400"}`}
                    data-testid={`tournament-${t.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fsc-azul">{t.event_type || "evento"}</div>
                        <div className="font-display text-xl font-black uppercase tracking-tight">{t.name}</div>
                      </div>
                      <input type="checkbox" checked={selected} onChange={() => {}} className="h-5 w-5 accent-fsc-rojo mt-1" />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{t.start_date} → {t.end_date}</div>
                    {t.city && <div className="text-[10px] text-slate-500">{t.city}</div>}
                    {(t.categories?.length || 0) > 0 && (
                      <div className="text-[10px] text-slate-500 mt-2">{t.categories.length} categoría(s) disponibles</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Por cada evento seleccionado, mostrar sus categorías */}
            {form.events.length > 0 && (
              <div className="mt-5 space-y-4" data-testid="selected-events-list">
                {form.events.map((ev, evIdx) => {
                  const t = tournaments.find((x) => x.id === ev.tournament_id);
                  const cats = t?.categories || [];
                  return (
                    <div key={ev.tournament_id} className="border-2 border-fsc-rojo/30 bg-red-50/40 rounded-xl p-4" data-testid={`event-block-${evIdx}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-fsc-rojo">Evento {evIdx + 1}</div>
                          <div className="font-display text-lg font-black uppercase tracking-tight">{ev.tournament_name}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleEvent({ id: ev.tournament_id })}
                          className="text-xs font-bold uppercase tracking-wider text-fsc-rojo hover:underline flex items-center gap-1"
                          data-testid={`event-remove-${evIdx}`}
                        ><Trash2 size={12}/> Quitar evento</button>
                      </div>
                      {cats.length === 0 ? (
                        <p className="text-xs italic text-amber-600">Este evento no tiene categorías configuradas por el admin.</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {cats.map((c, ci) => {
                            const checked = (ev.categories || []).some((x) => x.name === c.name);
                            return (
                              <label
                                key={`${ev.tournament_id}-${c.name}-${ci}`}
                                className={`flex items-center gap-2 p-2.5 border-2 rounded cursor-pointer transition-colors ${checked ? "border-fsc-azul bg-white" : "border-slate-200 bg-white/60 hover:border-slate-400"}`}
                                data-testid={`event-${evIdx}-cat-${ci}`}
                              >
                                <input type="checkbox" checked={checked} onChange={() => toggleEventCategory(ev.tournament_id, c)} className="h-4 w-4 accent-fsc-azul" />
                                <span className="flex-1">
                                  <span className="font-bold uppercase tracking-wide text-sm">{c.name}</span>
                                  <span className="block text-[11px] text-slate-500 tabular-nums">Inscripción: {fmt(c.fee || 0)}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.include_registration} onChange={(e) => setFormUser({ ...form, include_registration: e.target.checked })} className="h-4 w-4 accent-fsc-rojo" data-testid="cotizar-include-reg" />
                  <span>Incluir inscripción de las categorías seleccionadas en el total</span>
                </label>
              </div>
            )}
          </Section>

          {/* 2. PAQUETES DE HOSPEDAJE (múltiples) */}
          <Section icon={Hotel} title="2) Paquetes de hospedaje" testId="block-lodgings" subtitle="Agrega uno o varios paquetes. Cada paquete tiene su propio número de personas y bloques de personas adicionales con noches y fechas distintas.">
            {form.lodgings.length === 0 && (
              <p className="text-sm italic text-slate-400 mb-3" data-testid="no-lodgings">Sin paquetes agregados. Pulsa "Agregar paquete".</p>
            )}
            <div className="space-y-4">
              {form.lodgings.map((ld, idx) => (
                <LodgingBlock
                  key={`lod-${idx}`}
                  idx={idx}
                  data={ld}
                  tiers={config.lodging_tiers}
                  onChange={(patch) => updateLodging(idx, patch)}
                  onRemove={() => removeLodging(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addLodging}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-white bg-fsc-azul hover:bg-fsc-azul-oscuro px-4 py-2 rounded inline-flex items-center gap-2"
              data-testid="add-lodging"
            >
              <Plus size={14}/> Agregar paquete
            </button>
          </Section>

          {/* 3. Alimentación */}
          <Section icon={Utensils} title="3) Alimentación adicional" testId="block-meals" subtitle="Para llegadas tempranas o días extra. El paquete ya incluye 5 desayunos, 4 almuerzos y 5 cenas.">
            <DomicilioMealsEditor
              entries={form.meal_entries || []}
              mealPlans={config.meal_plans}
              tier={form.lodgings[0]?.tier_id || ""}
              onChange={(entries) => setFormUser({ ...form, meal_entries: entries })}
            />
          </Section>

          {/* 4. Transporte */}
          <Section icon={Bus} title="4) Transporte" testId="block-transport" subtitle="Agrega cada traslado con cantidad de personas y fecha.">
            <TransportEntriesEditor
              entries={form.transport_entries || []}
              routes={config.transport_routes}
              defaultPax={form.lodgings.reduce((s, l) => s + (l.pax || 0), 0) || 1}
              onChange={(entries) => setFormUser({
                ...form,
                transport_entries: entries,
                transport_routes: Array.from(new Set(entries.map((e) => e.route_id))),
              })}
            />
          </Section>

          {/* 5. Tours */}
          <Section icon={Map} title="5) Tours y actividades" testId="block-tours" subtitle="Indica cuántas personas tomarán cada tour.">
            <TourEntriesEditor
              entries={form.tour_entries || []}
              tours={config.tours_catalog}
              defaultPax={form.lodgings.reduce((s, l) => s + (l.pax || 0), 0) || 1}
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
            <div className="font-display text-2xl tracking-wider text-white">Tu cotización</div>
            {(form.lodgings.length === 0 && form.events.length === 0) && (
              <div className="mt-3 text-[11px] text-fsc-gris italic bg-fsc-azul/15 border border-fsc-azul/30 rounded px-2 py-1.5" data-testid="cotizar-hint-empty">
                Marca al menos un <strong>evento</strong> o agrega un <strong>paquete de hospedaje</strong> para ver el total.
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm" data-testid="cotizar-summary">
              {/* Eventos */}
              {(estimate?.events_breakdown || []).map((ev, i) => (
                <div key={`evb-${i}`} className="border-b border-fsc-azul/20 pb-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-fsc-gris uppercase tracking-wider">{ev.tournament_name || "Evento"}</span>
                    <span className="font-bold tabular-nums">{fmt(ev.subtotal)}</span>
                  </div>
                  {(ev.categories || []).map((c, j) => (
                    <div key={`evbc-${i}-${j}`} className="flex justify-between text-[10px] text-fsc-gris pl-2">
                      <span>· {c.name}</span>
                      <span className="tabular-nums">{fmt(c.fee)}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Paquetes */}
              {(estimate?.lodgings_breakdown || []).map((b, i) => (
                <div key={`ldb-${i}`} className="border-b border-fsc-azul/20 pb-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-fsc-gris uppercase tracking-wider">{b.tier_name} · {b.pax} pax</span>
                    <span className="font-bold tabular-nums">{fmt(b.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-fsc-gris pl-2">
                    <span>· Valor unitario</span>
                    <span className="tabular-nums">{fmt(b.rate_per_person_total)}</span>
                  </div>
                  {b.free_lodging_units > 0 && (
                    <div className="text-[10px] text-fsc-rojo pl-2">🎉 Promo 21 gratis: {b.free_lodging_units} pax sin costo</div>
                  )}
                  {(b.extra_pax_breakdown || []).map((ep, j) => (
                    <div key={`ldb-${i}-ep-${j}`} className="flex justify-between text-[10px] text-fsc-gris pl-2">
                      <span>· {ep.label || "Adicionales"} ({ep.pax}p × {ep.nights}n)</span>
                      <span className="tabular-nums">{fmt(ep.subtotal)}</span>
                    </div>
                  ))}
                </div>
              ))}

              <Row k="Hospedaje" v={fmt(estimate?.lodging_subtotal || 0)} />
              <Row k="Alimentación" v={fmt((estimate?.breakfast_subtotal || 0) + (estimate?.lunch_subtotal || 0) + (estimate?.dinner_subtotal || 0))} />
              <Row k="Transporte" v={fmt(estimate?.transport_subtotal || 0)} />
              <Row k="Tours" v={fmt(estimate?.tours_subtotal || 0)} />
              {estimate?.registration_fee > 0 && <Row k="Inscripción" v={fmt(estimate.registration_fee)} />}
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
      <span className="text-slate-300">{k}</span>
      <span className="font-semibold text-right tabular-nums text-white">{v}</span>
    </div>
  );
}

// ----- Bloque de paquete de hospedaje individual -----
function LodgingBlock({ idx, data, tiers, onChange, onRemove }) {
  const tier = tiers.find((t) => t.id === data.tier_id);
  const isDom = data.tier_id === "domicilio";
  const pax = Number(data.pax || 0);
  const unitario = (tier && !isDom) ? Number(tier.base_5_nights || 0) : 0;
  const subtotal = unitario * pax;
  return (
    <div className="border-2 border-fsc-azul/30 bg-fsc-azul/5 rounded-xl p-4" data-testid={`lodging-block-${idx}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-fsc-azul">Paquete {idx + 1}</div>
          <div className="font-display text-lg font-black uppercase tracking-tight">{tier?.name || "Selecciona un paquete"}</div>
        </div>
        <button type="button" onClick={onRemove} className="text-xs font-bold uppercase tracking-wider text-fsc-rojo hover:underline flex items-center gap-1" data-testid={`lodging-remove-${idx}`}>
          <Trash2 size={12}/> Quitar paquete
        </button>
      </div>

      {/* Selector de tier — muestra NOMBRE, ACOMODACIÓN, VALOR PAQUETE, NOCHE ADICIONAL (estructura del admin) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
        {tiers.map((t) => {
          const selected = data.tier_id === t.id;
          const tIsDom = t.id === "domicilio";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ tier_id: t.id })}
              className={`text-left p-3 rounded-lg border-2 transition-colors ${selected ? "border-fsc-azul bg-white" : "border-slate-200 bg-white/60 hover:border-slate-400"}`}
              data-testid={`lodging-${idx}-tier-${t.id}`}
            >
              {/* NOMBRE */}
              <div className="font-display text-base font-black uppercase tracking-tight" data-testid={`lodging-${idx}-tier-${t.id}-name`}>{t.name}</div>
              {/* ACOMODACIÓN */}
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-fsc-azul-oscuro mt-0.5" data-testid={`lodging-${idx}-tier-${t.id}-acc`}>
                Acomodación: {t.accommodation_type || "—"}
              </div>
              {t.description && <div className="text-[10px] text-slate-500 mt-0.5">{t.description}</div>}
              {!tIsDom ? (
                <div className="mt-2 space-y-0.5 text-[11px]">
                  {/* VALOR PAQUETE */}
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wider text-[9px]">Valor paquete</span>
                    <span className="font-bold tabular-nums" data-testid={`lodging-${idx}-tier-${t.id}-base`}>{fmt(t.base_5_nights)}</span>
                  </div>
                  {/* NOCHE ADICIONAL */}
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wider text-[9px]">Noche adicional</span>
                    <span className="font-bold tabular-nums" data-testid={`lodging-${idx}-tier-${t.id}-add`}>{fmt(t.additional_night)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-[10px] italic text-slate-500">Sin hospedaje (alojamiento propio)</div>
              )}
            </button>
          );
        })}
      </div>

      {/* PAX (digitable) — Noches removido: ya viene definido en el paquete */}
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Personas (pax)</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={data.pax === undefined || data.pax === null ? "" : data.pax}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ pax: v === "" ? "" : Number(v) });
            }}
            onBlur={(e) => {
              if (e.target.value === "" || Number(e.target.value) < 0) onChange({ pax: 0 });
            }}
            placeholder="0"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums focus:border-fsc-azul focus:outline-none"
            data-testid={`lodging-${idx}-pax`}
          />
        </label>
        {/* Valor unitario (por persona, definido por el admin) */}
        <div className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valor unitario</span>
          <div className="mt-1 px-3 py-2 border border-slate-200 rounded-md bg-white tabular-nums font-bold text-fsc-azul" data-testid={`lodging-${idx}-unit`}>
            {fmt(unitario)}
          </div>
        </div>
        {/* Valor total = unitario × pax */}
        <div className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valor total</span>
          <div className="mt-1 px-3 py-2 border-2 border-fsc-azul rounded-md bg-fsc-azul/10 tabular-nums font-black text-fsc-azul text-lg" data-testid={`lodging-${idx}-total`}>
            {fmt(subtotal)}
          </div>
        </div>
      </div>

      {/* Extra pax (personas adicionales) DENTRO de este paquete */}
      {!isDom && (
        <ExtraPaxEditor
          parentIdx={idx}
          entries={data.extra_pax_entries || []}
          tier={tier}
          onChange={(entries) => onChange({ extra_pax_entries: entries })}
        />
      )}
    </div>
  );
}

// ----- Editor de personas adicionales (etiqueta + cantidad + noches + desde/hasta + valor) -----
function ExtraPaxEditor({ parentIdx, entries, tier, onChange }) {
  const add = () => onChange([...entries, { label: "", pax: 1, nights: 5, date_from: "", date_to: "" }]);
  const update = (i, k, v) => {
    const next = [...entries];
    if (k === "label" || k === "date_from" || k === "date_to") {
      next[i] = { ...next[i], [k]: v };
    } else {
      // pax y nights: permitir vacío durante el tipeo
      next[i] = { ...next[i], [k]: v === "" ? "" : Number(v) };
    }
    onChange(next);
  };
  const onBlurNum = (i, k) => {
    const v = entries[i]?.[k];
    if (v === "" || v === undefined || Number(v) < 0) {
      const next = [...entries];
      next[i] = { ...next[i], [k]: 0 };
      onChange(next);
    }
  };
  const remove = (i) => onChange(entries.filter((_, j) => j !== i));

  const base5 = Number(tier?.base_5_nights || 0);
  const addNight = Number(tier?.additional_night || 0);
  const unitFor = (nights) => base5 + addNight * Math.max(0, Number(nights || 0) - 5);

  return (
    <div className="mt-4 border-t-2 border-dashed border-fsc-azul/20 pt-3" data-testid={`extra-pax-editor-${parentIdx}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-fsc-azul-oscuro">Personas adicionales del paquete</div>
          <div className="text-[10px] text-slate-500">Acompañantes que se hospedan con este paquete pero con noches o fechas distintas.</div>
        </div>
        <button type="button" onClick={add} className="text-[11px] font-bold uppercase tracking-wider text-fsc-azul border-2 border-fsc-azul bg-white hover:bg-fsc-azul/10 px-3 py-1 rounded" data-testid={`extra-pax-add-${parentIdx}`}>+ Agregar</button>
      </div>
      {entries.length === 0 && (
        <div className="text-[11px] text-slate-400 italic">Sin personas adicionales.</div>
      )}
      <div className="space-y-2">
        {entries.map((ep, i) => {
          const epPax = Number(ep.pax || 0);
          const unit = unitFor(ep.nights);
          const total = unit * epPax;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-md p-2 space-y-2" data-testid={`extra-pax-${parentIdx}-row-${i}`}>
              <div className="grid sm:grid-cols-12 gap-2 items-end">
                <label className="sm:col-span-3 block">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Etiqueta</span>
                  <input value={ep.label || ""} onChange={(e) => update(i, "label", e.target.value)} placeholder="Padres, fisio..." className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Cantidad</span>
                  <input
                    type="number" min="0" inputMode="numeric"
                    value={ep.pax === undefined || ep.pax === null ? "" : ep.pax}
                    onChange={(e) => update(i, "pax", e.target.value)}
                    onBlur={() => onBlurNum(i, "pax")}
                    placeholder="0"
                    className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-xs tabular-nums"
                    data-testid={`extra-pax-${parentIdx}-${i}-pax`}
                  />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Noches</span>
                  <input
                    type="number" min="0" inputMode="numeric"
                    value={ep.nights === undefined || ep.nights === null ? "" : ep.nights}
                    onChange={(e) => update(i, "nights", e.target.value)}
                    onBlur={() => onBlurNum(i, "nights")}
                    placeholder="5"
                    className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-xs tabular-nums"
                    data-testid={`extra-pax-${parentIdx}-${i}-nights`}
                  />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Desde</span>
                  <input type="date" value={ep.date_from || ""} onChange={(e) => update(i, "date_from", e.target.value)} className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Hasta</span>
                  <input type="date" value={ep.date_to || ""} onChange={(e) => update(i, "date_to", e.target.value)} className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                </label>
                <button type="button" onClick={() => remove(i)} className="sm:col-span-1 text-fsc-rojo hover:bg-red-50 p-1 rounded justify-self-end" aria-label="Quitar" data-testid={`extra-pax-${parentIdx}-${i}-remove`}><X size={14}/></button>
              </div>
              {/* Valor unitario y total de la fila */}
              <div className="flex justify-end gap-4 text-[10px] pt-1 border-t border-slate-100">
                <span className="text-slate-500">Valor unitario: <span className="font-bold tabular-nums text-fsc-azul" data-testid={`extra-pax-${parentIdx}-${i}-unit`}>{fmt(unit)}</span></span>
                <span className="text-slate-500">Valor total: <span className="font-bold tabular-nums text-fsc-azul" data-testid={`extra-pax-${parentIdx}-${i}-total`}>{fmt(total)}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Meals editor -----
function DomicilioMealsEditor({ entries, mealPlans, tier, onChange }) {
  const add = () => onChange([...entries, { _uid: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), meal_type: "breakfast", pax: 1 }]);
  const update = (idx, patch) => onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx) => onChange(entries.filter((_, i) => i !== idx));
  const priceOf = (mt) => (mealPlans.find((m) => m.id === mt)?.per_day_by_tier?.[tier] || 0);

  return (
    <div className="space-y-3" data-testid="meals-editor">
      <p className="text-xs text-slate-500">Agrega una fila por cada comida (fecha + tipo + número de personas).</p>
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-xs italic text-slate-400">Sin comidas agregadas aún.</p>}
        {entries.map((e, idx) => (
          <div key={e._uid || `meal-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-slate-50 border border-slate-200 rounded-md p-2" data-testid={`meal-row-${idx}`}>
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
      <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wide text-blue-700 hover:underline flex items-center gap-1" data-testid="meal-add"><Plus size={12}/> Agregar comida</button>
    </div>
  );
}

// ----- Tour entries editor -----
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
      {entries.length === 0 && <p className="text-xs italic text-slate-400">Sin tours agregados. Pulsa "Agregar tour".</p>}
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

// ----- Transport entries editor -----
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

// ----- Public gate -----
function CotizarGate({ variant, team }) {
  const M = {
    login: { icon: Lock, title: "Acceso restringido", text: "Las cotizaciones son exclusivas para directivos registrados y aprobados por la organización.", cta: { label: "Iniciar sesión / Registrar club", to: "/login" } },
    pending: { icon: Clock, title: "Tu club está en revisión", text: `El club "${team?.name}" está pendiente de aprobación por el organizador. Apenas se apruebe podrás generar cotizaciones aquí.`, cta: { label: "Volver a Mi Club", to: "/mi-equipo" } },
    rejected: { icon: Lock, title: "Club rechazado", text: "Tu club fue rechazado por el organizador. Contacta a Future Soccer Cup para más información.", cta: { label: "Ir al inicio", to: "/" } },
    role: { icon: Lock, title: "Función exclusiva", text: "Esta sección solo está disponible para directivos de club.", cta: { label: "Volver al inicio", to: "/" } },
    "cuerpo-tecnico": { icon: Lock, title: "Solo el Directivo puede cotizar", text: "Tu rol es Cuerpo Técnico. Las cotizaciones del club solo las puede generar el Directivo.", cta: { label: "Ir a Mi Club", to: "/mi-equipo" } },
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
