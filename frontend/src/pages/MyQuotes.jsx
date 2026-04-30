import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { toast, Toaster } from "sonner";
import { CreditCard } from "lucide-react";

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

  useEffect(() => {
    api.get("/quotes/mine").then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

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

      <div className="space-y-3">
        {items.map((q) => {
          const s = STATUS[q.status] || STATUS.pendiente;
          const canPay = q.status === "aprobada" && q.payment_status !== "paid";
          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-5 grid md:grid-cols-12 gap-4 items-center" data-testid={`my-quote-${q.id}`}>
              <div className="md:col-span-3">
                <div className="text-xs uppercase tracking-widest text-slate-500">{q.event_name}</div>
                <div className="font-display text-xl font-black uppercase tracking-tight">{q.category}</div>
              </div>
              <div className="md:col-span-3 text-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Hospedaje</div>
                <div className="font-semibold">{q.lodging_name} · {q.room_type}</div>
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
                {canPay && (
                  <button onClick={() => payQuote(q.id)} disabled={paying === q.id} className="w-full fsc-btn-red px-3 py-2 rounded-md text-xs flex items-center gap-2 justify-center disabled:opacity-50" data-testid={`pay-quote-btn-${q.id}`}>
                    <CreditCard size={14}/> {paying === q.id ? "Redirigiendo..." : "Pagar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
