import { useState } from "react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import FileUpload from "./FileUpload";

const METHODS = [
  { v: "transferencia", l: "Transferencia bancaria" },
  { v: "consignacion",  l: "Consignación" },
  { v: "efectivo",      l: "Efectivo" },
  { v: "pse",           l: "PSE" },
  { v: "nequi",         l: "Nequi / Daviplata" },
  { v: "otro",          l: "Otro" },
];

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const fmtUSD = (n) => `US$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCur = (n, cur) => (cur === "USD" ? fmtUSD(n) : fmtCOP(n));

/**
 * Inline form for registering a manual partial payment (abono) with a receipt.
 * targetType: "quote" | "team_registration"
 * targetId: id of the parent record
 * suggestedAmount: prefilled amount (balance), optional
 * currency: "COP" | "USD" — moneda del target (cotización). Default COP.
 */
export default function PaymentForm({ targetType, targetId, suggestedAmount = "", currency = "COP", onCreated, onCancel }) {
  const isUSD = currency === "USD";
  const [amount, setAmount] = useState(
    suggestedAmount
      ? (isUSD ? String(Number(suggestedAmount).toFixed(2)) : String(Math.round(suggestedAmount)))
      : ""
  );
  const [method, setMethod] = useState("transferencia");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!receiptUrl) { toast.error("Debes adjuntar el comprobante"); return; }
    setSaving(true);
    try {
      await api.post("/payments", {
        target_type: targetType,
        target_id: targetId,
        amount: num,
        currency,
        method,
        reference,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        receipt_url: receiptUrl,
        notes,
      });
      toast.success("Abono registrado · pendiente de validación");
      onCreated?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo registrar el abono");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4" data-testid="payment-form">
      {/* Datos bancarios del organizador */}
      <div className="bg-fsc-azul/5 border-2 border-fsc-azul/30 rounded-lg p-4" data-testid="payment-bank-info">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-fsc-azul-oscuro">Realiza tu abono a:</div>
        <div className="font-display text-base font-black uppercase tracking-tight text-fsc-azul mt-1">Transferencia · Cuenta de Ahorros</div>
        <ul className="text-xs text-slate-700 mt-2 space-y-0.5">
          <li><span className="text-slate-500">Banco:</span> <strong>Bancolombia</strong></li>
          <li><span className="text-slate-500">Cuenta de Ahorros N°:</span> <strong className="tabular-nums">247-000006-97</strong></li>
          <li><span className="text-slate-500">Titular:</span> <strong>Grupo Empresarial ANCLA</strong></li>
          <li><span className="text-slate-500">NIT:</span> <strong className="tabular-nums">901.523.952</strong></li>
        </ul>
        <p className="text-[11px] text-slate-600 mt-2 italic">Sube el comprobante para que el administrador valide tu abono.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monto del abono ({currency})</span>
          <input
            type="number"
            min="0.01"
            step={isUSD ? "0.01" : "1"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={isUSD ? "Ej. 150.00" : "Ej. 500000"}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm tabular-nums"
            data-testid="payment-amount-input"
            required
          />
          {amount && <p className="text-[11px] text-slate-500 mt-1">{fmtCur(amount, currency)}</p>}
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha del pago</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            data-testid="payment-date-input"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Método</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
            data-testid="payment-method-select"
          >
            {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">N° comprobante / referencia</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej. 4892101"
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            data-testid="payment-reference-input"
          />
        </label>
      </div>

      <FileUpload value={receiptUrl} onChange={setReceiptUrl} label="Comprobante (foto o PDF)" testId="payment-receipt-upload" />

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          placeholder="Información adicional para el organizador"
          data-testid="payment-notes-input"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900" data-testid="payment-cancel-btn">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={saving} className="fsc-btn-primary px-5 py-2 rounded-md text-xs disabled:opacity-50" data-testid="payment-submit-btn">
          {saving ? "Guardando..." : "Registrar abono"}
        </button>
      </div>
    </form>
  );
}
