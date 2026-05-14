import { API_BASE } from "../lib/api";
import { FileText, ImageIcon } from "lucide-react";

const STATUS_META = {
  sin_verificar:    { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Sin verificar" },
  aprobado:         { color: "bg-green-100 text-green-800 border-green-300", label: "Aprobado" },
  saldo_pendiente:  { color: "bg-blue-100 text-blue-800 border-blue-300",    label: "Saldo pendiente" },
  rechazado:        { color: "bg-red-100 text-red-800 border-red-300",       label: "Rechazado" },
};

const METHOD_LABEL = {
  transferencia: "Transferencia",
  consignacion: "Consignación",
  efectivo: "Efectivo",
  pse: "PSE",
  nequi: "Nequi/Daviplata",
  otro: "Otro",
};

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const fileSrc = (u) => (u && u.startsWith("/api/") ? `${API_BASE.replace(/\/api$/, "")}${u}` : u);

export function PaymentStatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.sin_verificar;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.color}`} data-testid={`payment-badge-${status}`}>
      {s.label}
    </span>
  );
}

export default function PaymentsList({ items = [], emptyText = "Aún no hay abonos registrados." }) {
  if (!items.length) {
    return <p className="text-xs text-slate-400 italic" data-testid="payments-empty">{emptyText}</p>;
  }
  return (
    <div className="space-y-2" data-testid="payments-list">
      {items.map((p) => {
        const isPdf = p.receipt_url && /\.pdf$/i.test(p.receipt_url);
        return (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-md px-3 py-2 text-xs" data-testid={`payment-item-${p.id}`}>
            <div className="col-span-3">
              <div className="font-display text-base font-black tabular-nums">{fmtCOP(p.amount)}</div>
              <div className="text-[10px] text-slate-500 uppercase">{METHOD_LABEL[p.method] || p.method}</div>
            </div>
            <div className="col-span-3 text-slate-600">
              <div>{new Date(p.payment_date || p.created_at).toLocaleDateString("es-CO")}</div>
              {p.reference && <div className="text-[10px] text-slate-400">Ref: {p.reference}</div>}
            </div>
            <div className="col-span-3">
              {p.receipt_url ? (
                <a
                  href={fileSrc(p.receipt_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold uppercase tracking-wide"
                  data-testid={`payment-view-receipt-${p.id}`}
                >
                  {isPdf ? <FileText size={12} /> : <ImageIcon size={12} />} Ver comprobante
                </a>
              ) : (
                <span className="text-slate-400">Sin comprobante</span>
              )}
            </div>
            <div className="col-span-3 flex flex-col items-end gap-1">
              <PaymentStatusBadge status={p.status} />
              {p.admin_note && <div className="text-[10px] text-slate-500 italic text-right truncate max-w-full" title={p.admin_note}>Nota: {p.admin_note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
