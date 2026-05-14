import { Download } from "lucide-react";

/** Escape a single CSV cell value. */
function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string from rows + columns.
 * columns: array of {key, label, accessor?(row)=>value}
 */
export function buildCsv(rows, columns) {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) =>
    columns.map((c) => csvCell(c.accessor ? c.accessor(r) : r[c.key])).join(",")
  ).join("\n");
  // BOM so Excel opens UTF-8 correctly
  return "\uFEFF" + head + "\n" + body;
}

/** Trigger a download for the given CSV string. */
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Button that exports the provided rows (already filtered) to CSV.
 * Disabled when rows is empty.
 */
export default function ExportCsvButton({ rows, columns, filename, label = "Exportar CSV", testId = "export-csv" }) {
  const disabled = !rows || rows.length === 0;
  const handle = () => {
    if (disabled) return;
    const csv = buildCsv(rows, columns);
    downloadCsv(filename, csv);
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      data-testid={testId}
      title={disabled ? "No hay filas para exportar" : `Exportar ${rows.length} fila(s) a CSV`}
    >
      <Download size={14} /> {label} <span className="tabular-nums text-[10px] opacity-80">({rows.length})</span>
    </button>
  );
}
