import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";
import CategorySelect from "../../components/CategorySelect";

const EMPTY = { name: "", category: "Sub-12", coach: "", city: "", logo_url: "", color: "#1d4ed8" };

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/teams").then((r) => setTeams(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.put(`/teams/${editing.id}`, editing);
        toast.success("Equipo actualizado");
      } else {
        await api.post("/teams", editing);
        toast.success("Equipo creado");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar equipo y todos sus jugadores?")) return;
    await api.delete(`/teams/${id}`);
    toast.success("Equipo eliminado");
    load();
  };

  return (
    <div data-testid="admin-teams">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Equipos</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-team-btn"><Plus size={16}/> Nuevo</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-left px-4 py-2">Ciudad</th>
              <th className="text-left px-4 py-2">DT</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-t border-slate-100" data-testid={`team-row-${t.id}`}>
                <td className="px-4 py-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-display font-black text-white" style={{ background: t.color }}>{t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-contain" /> : t.name[0]}</div>
                  <span className="font-semibold">{t.name}</span>
                </td>
                <td className="px-4 py-2">{t.category}</td>
                <td className="px-4 py-2">{t.city || "—"}</td>
                <td className="px-4 py-2">{t.coach || "—"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing({ ...t })} className="text-blue-700" data-testid={`edit-team-${t.id}`}><Pencil size={16}/></button>
                  <button onClick={() => remove(t.id)} className="text-red-600" data-testid={`delete-team-${t.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan="5" className="text-center py-12 text-slate-400">Sin equipos</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar equipo" : "Nuevo equipo"}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <CategorySelect required value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} />
            <Field label="Ciudad" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
            <Field label="DT" value={editing.coach} onChange={(v) => setEditing({ ...editing, coach: v })} />
            <ImageUpload value={editing.logo_url} onChange={(v) => setEditing({ ...editing, logo_url: v })} label="Escudo" testId="team-logo-upload" />
            <Field label="Color (hex)" value={editing.color} onChange={(v) => setEditing({ ...editing, color: v })} />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-team-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Field({ label, value, onChange, required, type = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input required={required} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
    </label>
  );
}

export function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
