import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";
import { formatDate, formatDateTime } from "../../lib/dateFormat";
import CurrencyInput from "../../components/CurrencyInput";
import { Eye, X, Download } from "lucide-react";

const STATUSES = ["pendiente", "aprobada", "rechazada", "pagada"];
const fmtMoney = (n, cur) => cur === "USD"
  ? `US$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  : `$${Number(n || 0).toLocaleString("es-CO")} COP`;
const fmt = fmtMoney; // wrapper kept for callers passing only amount (defaults to COP)

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
    (q.club_name || "").toLowerCase().includes(term) ||
    (q.event_name || "").toLowerCase().includes(term) ||
    (q.category || "").toLowerCase().includes(term) ||
    (q.lodging_name || "").toLowerCase().includes(term)
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(filteredByStatus, matchFn, 15);

  const exportColumns = [
    { key: "user_name", label: "Cliente" },
    { key: "user_email", label: "Email" },
    { key: "club_name", label: "Club" },
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
              <th className="text-left px-4 py-2">Club</th>
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
            {pageItems.length === 0 && <tr><td colSpan="10" className="text-center py-12 text-slate-400">{quotes.length === 0 ? "Sin cotizaciones" : "Sin resultados"}</td></tr>}
            {pageItems.map((q) => (
              <tr key={q.id} className="border-t border-slate-100" data-testid={`admin-quote-${q.id}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{q.user_name}</div>
                  <div className="text-xs text-slate-500">{q.user_email}</div>
                </td>
                <td className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-fsc-azul" data-testid={`quote-club-${q.id}`}>
                  {q.club_name || <span className="text-slate-400 italic">—</span>}
                </td>
                <td className="px-4 py-2">{q.event_name}</td>
                <td className="px-4 py-2">{q.category}</td>
                <td className="px-4 py-2">{q.lodging_name}</td>
                <td className="px-4 py-2">{q.pax} × {q.nights}</td>
                <td className="px-4 py-2 text-right font-display font-black text-blue-700 tabular-nums">{q.currency === "USD" ? `US$${Number(q.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${Number(q.total_amount || 0).toLocaleString("es-CO")}`}<span className="text-[9px] text-slate-400 font-bold ml-1">{q.currency || "COP"}</span></td>
                <td className="px-4 py-2 text-xs text-slate-500">{formatDate(q.created_at)}</td>
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
                    className="text-fsc-azul-oscuro hover:text-fsc-azul p-1"
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

      {detail && <QuoteDetailModal q={detail} onClose={() => setDetail(null)} onChanged={async () => {
        const r = await api.get(`/quotes/${detail.id}`);
        setDetail(r.data);
        load();
      }} />}
    </div>
  );
}

