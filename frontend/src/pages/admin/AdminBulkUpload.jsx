import { useRef, useState } from "react";
import api, { API_BASE, formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

const TABS = [
  { key: "teams", label: "Equipos", endpoint: "teams", description: "Carga masiva de clubes/equipos. Incluye categoría, año de nacimiento, grupo, DT, presidente y delegado." },
  { key: "players", label: "Jugadores", endpoint: "players", description: "Carga masiva de jugadores. Vincula cada fila a un equipo por su nombre exacto. Incluye datos del acudiente." },
];

export default function AdminBulkUpload() {
  const [tab, setTab] = useState("teams");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const t = TABS.find((x) => x.key === tab);

  const downloadTemplate = async () => {
    try {
      const res = await api.get(`/import/template/${t.endpoint}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fsc-${t.endpoint}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Plantilla descargada");
    } catch (err) {
      toast.error("Error al descargar plantilla");
    }
  };

  const upload = async (saveIt) => {
    if (!file) { toast.error("Selecciona un archivo"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/import/${t.endpoint}?preview=${!saveIt}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      if (saveIt) toast.success(`Importados ${res.data.ok} registros`);
      else toast.info(`Vista previa: ${res.data.ok} OK / ${res.data.errors.length} con errores`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="admin-bulk-upload">
      <Toaster position="top-right" />
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Carga masiva</h1>
      <p className="text-sm text-slate-500 mt-1">Importa equipos y jugadores desde CSV o Excel (.xlsx). Útil para migrar tu fixture histórico.</p>

      <div className="flex gap-2 border-b border-slate-200 mt-6 mb-6">
        {TABS.map((tt) => (
          <button
            key={tt.key}
            onClick={() => { setTab(tt.key); setResult(null); setFile(null); }}
            className={`px-5 py-3 text-sm font-bold uppercase tracking-wide -mb-px border-b-2 ${tab === tt.key ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600"}`}
            data-testid={`bulk-tab-${tt.key}`}
          >
            {tt.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-blue-700" /> Paso 1 · Plantilla
            </h3>
            <p className="text-sm text-slate-500 mt-1">{t.description}</p>
          </div>
          <button onClick={downloadTemplate} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="download-template-btn">
            <Download size={16}/> Descargar plantilla CSV
          </button>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Upload className="text-red-600" /> Paso 2 · Archivo
            </h3>
            <p className="text-sm text-slate-500 mt-1">Selecciona el archivo .csv o .xlsx con los datos completos.</p>
            <button onClick={() => inputRef.current?.click()} className="mt-3 px-4 py-3 w-full border-2 border-dashed border-slate-300 rounded-md hover:border-blue-700 hover:bg-blue-50 transition-colors text-sm font-bold uppercase tracking-wide text-slate-700" data-testid="file-pick-btn">
              {file ? file.name : "Click para elegir archivo"}
            </button>
            <input ref={inputRef} type="file" accept=".csv,.xlsx" hidden onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} data-testid="bulk-file-input" />
          </div>

          {file && (
            <div className="border-t border-slate-200 pt-4 flex gap-2">
              <button onClick={() => upload(false)} disabled={loading} className="flex-1 fsc-btn-primary py-2 rounded-md text-sm disabled:opacity-50" data-testid="bulk-preview-btn">
                {loading ? "..." : "Vista previa"}
              </button>
              {result && !result.saved && result.ok > 0 && (
                <button onClick={() => upload(true)} disabled={loading} className="flex-1 fsc-btn-red py-2 rounded-md text-sm disabled:opacity-50" data-testid="bulk-save-btn">
                  Confirmar e importar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-6 fsc-stripe-blue">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight">Resultado</h3>
          {!result ? (
            <p className="text-sm text-slate-400 mt-4">Carga un archivo y obten una vista previa para validar.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Filas" value={result.total_rows} />
                <Stat label="OK" value={result.ok} color="text-green-400" />
                <Stat label="Errores" value={result.errors.length} color={result.errors.length ? "text-red-400" : "text-slate-400"} />
              </div>

              {result.saved && (
                <div className="px-3 py-2 bg-green-500/20 text-green-300 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16}/> Datos importados al sistema
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1">
                    <AlertTriangle size={14}/> Errores
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                    {result.errors.map((er, i) => (
                      <div key={i} className="bg-white/5 rounded px-2 py-1">
                        <span className="text-red-300 font-bold">Fila {er.row}:</span> <span className="text-slate-200">{er.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.created?.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <div className="text-xs uppercase tracking-widest text-green-400 mb-2">Creados</div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                    {result.created.map((c) => (
                      <div key={c.id} className="bg-white/5 rounded px-2 py-1">
                        {c.name} {c.category && <span className="text-slate-400">· {c.category}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }) {
  return (
    <div className="bg-white/5 rounded-md p-3 text-center">
      <div className={`font-display text-3xl font-black ${color} leading-none`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{label}</div>
    </div>
  );
}
