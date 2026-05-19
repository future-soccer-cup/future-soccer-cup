import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Copy, KeyRound, Loader2, X } from "lucide-react";

export default function AdminPasswordResets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/password-resets");
      setItems(r.data);
    } catch (e) {
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    toast.success("Código copiado");
    setTimeout(() => setCopied(null), 1500);
  };

  const cancel = async (id) => {
    if (!window.confirm("¿Cancelar este código?")) return;
    try {
      await api.post(`/admin/password-resets/${id}/cancel`);
      toast.success("Código cancelado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const fmtDate = (iso) => new Date(iso).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div data-testid="admin-password-resets">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Recuperación de contraseñas</h1>
          <p className="text-sm text-slate-500 mt-1">Códigos pendientes solicitados por los usuarios. Entrégalos por WhatsApp o teléfono.</p>
        </div>
        <button onClick={load} className="px-4 py-2 border-2 border-slate-200 rounded-md text-xs font-bold uppercase tracking-wider hover:border-blue-700 hover:text-blue-700">Refrescar</button>
      </div>

      {loading && <div className="flex items-center gap-2 text-slate-500"><Loader2 size={16} className="animate-spin"/> Cargando...</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl" data-testid="no-resets">
          <KeyRound size={40} className="mx-auto text-slate-300"/>
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500 mt-3">Sin solicitudes pendientes</p>
          <p className="text-sm text-slate-400 mt-1">Cuando un usuario use "Olvidé mi contraseña" aparecerá aquí.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-5 grid md:grid-cols-12 gap-4 items-center" data-testid={`reset-${it.id}`}>
            <div className="md:col-span-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">Usuario</div>
              <div className="font-display text-lg font-black uppercase tracking-tight truncate">{it.user_name || "—"}</div>
              <div className="text-xs text-slate-500 truncate">{it.email}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-xs uppercase tracking-widest text-slate-500">Código</div>
              <button onClick={() => copy(it.code, it.id)} className="mt-1 group flex items-center gap-2 font-display text-2xl font-black tabular-nums tracking-[0.2em] text-red-600 hover:text-red-700" data-testid={`reset-code-${it.id}`}>
                {it.code}
                {copied === it.id ? <span className="text-xs font-bold tracking-normal text-green-600">¡Copiado!</span> : <Copy size={14} className="text-slate-400 group-hover:text-slate-700"/>}
              </button>
            </div>
            <div className="md:col-span-3 text-xs text-slate-500">
              <div className="font-bold uppercase tracking-widest">Solicitado</div>
              {fmtDate(it.created_at)}
              <div className="font-bold uppercase tracking-widest mt-1">Vence</div>
              {fmtDate(it.expires_at)}
            </div>
            <div className="md:col-span-2 text-right">
              <button onClick={() => cancel(it.id)} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 ml-auto" data-testid={`cancel-${it.id}`}>
                <X size={14}/> Cancelar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
