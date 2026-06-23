import { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";
import ImageUpload from "../../components/ImageUpload";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";
import { validatePlayerBirthVsTeam } from "../../lib/playerValidation";

const EMPTY = { name: "", team_id: "", jersey_number: 1, position: "Portero", birth_date: "", photo_url: "", document_id: "", nickname: "", gender: "", eps: "", comet_number: "", guardian_name: "", guardian_relation: "", guardian_phone: "" };

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [editing, setEditing] = useState(null);
  // Filtros adicionales
  const [filterClub, setFilterClub] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(() => Promise.all([
    api.get("/players"),
    api.get("/teams"),
    api.get("/clubs").catch(() => ({ data: [] })),
  ]).then(([p, t, c]) => { setPlayers(p.data); setTeams(t.data); setClubs(c.data); }), []);
  useEffect(() => { load(); }, [load]);
  const tmap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const cmap = useMemo(() => Object.fromEntries(clubs.map((c) => [c.id, c])), [clubs]);

  const categoriesAvail = useMemo(
    () => Array.from(new Set(teams.map((t) => t.category).filter(Boolean))).sort(),
    [teams]
  );
  const teamsFiltered = useMemo(() => teams.filter((t) =>
    (!filterClub || t.club_id === filterClub) &&
    (!filterCategory || t.category === filterCategory)
  ), [teams, filterClub, filterCategory]);

  // Aplicar filtros previo al searchbar
  const prefiltered = useMemo(() => players.filter((p) => {
    const t = tmap[p.team_id];
    if (filterClub && (!t || t.club_id !== filterClub)) return false;
    if (filterTeam && p.team_id !== filterTeam) return false;
    if (filterCategory && (!t || t.category !== filterCategory)) return false;
    return true;
  }), [players, tmap, filterClub, filterTeam, filterCategory]);

  const matchFn = useCallback((p, q) => {
    const team = tmap[p.team_id];
    const club = team ? cmap[team.club_id] : null;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.position || "").toLowerCase().includes(q) ||
      (p.document_id || "").toLowerCase().includes(q) ||
      String(p.jersey_number || "").includes(q) ||
      (team?.name || "").toLowerCase().includes(q) ||
      (team?.category || "").toLowerCase().includes(q) ||
      (club?.name || "").toLowerCase().includes(q)
    );
  }, [tmap, cmap]);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(prefiltered, matchFn, 15);

  const exportColumns = [
    { key: "jersey_number", label: "Dorsal" },
    { key: "name", label: "Nombre" },
    { key: "nickname", label: "Alias" },
    { key: "club_name", label: "Club", accessor: (p) => cmap[tmap[p.team_id]?.club_id]?.name || "" },
    { key: "team_name", label: "Equipo", accessor: (p) => tmap[p.team_id]?.name || "" },
    { key: "team_category", label: "Categoría", accessor: (p) => tmap[p.team_id]?.category || "" },
    { key: "position", label: "Posición" },
    { key: "birth_date", label: "Fecha nacimiento" },
    { key: "document_id", label: "Documento" },
    { key: "gender", label: "Género" },
    { key: "eps", label: "EPS" },
    { key: "comet_number", label: "Número COMET" },
    { key: "guardian_name", label: "Acudiente" },
    { key: "guardian_relation", label: "Parentesco" },
    { key: "guardian_phone", label: "Tel. acudiente" },
    { key: "status", label: "Estado" },
  ];

  const save = async (e) => {
    e.preventDefault();
    const targetTeam = teams.find((t) => t.id === editing.team_id);
    const ageErr = validatePlayerBirthVsTeam(editing.birth_date, targetTeam);
    if (ageErr) { toast.error(ageErr); return; }
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

      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2" data-testid="players-filters-bar">
        <select value={filterClub} onChange={(e) => { setFilterClub(e.target.value); setFilterTeam(""); }} className="px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="players-filter-club">
          <option value="">Todos los clubes</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterTeam(""); }} className="px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="players-filter-category">
          <option value="">Todas las categorías</option>
          {categoriesAvail.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="players-filter-team">
          <option value="">Todos los equipos</option>
          {teamsFiltered.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.category}</option>)}
        </select>
      </div>

      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, dorsal, documento, posición, equipo o club..."
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="players"
          />
        </div>
        {(filterClub || filterTeam || filterCategory) && (
          <button onClick={() => { setFilterClub(""); setFilterTeam(""); setFilterCategory(""); }} className="px-3 py-2 border-2 border-slate-200 rounded-md text-xs font-bold uppercase tracking-wide hover:bg-slate-50" data-testid="players-filters-clear">Limpiar filtros</button>
        )}
        <ExportCsvButton rows={filtered} columns={exportColumns} filename="jugadores" testId="players-export-csv" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 w-12">#</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Club</th>
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
                <td className="px-4 py-2">{cmap[tmap[p.team_id]?.club_id]?.name || "—"}</td>
                <td className="px-4 py-2">{tmap[p.team_id]?.name || "—"} <span className="text-slate-400 text-xs">{tmap[p.team_id]?.category || ""}</span></td>
                <td className="px-4 py-2">{p.position}</td>
                <td className="px-4 py-2">{p.birth_date}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing({ ...p })} className="text-blue-700" data-testid={`edit-player-${p.id}`}><Pencil size={16}/></button>
                  <button onClick={() => remove(p.id)} className="text-red-600" data-testid={`delete-player-${p.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">{players.length === 0 ? "Sin jugadores" : "Sin resultados"}</td></tr>}
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="EPS" value={editing.eps} onChange={(v) => setEditing({ ...editing, eps: v })} testId="admin-player-eps-input" />
              <Field label="Número COMET" value={editing.comet_number} onChange={(v) => setEditing({ ...editing, comet_number: v })} testId="admin-player-comet-input" />
            </div>
            <ImageUpload value={editing.photo_url} onChange={(v) => setEditing({ ...editing, photo_url: v })} label="Foto del jugador (para el carnet)" testId="admin-player-photo" />

            <div className="border-t border-slate-200 pt-3 mt-3">
              <h4 className="font-display text-base font-black uppercase tracking-tight mb-2">Acudiente / Contacto</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre acudiente" value={editing.guardian_name} onChange={(v) => setEditing({ ...editing, guardian_name: v })} testId="admin-player-guardian-name-input" />
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
