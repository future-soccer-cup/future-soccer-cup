import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";
import ImageUpload from "../../components/ImageUpload";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";

const EMPTY = { name: "", team_id: "", jersey_number: 1, position: "Mediocampista", birth_date: "", photo_url: "", document_id: "", nickname: "", gender: "", eps: "", guardian_name: "", guardian_doc: "", guardian_relation: "", guardian_phone: "" };

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => { setPlayers(p.data); setTeams(t.data); }), []);
  useEffect(() => { load(); }, [load]);
  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const matchFn = useCallback((p, q) => {
    const team = tmap[p.team_id];
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.position || "").toLowerCase().includes(q) ||
      (p.document_id || "").toLowerCase().includes(q) ||
      String(p.jersey_number || "").includes(q) ||
      (team?.name || "").toLowerCase().includes(q) ||
      (team?.category || "").toLowerCase().includes(q)
    );
  }, [tmap]);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(players, matchFn, 15);

  const exportColumns = [
    { key: "jersey_number", label: "Dorsal" },
    { key: "name", label: "Nombre" },
    { key: "nickname", label: "Alias" },
    { key: "team_name", label: "Equipo", accessor: (p) => tmap[p.team_id]?.name || "" },
    { key: "team_category", label: "Categoría", accessor: (p) => tmap[p.team_id]?.category || "" },
    { key: "position", label: "Posición" },
    { key: "birth_date", label: "Fecha nacimiento" },
    { key: "document_id", label: "Documento" },
    { key: "gender", label: "Género" },
    { key: "eps", label: "EPS" },
    { key: "guardian_name", label: "Acudiente" },
    { key: "guardian_doc", label: "Doc. acudiente" },
    { key: "guardian_relation", label: "Parentesco" },
    { key: "guardian_phone", label: "Tel. acudiente" },
    { key: "status", label: "Estado" },
  ];

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
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter shrink-0">Jugadores</h1>
        <button onClick={() => setEditing({ ...EMPTY, team_id: teams[0]?.id || "" })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2 shrink-0" data-testid="add-player-btn"><Plus size={16}/> Nuevo</button>
      </div>

      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, dorsal, documento, posición o equipo..."
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="players"
          />
        </div>
        <ExportCsvButton rows={filtered} columns={exportColumns} filename="jugadores" testId="players-export-csv" />
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
            {pageItems.map((p) => (
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
            {pageItems.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-slate-400">{players.length === 0 ? "Sin jugadores" : "Sin resultados"}</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="players" />

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar jugador" : "Nuevo jugador"}>
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo *</span>
              <select required value={editing.team_id} onChange={(e) => setEditing({ ...editing, team_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="admin-player-team-select">
                <option value="">Seleccionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </label>
            <Field label="Nombre completo" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} testId="admin-player-name-input" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apodo / Nick name" value={editing.nickname} onChange={(v) => setEditing({ ...editing, nickname: v })} testId="admin-player-nickname-input" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Género</span>
                <select value={editing.gender || ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="admin-player-gender-select">
                  <option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dorsal" type="number" required value={editing.jersey_number} onChange={(v) => setEditing({ ...editing, jersey_number: v })} testId="admin-player-jersey-input" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Posición</span>
                <select value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="admin-player-position-select">
                  <option>Portero</option>
                  <option>Defensa central</option>
                  <option>Lateral derecho</option>
                  <option>Lateral izquierdo</option>
                  <option>Carrilero derecho</option>
                  <option>Carrilero izquierdo</option>
                  <option>Mediocampista defensivo</option>
                  <option>Mediocampista central</option>
                  <option>Mediocampista mixto</option>
                  <option>Mediocampista ofensivo</option>
                  <option>Volante por derecha</option>
                  <option>Volante por izquierda</option>
                  <option>Extremo derecho</option>
                  <option>Extremo izquierdo</option>
                  <option>Mediapunta / Enganche</option>
                  <option>Segundo delantero</option>
                  <option>Delantero centro</option>
                  <option>Delantero</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha nacimiento" type="date" value={editing.birth_date} onChange={(v) => setEditing({ ...editing, birth_date: v })} testId="admin-player-birthdate-input" />
              <Field label="Documento de identidad" value={editing.document_id} onChange={(v) => setEditing({ ...editing, document_id: v })} testId="admin-player-doc-input" />
            </div>
            <Field label="EPS" value={editing.eps} onChange={(v) => setEditing({ ...editing, eps: v })} testId="admin-player-eps-input" />
            <ImageUpload value={editing.photo_url} onChange={(v) => setEditing({ ...editing, photo_url: v })} label="Foto del jugador (para el carnet)" testId="admin-player-photo" />

            <div className="border-t border-slate-200 pt-3 mt-3">
              <h4 className="font-display text-base font-black uppercase tracking-tight mb-2">Acudiente / Contacto</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre acudiente" value={editing.guardian_name} onChange={(v) => setEditing({ ...editing, guardian_name: v })} testId="admin-player-guardian-name-input" />
                <Field label="Documento acudiente" value={editing.guardian_doc} onChange={(v) => setEditing({ ...editing, guardian_doc: v })} testId="admin-player-guardian-doc-input" />
                <Field label="Parentesco" value={editing.guardian_relation} onChange={(v) => setEditing({ ...editing, guardian_relation: v })} testId="admin-player-guardian-relation-input" />
                <Field label="Teléfono de contacto" value={editing.guardian_phone} onChange={(v) => setEditing({ ...editing, guardian_phone: v })} testId="admin-player-guardian-phone-input" />
              </div>
            </div>

            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-player-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
