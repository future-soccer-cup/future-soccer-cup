import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";
import { Eye, X } from "lucide-react";

const STATUSES = ["pendiente", "aprobada", "rechazada", "pagada"];
const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState(null);

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
                <td className="px-4 py-2 text-right space-x-1">
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.get(`/quotes/${q.id}`);
                        setDetail(r.data);
                      } catch {
                        toast.error("Error al cargar detalle");
                      }
                    }}
                    className="text-fsc-dorado-oscuro hover:text-fsc-dorado p-1"
                    title="Ver detalle completo"
                    data-testid={`view-quote-${q.id}`}
                  >
                    <Eye size={16}/>
                  </button>
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

      {detail && <QuoteDetailModal q={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function QuoteDetailModal({ q, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="quote-detail-modal">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-fsc-dorado" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-fsc-negro text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-cursive text-xl text-fsc-dorado">cotización</div>
            <div className="font-display text-2xl tracking-wider">{q.user_name} · {q.lodging_name}</div>
            <div className="text-xs text-fsc-gris mt-0.5">{q.user_email} · {new Date(q.created_at).toLocaleString("es-CO")}</div>
          </div>
          <button onClick={onClose} className="text-white hover:text-fsc-dorado" data-testid="quote-detail-close"><X size={22}/></button>
        </div>
        <div className="p-6 space-y-5 text-sm">
          <DetailGrid items={[
            ["Estado", q.status],
            ["Evento", q.event_name],
            ["Categoría", q.category],
            ["Año nac.", q.birth_year],
            ["PAX base", q.pax],
            ["Noches", q.nights],
            ["Hospedaje", q.lodging_name],
            ["Teléfono contacto", q.contact_phone || "—"],
          ]} />

          <DetailSection title="Resumen económico">
            <div className="grid grid-cols-2 gap-2">
              <KV k="Tarifa por persona" v={fmt(q.rate_per_person_total)} />
              <KV k="Hospedaje subtotal" v={fmt(q.lodging_subtotal)} />
              <KV k="Personas adicionales" v={fmt(q.extra_pax_subtotal || 0)} />
              <KV k="Alimentación" v={fmt((q.breakfast_subtotal || 0) + (q.lunch_subtotal || 0) + (q.dinner_subtotal || 0))} />
              <KV k="Transporte" v={fmt(q.transport_subtotal)} />
              <KV k="Tours" v={fmt(q.tours_subtotal)} />
              <KV k="Inscripción" v={fmt(q.registration_fee)} />
              <KV k="TOTAL" v={fmt(q.total_amount)} highlight />
            </div>
          </DetailSection>

          {q.extra_pax_breakdown?.length > 0 && (
            <DetailSection title={`Personas adicionales (${q.extra_pax_breakdown.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Etiqueta</th><th>Cantidad</th><th>Noches</th><th className="text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {q.extra_pax_breakdown.map((ep, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{ep.label || "—"}</td><td>{ep.pax}</td><td>{ep.nights}</td>
                      <td className="text-right tabular-nums">{fmt(ep.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          {q.meal_entries?.length > 0 && (
            <DetailSection title={`Alimentación adicional (${q.meal_entries.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Fecha</th><th>Comida</th><th className="text-right">Personas</th>
                </tr></thead>
                <tbody>
                  {q.meal_entries.map((m, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{m.date || "—"}</td><td>{m.meal_type || "—"}</td><td className="text-right">{m.pax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          {q.transport_entries_breakdown?.length > 0 ? (
            <DetailSection title={`Transporte (${q.transport_entries_breakdown.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Ruta</th><th>Personas</th><th>Fecha</th><th className="text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {q.transport_entries_breakdown.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{t.route_id}</td><td>{t.pax}</td><td>{t.date || "—"}</td>
                      <td className="text-right tabular-nums">{fmt(t.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          ) : q.transport_routes_applied?.length > 0 && (
            <DetailSection title="Transporte (rutas)">
              <ul className="text-xs">{q.transport_routes_applied.map((r) => <li key={r}>· {r}</li>)}</ul>
            </DetailSection>
          )}

          {q.tour_entries?.length > 0 && (
            <DetailSection title={`Tours (${q.tour_entries.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Tour</th><th className="text-right">Personas</th>
                </tr></thead>
                <tbody>
                  {q.tour_entries.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{t.tour_id}</td><td className="text-right">{t.pax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          {q.notes && (
            <DetailSection title="Notas">
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{q.notes}</p>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div className="grid sm:grid-cols-4 gap-3">
      {items.map(([k, v]) => (
        <div key={k} className="border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{k}</div>
          <div className="text-sm font-semibold">{v || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="font-display text-lg tracking-wider text-fsc-negro mb-2">{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function KV({ k, v, highlight }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-1 ${highlight ? "font-bold text-fsc-rojo border-fsc-dorado pt-2 mt-2 border-t-2" : ""}`}>
      <span>{k}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}
