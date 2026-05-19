import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";

const STATUSES = ["pendiente", "aprobada", "rechazada", "pagada"];

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(() => api.get("/quotes").then((r) => setQuotes(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/quotes/${id}/status?status=${status}`);
      toast.success("Estado actualizado");
      load();
    } catch (err) {
      toast.error("Error");
    }
  };

  const filteredByStatus = filter ? quotes.filter((q) => q.status === filter) : quotes;

  const matchFn = useCallback((q, term) =>
    (q.user_name || "").toLowerCase().includes(term) ||
    (q.user_email || "").toLowerCase().includes(term) ||
    (q.event_name || "").toLowerCase().includes(term) ||
    (q.category || "").toLowerCase().includes(term) ||
    (q.lodging_name || "").toLowerCase().includes(term)
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(filteredByStatus, matchFn, 15);

  const exportColumns = [
    { key: "user_name", label: "Cliente" },
    { key: "user_email", label: "Email" },
    { key: "event_name", label: "Evento" },
    { key: "category", label: "Categoría" },
    { key: "lodging_name", label: "Hospedaje" },
    { key: "lodging_tier", label: "Paquete", accessor: (q) => q.lodging_name || q.lodging_tier },
    { key: "pax", label: "Pax" },
    { key: "nights", label: "Noches" },
    { key: "total_amount", label: "Total (COP)" },
    { key: "amount_paid", label: "Pagado (COP)" },
    { key: "amount_balance", label: "Saldo (COP)" },
    { key: "status", label: "Estado" },
    { key: "payment_status", label: "Estado pago" },
    { key: "created_at", label: "Fecha", accessor: (q) => q.created_at ? new Date(q.created_at).toISOString().slice(0,10) : "" },
  ];

  return (
    <div data-testid="admin-quotes">
      <Toaster position="top-right" />
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Cotizaciones</h1>
      <p className="text-sm text-slate-500 mt-1">Solicitudes de cotización generadas por equipos y familias.</p>

      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        <button onClick={() => setFilter("")} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${!filter ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"}`} data-testid="quote-filter-all">Todas</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${filter === s ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`} data-testid={`quote-filter-${s}`}>{s}</button>
        ))}
        <div className="ml-auto w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por cliente, evento, categoría o hospedaje..."
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="quotes"
          />
        </div>
        <ExportCsvButton rows={filtered} columns={exportColumns} filename="cotizaciones" testId="quotes-export-csv" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2">Evento</th>
              <th className="text-left px-4 py-2">Cat.</th>
              <th className="text-left px-4 py-2">Hospedaje</th>
              <th className="text-left px-4 py-2">Pax × N</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && <tr><td colSpan="9" className="text-center py-12 text-slate-400">{quotes.length === 0 ? "Sin cotizaciones" : "Sin resultados"}</td></tr>}
            {pageItems.map((q) => (
              <tr key={q.id} className="border-t border-slate-100" data-testid={`admin-quote-${q.id}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{q.user_name}</div>
                  <div className="text-xs text-slate-500">{q.user_email}</div>
                </td>
                <td className="px-4 py-2">{q.event_name}</td>
                <td className="px-4 py-2">{q.category}</td>
                <td className="px-4 py-2">{q.lodging_name}</td>
                <td className="px-4 py-2">{q.pax} × {q.nights}</td>
                <td className="px-4 py-2 text-right font-display font-black text-blue-700 tabular-nums">${Number(q.total_amount || 0).toLocaleString("es-CO")}<span className="text-[9px] text-slate-400 font-bold ml-1">COP</span></td>
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(q.created_at).toLocaleDateString("es")}</td>
                <td className="px-4 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider">{q.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <select value={q.status} onChange={(e) => setStatus(q.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded" data-testid={`quote-status-${q.id}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="quotes" />
    </div>
  );
}
