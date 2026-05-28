import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Mail, Phone, User, Trash2, CheckCircle2, Inbox } from "lucide-react";

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/contact-messages");
      setItems(r.data || []);
    } catch {
      toast.error("Error cargando mensajes");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.put(`/contact-messages/${id}/read`);
      load();
    } catch {
      toast.error("Error");
    }
  };
  const remove = async (id) => {
    if (!window.confirm("¿Eliminar mensaje?")) return;
    try {
      await api.delete(`/contact-messages/${id}`);
      toast.success("Mensaje eliminado");
      load();
    } catch {
      toast.error("Error");
    }
  };

  const unread = items.filter((m) => !m.is_read).length;

  return (
    <div data-testid="admin-messages">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-fsc-negro flex items-center gap-3">
            <Inbox size={32} className="text-fsc-dorado-oscuro"/> BUZÓN DE MENSAJES
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mensajes recibidos desde el formulario público de contacto.
            {unread > 0 && <span className="ml-2 bg-fsc-rojo text-white text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded">{unread} sin leer</span>}
          </p>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Cargando...</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-400" data-testid="messages-empty">
          <Inbox size={48} className="mx-auto mb-4 opacity-30"/>
          <p className="font-display text-2xl uppercase tracking-tight">Sin mensajes aún</p>
          <p className="text-sm mt-2">Los mensajes del formulario de contacto aparecerán aquí.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((m) => (
          <div
            key={m.id}
            className={`bg-white rounded-xl p-5 fsc-card-shadow border-2 ${m.is_read ? "border-slate-200" : "border-fsc-dorado"}`}
            data-testid={`message-${m.id}`}
          >
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xl tracking-wider text-fsc-negro flex items-center gap-2">
                    <User size={16} className="text-fsc-dorado-oscuro"/> {m.name}
                  </span>
                  {!m.is_read && <span className="text-[9px] font-bold uppercase tracking-widest bg-fsc-rojo text-white px-2 py-0.5 rounded">Nuevo</span>}
                </div>
                <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm text-slate-600">
                  <a href={`mailto:${m.email}`} className="flex items-center gap-2 hover:text-fsc-dorado-oscuro"><Mail size={13}/> {m.email}</a>
                  {m.phone && <span className="flex items-center gap-2"><Phone size={13}/> {m.phone}</span>}
                </div>
                <p className="mt-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-400">
                  {new Date(m.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!m.is_read && (
                  <button
                    onClick={() => markRead(m.id)}
                    className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 border-2 border-emerald-700 px-3 py-1.5 rounded flex items-center gap-1"
                    data-testid={`mark-read-${m.id}`}
                  >
                    <CheckCircle2 size={14}/> Marcar leído
                  </button>
                )}
                <button
                  onClick={() => remove(m.id)}
                  className="text-fsc-rojo hover:bg-red-50 p-2 rounded"
                  title="Eliminar"
                  data-testid={`delete-message-${m.id}`}
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
