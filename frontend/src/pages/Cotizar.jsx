import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, imgSrc } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Trophy, Hotel, CheckCircle2 } from "lucide-react";

const ROOM_TYPES = [
  { id: "single",    label: "Sencilla (1 pax)" },
  { id: "double",    label: "Doble (2 pax)" },
  { id: "triple",    label: "Triple (3 pax)" },
  { id: "quadruple", label: "Cuádruple (4 pax)" },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function Cotizar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [config, setConfig] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    event_type: "", category: "",
    lodging_tier: "gold", room_type: "double",
    pax: 4, nights: 3,
    includes_transport: false, includes_parque: false, includes_tour: false,
    notes: "", contact_phone: "",
  });
  const [estimate, setEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [transports, setTransports] = useState([]);
  const [tours, setTours] = useState([]);
  const [pickedHotel, setPickedHotel] = useState(null);
  const [pickedTransport, setPickedTransport] = useState(null);
  const [pickedTour, setPickedTour] = useState(null);

  useEffect(() => { api.get("/event-types").then((r) => setConfig(r.data)); }, []);
  useEffect(() => {
    Promise.all([
      api.get("/hotels").catch(() => ({ data: [] })),
      api.get("/transports").catch(() => ({ data: [] })),
      api.get("/tours").catch(() => ({ data: [] })),
    ]).then(([h, tr, to]) => {
      setHotels(h.data || []);
      setTransports(tr.data || []);
      setTours(to.data || []);
    });
  }, []);

  const hotelsInTier = useMemo(
    () => hotels.filter((h) => !form.lodging_tier || !h.tier || h.tier === form.lodging_tier),
    [hotels, form.lodging_tier]
  );

  // Recalculate estimate whenever form changes (and we have all required fields)
  useEffect(() => {
    if (!form.event_type || !form.category) { setEstimate(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.post("/quotes/calculate", form);
        setEstimate(r.data);
      } catch {
        setEstimate(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form]);

  if (!config) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  const event = config.events.find((e) => e.id === form.event_type);

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión para cotizar"); nav("/login"); return; }
    setSubmitting(true);
    try {
      const extras = [];
      if (pickedHotel) extras.push(`Hotel solicitado: ${pickedHotel.name}`);
      if (pickedTransport) extras.push(`Transporte: ${pickedTransport.name}`);
      if (pickedTour) extras.push(`Tour: ${pickedTour.name}`);
      const notes = [form.notes, ...extras].filter(Boolean).join(" | ");
      await api.post("/quotes", { ...form, notes });
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
        <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Cotización del evento</span>
        <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Cotiza tu participación</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">Elige el evento, categoría, paquete de hospedaje y servicios. El total se calcula automáticamente.</p>
      </div>

      <Stepper step={step} />

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Event */}
          <Section title="Evento" testId="step-event">
            <div className="grid md:grid-cols-3 gap-3">
              {config.events.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setForm({ ...form, event_type: e.id, category: "" })}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${form.event_type === e.id ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}
                  data-testid={`event-${e.id}`}
                >
                  <Trophy className={form.event_type === e.id ? "text-blue-700" : "text-slate-400"} size={20} />
                  <div className="font-display text-xl font-black uppercase tracking-tight mt-2">{e.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{e.description}</div>
                  <div className="mt-2 text-xs font-bold text-blue-700">Inscripción {fmt(e.registration_fee_per_team)} <span className="text-[10px] text-slate-400">COP</span></div>
                </button>
              ))}
            </div>
          </Section>

          {event && (
            <Section title="Categoría" testId="step-category">
              <div className="flex flex-wrap gap-2">
                {event.categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${form.category === c ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-700 border-slate-200"}`}
                    data-testid={`cat-${c}`}
                  >{c}</button>
                ))}
              </div>
            </Section>
          )}

          <Section title="Hospedaje" testId="step-lodging">
            <div className="grid md:grid-cols-4 gap-3">
              {config.lodging_tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, lodging_tier: t.id })}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${form.lodging_tier === t.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:border-slate-400"}`}
                  data-testid={`tier-${t.id}`}
                >
                  <Hotel size={18} />
                  <div className="font-display text-lg font-black uppercase tracking-tight mt-1">{t.name}</div>
                  <div className={`text-[10px] mt-1 ${form.lodging_tier === t.id ? "text-slate-300" : "text-slate-500"}`}>desde {fmt(t.rates.quadruple)}/pax/noche</div>
                </button>
              ))}
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de habitación</span>
                <select value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="room-type">
                  {ROOM_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
            </div>

            {hotelsInTier.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hoteles disponibles ({hotelsInTier.length})</span>
                    <p className="text-[10px] text-slate-400">Selección informativa · no altera el total estimado.</p>
                  </div>
                  {pickedHotel && <button type="button" onClick={() => setPickedHotel(null)} className="text-[10px] text-slate-400 hover:text-slate-900 underline">Quitar selección</button>}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hotelsInTier.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setPickedHotel(pickedHotel?.id === h.id ? null : h)}
                      className={`text-left border-2 rounded-xl overflow-hidden transition-colors ${pickedHotel?.id === h.id ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-400"}`}
                      data-testid={`hotel-pick-${h.id}`}
                    >
                      {h.image_url && <img src={imgSrc(h.image_url)} alt={h.name} className="w-full h-24 object-cover" />}
                      <div className="p-3">
                        <div className="font-display text-sm font-black uppercase tracking-tight truncate">{h.name}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-2">{h.description}</div>
                        <div className="mt-1 text-xs font-bold text-blue-700 tabular-nums">{fmt(h.price_per_night)}<span className="text-[9px] text-slate-400 font-bold ml-1">/noche</span></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Personas y noches" testId="step-pax">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500"># PAX</span>
                <input type="number" min="1" value={form.pax} onChange={(e) => setForm({ ...form, pax: Math.max(1, Number(e.target.value)) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="pax-input" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Noches</span>
                <input type="number" min="1" value={form.nights} onChange={(e) => setForm({ ...form, nights: Math.max(1, Number(e.target.value)) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="nights-input" />
              </label>
            </div>
          </Section>

          <Section title="Servicios adicionales" testId="step-addons">
            <div className="grid sm:grid-cols-3 gap-3">
              <Toggle label="Transporte" subtitle={`+${fmt(config.addons.transport)}/pax`} checked={form.includes_transport} onChange={(v) => setForm({ ...form, includes_transport: v })} testId="toggle-transport" />
              <Toggle label="Parque" subtitle={`+${fmt(config.addons.parque)}/pax`} checked={form.includes_parque} onChange={(v) => setForm({ ...form, includes_parque: v })} testId="toggle-parque" />
              <Toggle label="Tour ciudad" subtitle={`+${fmt(config.addons.tour)}/pax`} checked={form.includes_tour} onChange={(v) => setForm({ ...form, includes_tour: v })} testId="toggle-tour" />
            </div>

            {form.includes_transport && transports.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Transportes disponibles</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {transports.map((t) => (
                    <button key={t.id} type="button" onClick={() => setPickedTransport(pickedTransport?.id === t.id ? null : t)} className={`text-left border-2 rounded-lg p-3 ${pickedTransport?.id === t.id ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-400"}`} data-testid={`transport-pick-${t.id}`}>
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.type} · {t.capacity} pax</div>
                      <div className="text-xs font-bold text-blue-700 mt-1">{fmt(t.price)} COP</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.includes_tour && tours.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Tours disponibles</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {tours.map((to) => (
                    <button key={to.id} type="button" onClick={() => setPickedTour(pickedTour?.id === to.id ? null : to)} className={`text-left border-2 rounded-lg p-3 ${pickedTour?.id === to.id ? "border-blue-700 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-400"}`} data-testid={`tour-pick-${to.id}`}>
                      <div className="font-bold text-sm">{to.name}</div>
                      <div className="text-[10px] text-slate-500">{to.duration}</div>
                      <div className="text-xs font-bold text-blue-700 mt-1">{fmt(to.price)} COP</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono de contacto</span>
              <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="phone-input" />
            </label>
            <label className="block mt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas adicionales</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="notes-input" />
            </label>
          </Section>
        </div>

        <aside className="bg-slate-900 text-white rounded-2xl p-6 fsc-stripe-blue h-fit lg:sticky lg:top-20" data-testid="quote-summary">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight">Resumen</h3>
          {!estimate ? (
            <p className="text-sm text-slate-400 mt-4">Completa evento y categoría para ver el cálculo.</p>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Evento" value={estimate.event_name} />
              <Row label="Categoría" value={form.category} />
              <Row label="Hospedaje" value={`${estimate.lodging_name} · ${form.room_type}`} />
              {pickedHotel && <Row label="Hotel elegido" value={pickedHotel.name} />}
              <Row label="Tarifa/pax/noche" value={fmt(estimate.rate_per_person_night)} />
              <Row label={`Hospedaje (${form.pax} pax × ${form.nights} noches)`} value={fmt(estimate.lodging_subtotal)} />
              {estimate.transport_subtotal > 0 && <Row label="Transporte" value={fmt(estimate.transport_subtotal)} />}
              {estimate.parque_subtotal > 0 && <Row label="Parque" value={fmt(estimate.parque_subtotal)} />}
              {estimate.tour_subtotal > 0 && <Row label="Tour" value={fmt(estimate.tour_subtotal)} />}
              <Row label="Inscripción equipo" value={fmt(estimate.registration_fee)} />
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-slate-300">Total</span>
                  <span className="font-display text-4xl font-black text-red-400 tabular-nums">{fmt(estimate.total_amount)}<span className="text-xs text-slate-400 font-bold ml-1">COP</span></span>
                </div>
              </div>
              <button
                onClick={submit}
                disabled={submitting || !form.event_type || !form.category}
                className="mt-4 fsc-btn-red w-full py-3 rounded-md text-sm disabled:opacity-50"
                data-testid="quote-submit-btn"
              >
                {submitting ? "Enviando..." : user ? "Enviar cotización" : "Inicia sesión para enviar"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stepper({ step }) {
  const steps = ["Evento", "Categoría", "Hospedaje", "PAX/Noches", "Adicionales"];
  return (
    <div className="hidden md:flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-display font-black text-xs ${i < step ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</div>
          <span className={`uppercase tracking-wider font-bold ${i < step ? "text-blue-700" : "text-slate-400"}`}>{s}</span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children, testId }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid={testId}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-red-600" />
        <h3 className="font-display text-xl font-black uppercase tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, subtitle, checked, onChange, testId }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${checked ? "border-green-600 bg-green-50" : "border-slate-200 hover:border-slate-400"}`}
      data-testid={testId}
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? "bg-green-600 text-white" : "border-2 border-slate-300"}`}>
        {checked && <CheckCircle2 size={14} />}
      </div>
      <div>
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-baseline gap-2 text-sm">
      <span className="text-slate-400 truncate">{label}</span>
      <span className="font-semibold text-white whitespace-nowrap">{value}</span>
    </div>
  );
}
