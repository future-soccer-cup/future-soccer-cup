import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { toast, Toaster } from "sonner";
import { CreditCard, ChevronDown, ChevronUp, Receipt as ReceiptIcon } from "lucide-react";
import PaymentForm from "../components/PaymentForm";
import PaymentsList from "../components/PaymentsList";

const STATUS = {
  pendiente: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
  aprobada:  { color: "bg-green-100 text-green-800",  label: "Aprobada" },
  rechazada: { color: "bg-red-100 text-red-800",      label: "Rechazada" },
  pagada:    { color: "bg-blue-100 text-blue-800",    label: "Pagada" },
};

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function MyQuotes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showFormFor, setShowFormFor] = useState(null);
  const [payments, setPayments] = useState({}); // {quoteId: {items, balance}}
  const [loadingPayments, setLoadingPayments] = useState(null);

  const reload = () => api.get("/quotes/mine").then((r) => setItems(r.data));

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const loadPayments = async (qid) => {
    setLoadingPayments(qid);
    try {
      const r = await api.get(`/payments/by-target?target_type=quote&target_id=${qid}`);
      setPayments((prev) => ({ ...prev, [qid]: r.data }));
    } catch {
      // silent
    } finally {
      setLoadingPayments(null);
    }
  };

  const toggleDetails = async (qid) => {
    if (openId === qid) {
      setOpenId(null); setShowFormFor(null);
      return;
    }
    setOpenId(qid);
    if (!payments[qid]) await loadPayments(qid);
  };

  const onPaymentCreated = async (qid) => {
    setShowFormFor(null);
    await loadPayments(qid);
    await reload();
  };

  const payQuote = async (qid) => {
    setPaying(qid);
    try {
      const r = await api.post("/payments/checkout/session", {
        quote_id: qid,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo iniciar el pago");
      setPaying(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="my-quotes-page">
      <Toaster position="top-right" />
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Mi cuenta</span>
          <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Mis cotizaciones</h1>
        </div>
        <Link to="/cotizar" className="fsc-btn-red px-4 py-2 rounded-md text-sm" data-testid="new-quote-btn">+ Nueva cotización</Link>
      </div>

      {loading && <p className="text-slate-500">Cargando...</p>}
      {!loading && items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">Aún no tienes cotizaciones</p>
          <Link to="/cotizar" className="inline-block mt-4 fsc-btn-primary px-6 py-3 rounded-md text-sm">Cotizar evento</Link>
        </div>
      )}

      <div className="space-y-4">
        {items.map((q) => {
          const s = STATUS[q.status] || STATUS.pendiente;
          const canStripe = q.status === "aprobada" && q.payment_status !== "paid";
          const canPayManual = ["aprobada", "pendiente"].includes(q.status) && q.payment_status !== "paid" && q.status !== "rechazada";
          const isOpen = openId === q.id;
          const data = payments[q.id];
          const balanceTotal = data?.balance?.total ?? q.total_amount;
          const balancePaid = data?.balance?.paid ?? 0;
          const balanceRemaining = data?.balance?.balance ?? balanceTotal;

          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`my-quote-${q.id}`}>
              <div className="p-5 grid md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-3">
                  <div className="text-xs uppercase tracking-widest text-slate-500">{q.event_name}</div>
                  <div className="font-display text-xl font-black uppercase tracking-tight">{q.category}</div>
                </div>
                <div className="md:col-span-3 text-sm">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Hospedaje</div>
                  <div className="font-semibold">{q.lodging_name}</div>
                  <div className="text-xs text-slate-500">{q.pax} pax × {q.nights} noches</div>
                </div>
                <div className="md:col-span-2 text-sm">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Total</div>
                  <div className="font-display text-2xl font-black text-blue-700 tabular-nums">{fmtCOP(q.total_amount)}</div>
                  <div className="text-[10px] text-slate-400">COP</div>
                </div>
                <div className="md:col-span-2 text-xs text-slate-500">
                  {new Date(q.created_at).toLocaleDateString("es", { dateStyle: "medium" })}
                </div>
                <div className="md:col-span-2 text-right space-y-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${s.color}`}>{s.label}</span>
                  <button
                    onClick={() => toggleDetails(q.id)}
                    className="w-full text-xs font-bold uppercase tracking-wide text-slate-700 hover:text-blue-700 flex items-center gap-1 justify-center"
                    data-testid={`toggle-payments-${q.id}`}
                  >
                    <ReceiptIcon size={12}/> Abonos {isOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4" data-testid={`payments-panel-${q.id}`}>
                  <div className="grid sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
                      <div className="font-display text-xl font-black tabular-nums">{fmtCOP(balanceTotal)}</div>
                    </div>
                    <div className="bg-white border border-green-200 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-widest text-green-600">Pagado (aprobado)</div>
                      <div className="font-display text-xl font-black text-green-700 tabular-nums" data-testid={`balance-paid-${q.id}`}>{fmtCOP(balancePaid)}</div>
                    </div>
                    <div className="bg-white border border-amber-200 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-widest text-amber-600">Saldo</div>
                      <div className="font-display text-xl font-black text-amber-700 tabular-nums" data-testid={`balance-remaining-${q.id}`}>{fmtCOP(balanceRemaining)}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Historial de abonos</h3>
                    {loadingPayments === q.id && !data ? (
                      <p className="text-xs text-slate-400">Cargando...</p>
                    ) : (
                      <PaymentsList items={data?.items || []} />
                    )}
                  </div>

                  {showFormFor === q.id ? (
                    <PaymentForm
                      targetType="quote"
                      targetId={q.id}
                      suggestedAmount={balanceRemaining}
                      onCreated={() => onPaymentCreated(q.id)}
                      onCancel={() => setShowFormFor(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      {canPayManual && (
                        <button
                          onClick={() => setShowFormFor(q.id)}
                          className="fsc-btn-primary px-4 py-2 rounded-md text-xs flex items-center gap-2"
                          data-testid={`register-payment-btn-${q.id}`}
                        >
                          <ReceiptIcon size={14}/> Registrar abono (comprobante)
                        </button>
                      )}
                      {canStripe && (
                        <button onClick={() => payQuote(q.id)} disabled={paying === q.id} className="fsc-btn-red px-4 py-2 rounded-md text-xs flex items-center gap-2 disabled:opacity-50" data-testid={`pay-quote-btn-${q.id}`}>
                          <CreditCard size={14}/> {paying === q.id ? "Redirigiendo..." : "Pagar saldo con Stripe"}
                        </button>
                      )}
                      {!canPayManual && !canStripe && (
                        <p className="text-xs text-slate-500 italic">No hay acciones de pago disponibles para esta cotización.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