function QuoteDetailModal({ q, onClose, onChanged }) {
  const [editingCharges, setEditingCharges] = useState(false);
  const [chargesAmount, setChargesAmount] = useState(q.other_charges_amount || 0);
  const [chargesConcept, setChargesConcept] = useState(q.other_charges_concept || "");
  const [saving, setSaving] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/quotes/${q.id}/pdf`, { responseType: "blob" });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion_${q.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch (err) {
      toast.error("No se pudo generar el PDF: " + (err?.message || "error"));
    }
  };

  const saveCharges = async () => {
    setSaving(true);
    try {
      await api.patch(`/quotes/${q.id}/other-charges`, {
        other_charges_amount: Number(chargesAmount) || 0,
        other_charges_concept: chargesConcept,
      });
      toast.success("Otros cobros actualizados");
      setEditingCharges(false);
      onChanged?.();
    } catch (err) {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="quote-detail-modal">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-fsc-azul" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-fsc-negro text-white px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-cursive text-xl text-fsc-azul">cotización</div>
            <div className="font-display text-2xl tracking-wider truncate">{q.user_name} · {q.lodging_name}</div>
            <div className="text-xs text-fsc-gris mt-0.5 truncate">{q.user_email} · {formatDateTime(q.created_at)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDownloadPDF} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1" data-testid="quote-download-pdf"><Download size={14}/> PDF</button>
            <button onClick={onClose} className="text-white hover:text-fsc-azul" data-testid="quote-detail-close"><X size={22}/></button>
          </div>
        </div>
        <div className="p-6 space-y-5 text-sm">
          <DetailGrid items={[
            ["Estado", q.status],
            ["Cliente", q.user_name],
            ["Club", q.club_name || "—"],
            ["Teléfono contacto", q.contact_phone || "—"],
          ]} />

          <DetailSection title="Resumen económico">
            <div className="grid grid-cols-2 gap-2">
              <KV k="Hospedaje subtotal" v={fmt(q.lodging_subtotal, q.currency)} />
              <KV k="Personas adicionales" v={fmt(q.extra_pax_subtotal || 0, q.currency)} />
              <KV k="Alimentación" v={fmt(q.meals_subtotal || (q.breakfast_subtotal || 0) + (q.lunch_subtotal || 0) + (q.dinner_subtotal || 0), q.currency)} />
              <KV k="Transporte" v={fmt(q.transport_subtotal, q.currency)} />
              <KV k="Tours" v={fmt(q.tours_subtotal, q.currency)} />
              <KV k="Inscripción" v={fmt(q.registration_fee, q.currency)} />
              {(q.other_charges_amount > 0) && !editingCharges && (
                <KV k={`Otros cobros${q.other_charges_concept ? ` (${q.other_charges_concept})` : ""}`} v={fmt(q.other_charges_amount, q.currency)} />
              )}
              <KV k={`TOTAL (${q.currency || "COP"})`} v={fmt(q.total_amount, q.currency)} highlight />
            </div>
          </DetailSection>

          {/* === OTROS COBROS (solo Admin agrega/edita) === */}
          <DetailSection title="Otros cobros">
            {!editingCharges ? (
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">Valor adicional</div>
                  <div className="font-bold text-amber-900 tabular-nums">{fmt(q.other_charges_amount || 0, q.currency)}</div>
                  {q.other_charges_concept && <div className="text-xs text-amber-800/80 italic mt-0.5">{q.other_charges_concept}</div>}
                </div>
                <button onClick={() => setEditingCharges(true)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded" data-testid="add-other-charges-btn">
                  {q.other_charges_amount > 0 ? "Editar" : "Agregar"}
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
                <p className="text-[11px] text-amber-900">
                  Solo afecta este campo. <strong>No recalcula</strong> paquetes, hospedaje ni inscripción.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Valor ({q.currency || "COP"})</span>
                    <CurrencyInput
                      value={chargesAmount}
                      onChange={setChargesAmount}
                      className="w-full"
                      data-testid="other-charges-amount-input"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Concepto</span>
                    <input
                      value={chargesConcept}
                      onChange={(e) => setChargesConcept(e.target.value)}
                      placeholder="Ej: Seguro de viaje, kit del torneo..."
                      className="mt-1 w-full px-3 py-2 border border-amber-200 rounded-md"
                      data-testid="other-charges-concept-input"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEditingCharges(false); setChargesAmount(q.other_charges_amount || 0); setChargesConcept(q.other_charges_concept || ""); }} className="px-3 py-1.5 text-xs font-bold uppercase text-slate-600" disabled={saving}>Cancelar</button>
                  <button onClick={saveCharges} disabled={saving} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50" data-testid="other-charges-save-btn">
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </DetailSection>

          {/* Eventos seleccionados (nuevo modelo array) */}
          {(q.events_breakdown?.length > 0) && (
            <DetailSection title={`Eventos seleccionados (${q.events_breakdown.length})`}>
              <div className="space-y-3">
                {q.events_breakdown.map((ev, i) => (
                  <div key={i} className="border-2 border-fsc-rojo/30 bg-red-50/40 rounded-lg p-3" data-testid={`detail-event-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fsc-rojo">Evento {i + 1} · {ev.event_type || ""}</div>
                        <div className="font-display text-lg font-black uppercase">{ev.tournament_name || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-slate-500">Subtotal</div>
                        <div className="font-bold tabular-nums">{fmt(ev.subtotal, q.currency)}</div>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                        <th className="py-1">Categoría inscrita</th><th className="text-right">Fee</th>
                      </tr></thead>
                      <tbody>
                        {(ev.categories || []).map((c, j) => (
                          <tr key={j} className="border-t border-slate-100">
                            <td className="py-1">{c.name}</td>
                            <td className="text-right tabular-nums">{fmt(c.fee, q.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Paquetes de hospedaje (nuevo modelo array) */}
          {(q.lodgings_breakdown?.length > 0) && (
            <DetailSection title={`Paquetes de hospedaje (${q.lodgings_breakdown.length})`}>
              <div className="space-y-3">
                {q.lodgings_breakdown.map((b, i) => (
                  <div key={i} className="border-2 border-fsc-azul/30 bg-fsc-azul/5 rounded-lg p-3" data-testid={`detail-lodging-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fsc-azul">Paquete {i + 1}</div>
                        <div className="font-display text-lg font-black uppercase">{b.tier_name} · {b.pax} pax</div>
                        {b.tier_description && (
                          <div className="text-[11px] text-slate-600 mt-1 italic">{b.tier_description}</div>
                        )}
                        {(b.tier_accommodation || (Array.isArray(b.tier_includes) && b.tier_includes.length > 0)) && (
                          <div className="text-[11px] mt-1">
                            <span className="font-bold uppercase tracking-wider text-fsc-azul-oscuro">Acomodación:</span>{" "}
                            <span className="text-slate-700">{b.tier_accommodation || (b.tier_includes || []).join(", ")}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-slate-500">Subtotal</div>
                        <div className="font-bold tabular-nums">{fmt(b.subtotal, q.currency)}</div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
                      <KV k="Valor Paquete" v={fmt(b.rate_per_person_5nights, q.currency)} />
                      <KV k="Noche adicional" v={fmt(b.rate_per_person_additional_night, q.currency)} />
                      <KV k="Valor unitario total" v={fmt(b.rate_per_person_total, q.currency)} />
                    </div>
                    {b.free_lodging_units > 0 && (
                      <div className="text-[11px] text-fsc-rojo mt-2">🎉 Promo 21 gratis: {b.free_lodging_units} pax sin costo</div>
                    )}
                    {(b.extra_pax_breakdown || []).length > 0 && (
                      <div className="mt-3 pt-2 border-t border-fsc-azul/20">
                        <div className="text-[10px] uppercase tracking-widest text-fsc-azul-oscuro font-bold mb-1">Personas adicionales</div>
                        <table className="w-full text-xs">
                          <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                            <th className="py-1">Etiqueta</th><th>Cant.</th><th>Noches</th><th>Desde</th><th>Hasta</th><th className="text-right">Subtotal</th>
                          </tr></thead>
                          <tbody>
                            {b.extra_pax_breakdown.map((ep, j) => (
                              <tr key={j} className="border-t border-slate-100">
                                <td className="py-1">{ep.label || "—"}</td>
                                <td>{ep.pax}</td><td>{ep.nights}</td>
                                <td>{ep.date_from || "—"}</td><td>{ep.date_to || "—"}</td>
                                <td className="text-right tabular-nums">{fmt(ep.subtotal, q.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Alimentación (meals_breakdown nuevo) */}
          {(q.meals_breakdown?.length > 0) ? (
            <DetailSection title={`Alimentación adicional (${q.meals_breakdown.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Fecha</th><th>Comida</th><th>Personas</th><th>Valor unitario</th><th className="text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {q.meals_breakdown.map((m, i) => (
                    <tr key={i} className="border-t border-slate-100" data-testid={`detail-meal-${i}`}>
                      <td className="py-1">{m.date || "—"}</td>
                      <td>{m.name || m.meal_type || "—"}</td>
                      <td>{m.pax}</td>
                      <td className="tabular-nums">{fmt(m.unit, q.currency)}</td>
                      <td className="text-right tabular-nums">{fmt(m.subtotal, q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          ) : q.meal_entries?.length > 0 && (
            <DetailSection title={`Alimentación adicional (${q.meal_entries.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Fecha</th><th>Comida</th><th className="text-right">Personas</th>
                </tr></thead>
                <tbody>
                  {q.meal_entries.map((m, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{m.date || "—"}</td><td>{m.meal_type || m.meal_addon_id || "—"}</td><td className="text-right">{m.pax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          {q.transport_entries_breakdown?.length > 0 && (
            <DetailSection title={`Transporte (${q.transport_entries_breakdown.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Ruta</th><th>Personas</th><th>Fecha</th><th className="text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {q.transport_entries_breakdown.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{t.route_name || t.route_id}</td><td>{t.pax}</td><td>{t.date || "—"}</td>
                      <td className="text-right tabular-nums">{fmt(t.subtotal, q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          {q.tour_subtotals?.length > 0 && (
            <DetailSection title={`Tours (${q.tour_subtotals.length})`}>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 uppercase tracking-widest"><tr>
                  <th className="py-1">Tour</th><th>Personas</th><th className="text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {q.tour_subtotals.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1">{t.tour_name || t.tour_id}</td><td>{t.pax}</td>
                      <td className="text-right tabular-nums">{fmt(t.subtotal, q.currency)}</td>
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
    <div className={`flex justify-between border-b border-slate-100 py-1 ${highlight ? "font-bold text-fsc-rojo border-fsc-azul pt-2 mt-2 border-t-2" : ""}`}>
      <span>{k}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}
