import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const [info, setInfo] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let attempts = 0;
    const poll = async () => {
      try {
        const r = await api.get(`/payments/checkout/status/${sessionId}`);
        setInfo(r.data);
        if (r.data.payment_status === "paid") { setStatus("success"); return; }
        if (r.data.status === "expired") { setStatus("expired"); return; }
        if (attempts++ < 10) setTimeout(poll, 2000);
        else setStatus("timeout");
      } catch {
        if (attempts++ < 10) setTimeout(poll, 2000);
        else setStatus("error");
      }
    };
    poll();
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center" data-testid="payment-success-page">
      {status === "checking" && (
        <>
          <Loader2 className="mx-auto text-blue-700 animate-spin" size={48} />
          <h1 className="mt-4 font-display text-3xl font-black uppercase tracking-tight">Verificando pago…</h1>
          <p className="text-sm text-slate-500 mt-2">No cierres esta ventana.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="mx-auto text-green-600" size={64} />
          <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tighter">¡Pago confirmado!</h1>
          <p className="text-slate-600 mt-2">Tu cotización está marcada como pagada. Te enviaremos los detalles del evento por correo.</p>
          {info && <p className="mt-4 text-2xl font-display font-black text-blue-700">${info.amount_total / 100} {info.currency?.toUpperCase()}</p>}
          <button onClick={() => nav("/mis-cotizaciones")} className="mt-8 fsc-btn-primary px-6 py-3 rounded-md text-sm" data-testid="back-to-quotes-btn">Ver mis cotizaciones</button>
        </>
      )}
      {(status === "expired" || status === "timeout" || status === "error") && (
        <>
          <AlertCircle className="mx-auto text-red-600" size={48} />
          <h1 className="mt-4 font-display text-3xl font-black uppercase tracking-tight">No pudimos confirmar el pago</h1>
          <p className="text-slate-600 mt-2">Si la transacción se completó, aparecerá actualizada en breve. Revisa "Mis cotizaciones" o contacta al organizador.</p>
          <button onClick={() => nav("/mis-cotizaciones")} className="mt-6 fsc-btn-primary px-6 py-3 rounded-md text-sm">Mis cotizaciones</button>
        </>
      )}
    </div>
  );
}
