import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";
import CategorySelect from "../components/CategorySelect";

const EMPTY_PLAYER = { name: "", team_id: "", jersey_number: 1, position: "Mediocampista", birth_date: "", photo_url: "", document_id: "", nickname: "", gender: "", eps: "", guardian_name: "", guardian_doc: "", guardian_relation: "", guardian_phone: "" };

export default function MyTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);

  const teamId = user?.team_id;

  const loadTeam = async () => {
    if (!teamId) return;
    const t = await api.get(`/teams/${teamId}`);
    setTeam(t.data);
    setTeamForm(t.data);
    const p = await api.get(`/players?team_id=${teamId}`);
    setPlayers(p.data);
  };

  useEffect(() => { loadTeam(); /* eslint-disable-next-line */ }, [teamId]);

  if (!user) return null;
  if (user.role !== "team" || !teamId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-black uppercase">No autorizado</h1>
        <p className="text-slate-500 mt-2">Solo los responsables de equipo pueden acceder aquí.</p>
      </div>
    );
  }

  if (!team) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  const saveTeam = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/teams/${teamId}`, teamForm);
      toast.success("Equipo actualizado");
      setEditingTeam(false);
      loadTeam();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const savePlayer = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editingPlayer, team_id: teamId, jersey_number: Number(editingPlayer.jersey_number) };
      if (editingPlayer.id) await api.put(`/players/${editingPlayer.id}`, payload);
      else await api.post("/players", payload);
      toast.success("Guardado");
      setEditingPlayer(null);
      loadTeam();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const removePlayer = async (id) => {
    if (!window.confirm("¿Eliminar jugador?")) return;
    await api.delete(`/players/${id}`);
    loadTeam();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="my-team-page">
      <Toaster position="top-right" />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-6">
        <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-4xl font-display font-black overflow-hidden" style={{ background: team.color || "#1d4ed8", color: "#fff" }}>
          {team.logo_url ? <img src={team.logo_url.startsWith("/api/") ? `${process.env.REACT_APP_BACKEND_URL}${team.logo_url}` : team.logo_url} alt={team.name} className="h-full w-full object-contain p-1" /> : team.name[0]}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{team.category}</div>
          <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter">{team.name}</h1>
          <div className="text-sm text-slate-600">{team.city || "—"} {team.coach && `· DT: ${team.coach}`}</div>
        </div>
        <button onClick={() => setEditingTeam(true)} className="fsc-btn-primary px-4 py-2 rounded-md text-sm" data-testid="edit-team-btn">Editar equipo</button>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight">Plantilla ({players.length})</h2>
          <button onClick={() => setEditingPlayer({ ...EMPTY_PLAYER, team_id: teamId })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-player-btn">
            <Plus size={16}/> Agregar jugador
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Aún no has agregado jugadores.</p>}
          {players.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3" data-testid={`my-team-player-${p.id}`}>
              {p.photo_url ? <img src={p.photo_url.startsWith("/api/") ? `${process.env.REACT_APP_BACKEND_URL}${p.photo_url}` : p.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{p.name[0]}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-black text-blue-700">#{p.jersey_number}</span>
                  <span className="font-semibold truncate">{p.name}</span>
                  <StatusPill status={p.status} />
                </div>
                <div className="text-xs text-slate-500">{p.position}</div>
              </div>
              <button onClick={() => setEditingPlayer({ ...p })} className="text-blue-700"><Pencil size={16}/></button>
              <button onClick={() => removePlayer(p.id)} className="text-red-600"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      </div>

      {editingTeam && (
        <Modal title="Editar equipo" onClose={() => setEditingTeam(false)}>
          <form onSubmit={saveTeam} className="space-y-3">
            <Field label="Nombre" required value={teamForm.name} onChange={(v) => setTeamForm({ ...teamForm, name: v })} />
            <CategorySelect required value={teamForm.category} onChange={(v) => setTeamForm({ ...teamForm, category: v })} />
            <Field label="DT" value={teamForm.coach} onChange={(v) => setTeamForm({ ...teamForm, coach: v })} />
            <Field label="Ciudad" value={teamForm.city} onChange={(v) => setTeamForm({ ...teamForm, city: v })} />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Color</span>
              <input type="color" value={teamForm.color || "#1d4ed8"} onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })} className="mt-1 w-full h-10 px-1 border border-slate-200 rounded-md" />
            </label>
            <ImageUpload value={teamForm.logo_url} onChange={(v) => setTeamForm({ ...teamForm, logo_url: v })} label="Escudo" testId="my-team-logo" />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-team-btn">Guardar</button>
          </form>
        </Modal>
      )}

      {editingPlayer && (
        <Modal title={editingPlayer.id ? "Editar jugador" : "Nuevo jugador"} onClose={() => setEditingPlayer(null)}>
          <form onSubmit={savePlayer} className="space-y-3">
            <Field label="Nombre completo" required value={editingPlayer.name} onChange={(v) => setEditingPlayer({ ...editingPlayer, name: v })} testId="player-name-input" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apodo / Nick name" value={editingPlayer.nickname} onChange={(v) => setEditingPlayer({ ...editingPlayer, nickname: v })} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Género</span>
                <select value={editingPlayer.gender || ""} onChange={(e) => setEditingPlayer({ ...editingPlayer, gender: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                  <option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dorsal" type="number" required value={editingPlayer.jersey_number} onChange={(v) => setEditingPlayer({ ...editingPlayer, jersey_number: v })} testId="player-jersey-input" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Posición</span>
                <select value={editingPlayer.position} onChange={(e) => setEditingPlayer({ ...editingPlayer, position: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                  <option>Portero</option><option>Defensa</option><option>Mediocampista</option><option>Delantero</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha nacimiento" type="date" value={editingPlayer.birth_date} onChange={(v) => setEditingPlayer({ ...editingPlayer, birth_date: v })} />
              <Field label="Documento" value={editingPlayer.document_id} onChange={(v) => setEditingPlayer({ ...editingPlayer, document_id: v })} />
            </div>
            <Field label="EPS" value={editingPlayer.eps} onChange={(v) => setEditingPlayer({ ...editingPlayer, eps: v })} />
            <ImageUpload value={editingPlayer.photo_url} onChange={(v) => setEditingPlayer({ ...editingPlayer, photo_url: v })} label="Foto del jugador (sin fondo)" testId="player-photo-upload" />

            <div className="border-t border-slate-200 pt-3 mt-3">
              <h4 className="font-display text-base font-black uppercase tracking-tight mb-2">Acudiente / Contacto</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre acudiente" value={editingPlayer.guardian_name} onChange={(v) => setEditingPlayer({ ...editingPlayer, guardian_name: v })} />
                <Field label="Documento acudiente" value={editingPlayer.guardian_doc} onChange={(v) => setEditingPlayer({ ...editingPlayer, guardian_doc: v })} />
                <Field label="Parentesco" value={editingPlayer.guardian_relation} onChange={(v) => setEditingPlayer({ ...editingPlayer, guardian_relation: v })} />
                <Field label="Teléfono" value={editingPlayer.guardian_phone} onChange={(v) => setEditingPlayer({ ...editingPlayer, guardian_phone: v })} />
              </div>
            </div>

            <button className="fsc-btn-red w-full py-2 rounded-md" data-testid="save-player-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", testId }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input required={required} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid={testId} />
    </label>
  );
}

function Modal({ children, onClose, title }) {
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

function StatusPill({ status }) {
  if (!status || status === "aprobado") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">Aprobado</span>;
  }
  if (status === "pendiente") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800">Pendiente</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800">Rechazado</span>;
}
