import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";

const EMPTY = { name: "", team_id: "", jersey_number: 1, position: "Mediocampista", birth_date: "", photo_url: "", document_id: "" };

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => { setPlayers(p.data); setTeams(t.data); });
  useEffect(() => { load(); }, []);
  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editing, jersey_number: Number(editing.jersey_number) };
      if (editing.id) {
        await api.put(`/players/${editing.id}`, payload);
      } else {
        await api.post("/players", payload);
      }
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar jugador?")) return;
    await api.delete(`/players/${id}`);
    toast.success("Eliminado");
    load();
  };

  return (
    <div data-testid="admin-players">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Jugadores</h1>
        <button onClick={() => setEditing({ ...EMPTY, team_id: teams[0]?.id || "" })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-player-btn"><Plus size={16}/> Nuevo</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 w-12">#</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Equipo</th>
              <th className="text-left px-4 py-2">Posición</th>
              <th className="text-left px-4 py-2">Nacimiento</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t border-slate-100" data-testid={`player-row-${p.id}`}>
                <td className="px-4 py-2 font-display font-black text-blue-700">#{p.jersey_number}</td>
                <td className="px-4 py-2 font-semibold">{p.name}</td>
                <td className="px-4 py-2">{tmap[p.team_id]?.name || "—"}</td>
                <td className="px-4 py-2">{p.position}</td>
                <td className="px-4 py-2">{p.birth_date}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing({ ...p })} className="text-blue-700"><Pencil size={16}/></button>
                  <button onClick={() => remove(p.id)} className="text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {players.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-400">Sin jugadores</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar jugador" : "Nuevo jugador"}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo</span>
              <select required value={editing.team_id} onChange={(e) => setEditing({ ...editing, team_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                <option value="">Seleccionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dorsal" type="number" required value={editing.jersey_number} onChange={(v) => setEditing({ ...editing, jersey_number: v })} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Posición</span>
                <select value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                  <option>Portero</option><option>Defensa</option><option>Mediocampista</option><option>Delantero</option>
                </select>
              </label>
            </div>
            <Field label="Fecha nacimiento" type="date" value={editing.birth_date} onChange={(v) => setEditing({ ...editing, birth_date: v })} />
            <Field label="Foto URL" value={editing.photo_url} onChange={(v) => setEditing({ ...editing, photo_url: v })} />
            <Field label="Documento" value={editing.document_id} onChange={(v) => setEditing({ ...editing, document_id: v })} />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-player-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
