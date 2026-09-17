import { useCallback, useEffect, useMemo, useState } from "react";
import api, { API_BASE, formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { CheckCircle2, XCircle, FileText, ImageIcon, ExternalLink, Trash2 } from "lucide-react";
import { PaymentStatusBadge } from "../../components/PaymentsList";
import { formatDate, formatDateTime } from "../../lib/dateFormat";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

const STATUSES = ["sin_verificar", "aprobado", "saldo_pendiente", "rechazado"];
const TARGETS = [
  { v: "", l: "Todos" },
  { v: "quote", l: "Cotizaciones" },
  { v: "team_registration", l: "Inscripciones" },
];

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

export default function AdminPayments() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("sin_verificar");
  const [targetFilter, setTargetFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null); // payment row being reviewed
  const [adminNote, setAdminNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (targetFilter) params.set("target_type", targetFilter);
      const r = await api.get(`/admin/payments${params.toString() ? `?${params}` : ""}`);
      setItems(r.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando pagos");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetFilter]);

  useEffect(() => { load(); }, [load]);

  const matchFn = useCallback((p, q) =>
    (p.user_name || "").toLowerCase().includes(q) ||
    (p.user_email || "").toLowerCase().includes(q) ||
    (p.target_label || "").toLowerCase().includes(q) ||
    (p.reference || "").toLowerCase().includes(q) ||
    (p.method || "").toLowerCase().includes(q) ||
    String(p.amount || "").includes(q)
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(items, matchFn, 10);

  const exportColumns = [
    { key: "payment_date", label: "Fecha pago", accessor: (p) => (p.payment_date || p.created_at) ? new Date(p.payment_date || p.created_at).toISOString().slice(0,10) : "" },
    { key: "user_name", label: "DT" },
    { key: "user_email", label: "Email" },
    { key: "target_type", label: "Tipo" },
    { key: "target_label", label: "Concepto" },
    { key: "target_total", label: "Total target (COP)" },
    { key: "amount", label: "Monto abono (COP)" },
    { key: "method", label: "Método" },
    { key: "reference", label: "Referencia" },
    { key: "status", label: "Estado" },
    { key: "admin_note", label: "Nota admin" },
    { key: "reviewed_at", label: "Revisado", accessor: (p) => p.reviewed_at ? new Date(p.reviewed_at).toISOString().slice(0,10) : "" },
  ];

  const stats = useMemo(() => {
    const sum = items.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { count: items.length, total: sum };
  }, [items]);

  const updateStatus = async (status) => {
    if (!review) return;
    setSavingStatus(status);
    try {
      await api.put(`/admin/payments/${review.id}/status`, { status, admin_note: adminNote || "" });
      toast.success("Estado actualizado");
      setReview(null);
      setAdminNote("");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al actualizar");
    } finally {
      setSavingStatus(null);
    }
  };

  const deletePayment = async (pid) => {
    try {
      await api.delete(`/admin/payments/${pid}`);
      toast.success("Abono eliminado");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo eliminar el abono");
      throw err;
    }
  };

  return (
    <div data-testid="admin-payments-page">
      <Toaster position="top-right" />
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Pagos manuales</h1>
      <p className="text-sm text-slate-500 mt-1">Comprobantes (abonos) cargados por directores técnicos. Aprueba o rechaza para reflejar saldo.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!statusFilter ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"}`}
            data-testid="pay-filter-all"
          >Todos</button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${statusFilter === s ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`}
              data-testid={`pay-filter-${s}`}
            >{s.replace("_", " ")}</button>
          ))}
        </div>
        <select
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 border-slate-200 bg-white"
          data-testid="pay-target-filter"
        >
          {TARGETS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <div className="ml-auto text-xs text-slate-500">
          <span className="font-bold tabular-nums" data-testid="pay-count">{stats.count}</span> abonos · <span className="font-bold tabular-nums">{fmtCOP(stats.total)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por DT, email, concepto, referencia, método o monto..."
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="payments"
          />
        </div>
        <ExportCsvButton rows={filtered} columns={exportColumns} filename="pagos" testId="payments-export-csv" />
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">DT / Cliente</th>
              <th className="text-left px-4 py-2">Concepto</th>
              <th className="text-right px-4 py-2">Monto</th>
              <th className="text-left px-4 py-2">Método</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Comprobante</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" className="text-center py-12 text-slate-400">Cargando...</td></tr>}
            {!loading && pageItems.length === 0 && <tr><td colSpan="8" className="text-center py-12 text-slate-400">{items.length === 0 ? "No hay abonos con este filtro" : "Sin resultados para la búsqueda"}</td></tr>}
            {!loading && pageItems.map((p) => {
              const isPdf = p.receipt_url && /\.pdf$/i.test(p.receipt_url);
              return (
                <tr key={p.id} className="border-t border-slate-100" data-testid={`admin-payment-row-${p.id}`}>
                  <td className="px-4 py-2">
                    <div className="font-semibold">{p.user_name || "—"}</div>
                    <div className="text-xs text-slate-500">{p.user_email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-semibold">{p.target_label || (p.target_type === "quote" ? "Cotización" : "Inscripción")}</div>
                    <div className="text-[10px] text-slate-400 tabular-nums">Total: {fmtCOP(p.target_total)}</div>
                    {p.reference && <div className="text-[10px] text-slate-400">Ref: {p.reference}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-display font-black text-blue-700 tabular-nums">{fmtCOP(p.amount)}</td>
                  <td className="px-4 py-2 text-xs">{METHOD_LABEL[p.method] || p.method}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{formatDate(p.payment_date || p.created_at)}</td>
                  <td className="px-4 py-2 text-xs">
                    {p.receipt_url ? (
                      <a href={fileSrc(p.receipt_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold uppercase tracking-wide" data-testid={`admin-pay-view-${p.id}`}>
                        {isPdf ? <FileText size={12}/> : <ImageIcon size={12}/>} Ver <ExternalLink size={10}/>
                      </a>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => { setReview(p); setAdminNote(p.admin_note || ""); }}
                      className="fsc-btn-primary px-3 py-1.5 rounded-md text-xs"
                      data-testid={`admin-pay-review-${p.id}`}
                    >Revisar</button>
                    <ConfirmDeleteDialog
                      trigger={
                        <button
                          className="ml-1 text-fsc-rojo hover:bg-red-50 p-1.5 rounded inline-flex align-middle"
                          title="Eliminar abono"
                          data-testid={`admin-pay-delete-${p.id}`}
                        >
                          <Trash2 size={14}/>
                        </button>
                      }
                      title="Eliminar abono"
                      description={
                        <span>
                          Se eliminará el abono de <strong>{fmtCOP(p.amount)}</strong> de{" "}
                          <strong>{p.user_name || p.user_email}</strong>
                          {p.target_label ? <> ({p.target_label})</> : null}.
                          La cotización <em>no</em> se modifica. Esta acción no se puede deshacer.
                        </span>
                      }
                      onConfirm={() => deletePayment(p.id)}
                      testIdPrefix={`admin-pay-delete-modal-${p.id}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="payments" />

      {review && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-testid="payment-review-modal" onClick={() => setReview(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Revisar abono</div>
                <h2 className="font-display text-3xl font-black uppercase tracking-tight mt-1">{fmtCOP(review.amount)}</h2>
                <div className="text-sm text-slate-600 mt-1">{review.target_label}</div>
              </div>
              <PaymentStatusBadge status={review.status} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
              <div><span className="text-xs uppercase tracking-wider text-slate-500">DT</span><div className="font-semibold">{review.user_name}</div><div className="text-xs text-slate-500">{review.user_email}</div></div>
              <div><span className="text-xs uppercase tracking-wider text-slate-500">Método</span><div className="font-semibold">{METHOD_LABEL[review.method] || review.method}</div></div>
              <div><span className="text-xs uppercase tracking-wider text-slate-500">Fecha del pago</span><div className="font-semibold">{formatDate(review.payment_date || review.created_at)}</div></div>
              <div><span className="text-xs uppercase tracking-wider text-slate-500">Referencia</span><div className="font-semibold">{review.reference || "—"}</div></div>
              <div className="sm:col-span-2"><span className="text-xs uppercase tracking-wider text-slate-500">Notas del DT</span><div className="text-sm">{review.notes || "—"}</div></div>
              {review.reviewed_by_email && (
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-md p-2 text-[11px] text-slate-600" data-testid="payment-audit-info">
                  <span className="font-bold uppercase tracking-wide text-slate-500">Última revisión:</span>{" "}
                  {review.reviewed_status || "—"} por <span className="font-semibold">{review.reviewed_by_name || review.reviewed_by_email}</span>
                  {review.reviewed_at && <> · {formatDateTime(review.reviewed_at)}</>}
                </div>
              )}
            </div>

            {review.receipt_url && (
              <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 max-h-72 flex items-center justify-center">
                {/\.pdf$/i.test(review.receipt_url) ? (
                  <a href={fileSrc(review.receipt_url)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-6 text-blue-700 hover:underline">
                    <FileText size={48}/>
                    <span className="font-bold uppercase tracking-wide text-xs">Abrir comprobante PDF</span>
                  </a>
                ) : (
                  <img src={fileSrc(review.receipt_url)} alt="Comprobante" className="max-h-72 object-contain" />
                )}
              </div>
            )}

            <label className="block mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nota interna (opcional)</span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder="Motivo de rechazo, observaciones, etc."
                data-testid="payment-admin-note"
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200">
              <button onClick={() => setReview(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900" data-testid="payment-close-btn">Cerrar</button>
              <button onClick={() => updateStatus("rechazado")} disabled={!!savingStatus} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-50" data-testid="payment-reject-btn">
                <XCircle size={14}/> {savingStatus === "rechazado" ? "..." : "Rechazar"}
              </button>
              <button onClick={() => updateStatus("saldo_pendiente")} disabled={!!savingStatus} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50" data-testid="payment-saldo-btn">
                {savingStatus === "saldo_pendiente" ? "..." : "Marcar saldo pendiente"}
              </button>
              <button onClick={() => updateStatus("aprobado")} disabled={!!savingStatus} className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50" data-testid="payment-approve-btn">
                <CheckCircle2 size={14}/> {savingStatus === "aprobado" ? "..." : "Aprobar abono"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
