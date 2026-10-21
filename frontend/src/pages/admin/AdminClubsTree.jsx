import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { validatePlayerBirthVsTeam } from "../../lib/playerValidation";
import BirthDateField from "../../components/BirthDateField";
import { ChevronDown, ChevronRight, Check, X, Trash2, Plus, Edit3, Users, Mail, Phone, Shield, RefreshCw, Download } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Pagination } from "../../components/PagedTable";
import ImageUpload from "../../components/ImageUpload";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import ExportCsvButton from "../../components/ExportCsvButton";

const POSITIONS = [
  "Portero",
  "Defensa central",
  "Lateral derecho",
  "Lateral izquierdo",
  "Carrilero derecho",
  "Carrilero izquierdo",
  "Mediocampista defensivo",
  "Mediocampista central",
  "Mediocampista mixto",
  "Mediocampista ofensivo",
  "Volante por derecha",
  "Volante por izquierda",
  "Extremo derecho",
  "Extremo izquierdo",
  "Mediapunta / Enganche",
  "Segundo delantero",
  "Delantero centro",
  "Delantero",
];

const STATUS_BADGE = {
  aprobado: "bg-emerald-100 text-emerald-700",
  pendiente: "bg-amber-100 text-amber-700",
  rechazado: "bg-rose-100 text-rose-700",
};

const imgSrc = (u) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base = process.env.REACT_APP_BACKEND_URL || "";
  return `${base}${u}`;
};

export default function AdminClubsTree() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  // Filtro/página persistidos en la URL para no perderlos al recargar. La búsqueda de
  // texto vive en estado LOCAL (responde al instante en cada tecla) y se sincroniza a la
  // URL con un pequeño debounce — escribirla en la URL en cada tecla dispara una
  // navegación de react-router por carácter que, con ~1100 jugadores cargados, se siente
  // como que "no deja escribir".
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const statusFilter = searchParams.get("status") || "";
  // updateParams cambia uno o varios params en una sola llamada — llamar setSearchParams
  // varias veces seguidas en el mismo handler pisa los cambios anteriores porque cada
  // llamada lee la URL todavía no actualizada por la anterior.
  const updateParams = (updates) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    return next;
  }, { replace: true });
  const setStatusFilter = (v) => updateParams({ status: v });
  const firstQueryRun = useRef(true);
  useEffect(() => {
    if (firstQueryRun.current) { firstQueryRun.current = false; return; }
    const t = setTimeout(() => updateParams({ q: query, page: "" }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const [clubUsers, setClubUsers] = useState({}); // {club_id: [users]}
  const [editingPlayer, setEditingPlayer] = useState(null); // {team_id, player|null}
  const [editingTeamName, setEditingTeamName] = useState(null); // {id, name, category, ...}
  const [editingClubName, setEditingClubName] = useState(null); // {id, name}
  const [editingStaff, setEditingStaff] = useState(null); // {team, idx, data}
  const [assigningStaffTeam, setAssigningStaffTeam] = useState(null); // {team, clubUsers}
  const [pendingAssignments, setPendingAssignments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/clubs-tree");
      setClubs(r.data || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando clubes");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadPending = useCallback(async () => {
    try {
      const r = await api.get("/admin/users/pending-club-assignment");
      setPendingAssignments(r.data || []);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.warn("Pending club assignment load failed:", err?.message);
    }
  }, []);
  useEffect(() => { loadPending(); }, [loadPending]);

  const assignClub = async (uid, clubId) => {
    if (!clubId) return toast.error("Selecciona un club");
    try {
      await api.put(`/users/${uid}/assign-club?club_id=${clubId}`);
      toast.success("Club asignado y cuenta aprobada");
      loadPending();
      setClubUsers((cu) => ({ ...cu, [clubId]: undefined }));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error asignando el club");
    }
  };

  const toggle = async (cid) => {
    setExpanded((e) => ({ ...e, [cid]: !e[cid] }));
    if (!clubUsers[cid]) {
      try {
        const r = await api.get(`/admin/clubs/${cid}/users`);
        setClubUsers((cu) => ({ ...cu, [cid]: r.data || [] }));
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.warn(`Club users load failed for ${cid}:`, err?.message);
      }
    }
  };

  const setClubStatus = async (cid, status) => {
    try {
      await api.put(`/clubs/${cid}/status?status=${status}`);
      toast.success(`Club ${status === "aprobado" ? "aprobado" : status === "rechazado" ? "rechazado" : "marcado pendiente"}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error actualizando estado");
    }
  };

  const setUserStatus = async (uid, status, cid) => {
    try {
      await api.put(`/users/${uid}/status?status=${status}`);
      toast.success(`Cuenta ${status === "aprobado" ? "aprobada" : "rechazada"}`);
      // Refresca solo la lista de usuarios de ese club (ya cacheada al expandirlo).
      const r = await api.get(`/admin/clubs/${cid}/users`);
      setClubUsers((cu) => ({ ...cu, [cid]: r.data || [] }));
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error actualizando la cuenta");
    }
  };

  const deleteClub = async (cid) => {
    try {
      const r = await api.delete(`/clubs/${cid}`);
      const d = r.data || {};
      toast.success(`Club eliminado · ${d.teams_deleted || 0} equipo(s), ${d.players_deleted || 0} jugador(es), ${d.quotes_deleted || 0} cotización(es) y ${d.payments_deleted || 0} pago(s) borrados`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error eliminando club");
      throw err;
    }
  };

  const setTeamStatus = async (tid, status) => {
    try {
      await api.put(`/teams/${tid}/status?status=${status}`);
      toast.success(`Equipo ${status}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    }
  };

  const deletePlayer = async (pid) => {
    if (!window.confirm("¿Eliminar jugador?")) return;
    try {
      await api.delete(`/players/${pid}`);
      toast.success("Jugador eliminado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    }
  };

  const deleteStaff = async (team, idx) => {
    if (!window.confirm("¿Eliminar miembro del cuerpo técnico?")) return;
    try {
      const list = (team.cuerpo_tecnico || []).filter((_, i) => i !== idx);
      await api.patch(`/teams/${team.id}/staff`, { cuerpo_tecnico: list });
      toast.success("Eliminado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    }
  };

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    return clubs.filter((c) => {
      if (statusFilter && (c.status || "pendiente") !== statusFilter) return false;
      if (!q) return true;
      return (c.name || "").toLowerCase().includes(q)
        || (c.city || "").toLowerCase().includes(q)
        || (c.country || "").toLowerCase().includes(q);
    });
  }, [clubs, query, statusFilter]);

  // Listado plano club → equipo → jugador para exportar a Excel/CSV (respeta la
  // búsqueda y el filtro de estado ya aplicados sobre los clubes).
  const playerExportRows = useMemo(() => {
    const rows = [];
    for (const c of filtered) {
      for (const t of (c.teams || [])) {
        for (const p of (t.players || [])) {
          rows.push({ club: c, team: t, player: p });
        }
      }
    }
    return rows;
  }, [filtered]);
  const playerExportColumns = [
    { key: "club", label: "Club", accessor: (r) => r.club.name || "" },
    { key: "team", label: "Equipo", accessor: (r) => r.team.name || "" },
    { key: "category", label: "Categoría", accessor: (r) => r.team.category || "" },
    { key: "jersey_number", label: "Dorsal", accessor: (r) => r.player.jersey_number ?? "" },
    { key: "name", label: "Nombre", accessor: (r) => r.player.name || "" },
    { key: "nickname", label: "Apodo", accessor: (r) => r.player.nickname || "" },
    { key: "position", label: "Posición", accessor: (r) => r.player.position || "" },
    { key: "birth_date", label: "Fecha nacimiento", accessor: (r) => r.player.birth_date || "" },
    { key: "document_id", label: "Documento", accessor: (r) => r.player.document_id || "" },
    { key: "gender", label: "Género", accessor: (r) => r.player.gender || "" },
    { key: "eps", label: "EPS", accessor: (r) => r.player.eps || "" },
    { key: "comet_number", label: "Número COMET", accessor: (r) => r.player.comet_number || "" },
    { key: "guardian_name", label: "Acudiente", accessor: (r) => r.player.guardian_name || "" },
    { key: "guardian_relation", label: "Parentesco", accessor: (r) => r.player.guardian_relation || "" },
    { key: "guardian_phone", label: "Tel. acudiente", accessor: (r) => r.player.guardian_phone || "" },
    { key: "status", label: "Estado", accessor: (r) => r.player.status || "" },
  ];

  // Paginación: 10 clubes por página. Página se "clampa" automáticamente al cambiar filtros.
  const page = parseInt(searchParams.get("page"), 10) || 1;
  const setPage = (p) => updateParams({ page: p > 1 ? String(p) : "" });
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setQueryReset = (v) => setQuery(v); // la URL + reset de página los maneja el debounce de arriba
  const setStatusFilterReset = (v) => updateParams({ status: v, page: "" });
  const mainTab = searchParams.get("view") || "clubs";
  const setMainTab = (v) => updateParams({ view: v === "clubs" ? "" : v, page: "" });

  return (
    <div data-testid="admin-clubs-tree">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-2"><Shield/> Clubes</h1>
          <p className="text-sm text-slate-500 mt-1">Vista jerárquica: Club → Eventos inscritos → Categorías → Equipos → Jugadores y cuerpo técnico.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton rows={playerExportRows} columns={playerExportColumns} filename="jugadores_inscritos" label="Descargar niños inscritos" testId="clubs-export-players-csv" />
          <button onClick={load} className="text-xs font-bold uppercase tracking-wide px-3 py-2 border border-slate-200 rounded-md flex items-center gap-2 hover:bg-slate-50" data-testid="clubs-refresh">
            <RefreshCw size={12}/> Recargar
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200" data-testid="clubs-main-tabs">
        <button
          onClick={() => setMainTab("clubs")}
          className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide -mb-px border-b-2 ${mainTab === "clubs" ? "border-fsc-azul text-fsc-azul" : "border-transparent text-slate-500"}`}
          data-testid="clubs-tab-clubs"
        >
          Clubes
        </button>
        <button
          onClick={() => setMainTab("pending")}
          className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wide -mb-px border-b-2 flex items-center gap-1.5 ${mainTab === "pending" ? "border-fsc-azul text-fsc-azul" : "border-transparent text-slate-500"}`}
          data-testid="clubs-tab-pending"
        >
          Cuerpo Técnico sin club asignado
          {pendingAssignments.length > 0 && <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs">{pendingAssignments.length}</span>}
        </button>
      </div>

      {mainTab === "pending" ? (
        <PendingAssignmentsTable rows={pendingAssignments} clubs={clubs} onAssign={assignClub} searchParams={searchParams} updateParams={updateParams} />
      ) : (
      <>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <input
          value={query}
          onChange={(e) => setQueryReset(e.target.value)}
          placeholder="Buscar club por nombre, ciudad..."
          className="px-3 py-2 border border-slate-200 rounded-md text-sm flex-1 min-w-[240px]"
          data-testid="clubs-search"
        />
        {["", "pendiente", "aprobado", "rechazado"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilterReset(s)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${statusFilter === s ? "bg-fsc-azul text-white border-fsc-azul" : "bg-white border-slate-200"}`}
            data-testid={`clubs-filter-${s || "all"}`}
          >
            {s || "Todos"}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-auto" data-testid="clubs-count">{filtered.length} / {clubs.length} clubes</span>
      </div>

      <div className="space-y-3">
        {loading && <div className="text-center py-12 text-slate-400">Cargando...</div>}
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-slate-400">Sin clubes para los filtros aplicados.</div>}
        {pageItems.map((c) => (
          <ClubNode
            key={c.id}
            club={c}
            users={clubUsers[c.id]}
            expanded={!!expanded[c.id]}
            onToggle={() => toggle(c.id)}
            onApprove={() => setClubStatus(c.id, "aprobado")}
            onReject={() => setClubStatus(c.id, "rechazado")}
            onPending={() => setClubStatus(c.id, "pendiente")}
            onDelete={() => deleteClub(c.id)}
            onTeamStatus={setTeamStatus}
            onDeletePlayer={deletePlayer}
            onEditPlayer={(team, player) => setEditingPlayer({ team, player })}
            onEditTeamName={(team) => setEditingTeamName(team)}
            onAssignStaff={(team) => setAssigningStaffTeam({ team, clubUsers: clubUsers[c.id] || [] })}
            onEditClubName={() => setEditingClubName(c)}
            onEditStaff={(team, idx) => setEditingStaff({ team, idx, data: idx != null ? (team.cuerpo_tecnico || [])[idx] : { name: "", role: "Director técnico", document: "", phone: "", photo_url: "" } })}
            onDeleteStaff={deleteStaff}
            onUserStatus={setUserStatus}
          />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} testIdPrefix="clubs" />
      </>
      )}

      {editingPlayer && (
        <PlayerEditModal
          team={editingPlayer.team}
          player={editingPlayer.player}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => { setEditingPlayer(null); load(); }}
        />
      )}

      {editingTeamName && (
        <TeamNameEditModal
          team={editingTeamName}
          onClose={() => setEditingTeamName(null)}
          onSaved={() => { setEditingTeamName(null); load(); }}
        />
      )}

      {editingClubName && (
        <ClubNameEditModal
          club={editingClubName}
          onClose={() => setEditingClubName(null)}
          onSaved={() => { setEditingClubName(null); load(); }}
        />
      )}

      {editingStaff && (
        <StaffEditModal
          team={editingStaff.team}
          idx={editingStaff.idx}
          initial={editingStaff.data}
          onClose={() => setEditingStaff(null)}
          onSaved={() => { setEditingStaff(null); load(); }}
        />
      )}

      {assigningStaffTeam && (
        <TeamAssignStaffModal
          team={assigningStaffTeam.team}
          clubUsers={assigningStaffTeam.clubUsers}
          onClose={() => setAssigningStaffTeam(null)}
          onSaved={() => { setAssigningStaffTeam(null); load(); }}
        />
      )}
    </div>
  );
}

// Cuentas de Cuerpo Técnico que se registraron escribiendo el nombre del club como guía
// (sin club confirmado todavía). El admin elige el club real de la lista y aprueba en un
// paso. Tabla con búsqueda y paginación propia (puede crecer bastante con el tiempo).
function PendingAssignmentsTable({ rows, clubs, onAssign, searchParams, updateParams }) {
  const [picked, setPicked] = useState({}); // {user_id: club_id}
  const q = (searchParams.get("pq") || "").toLowerCase();
  const setQ = (v) => updateParams({ pq: v, ppage: "" });
  const page = parseInt(searchParams.get("ppage"), 10) || 1;
  const setPage = (p) => updateParams({ ppage: p > 1 ? String(p) : "" });
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((u) =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.requested_club_name || "").toLowerCase().includes(q)
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div data-testid="pending-club-assignments">
      <p className="text-sm text-slate-500 mb-3">Escribieron el nombre del club como guía al registrarse. Confirma a qué club pertenecen para aprobar su acceso.</p>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o club escrito..."
          className="px-3 py-2 border border-slate-200 rounded-md text-sm flex-1 min-w-[240px]"
          data-testid="pending-assignments-search"
        />
        <span className="text-xs text-slate-500 ml-auto" data-testid="pending-assignments-count">{filtered.length} / {rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay cuentas de Cuerpo Técnico esperando asignación de club.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Sin resultados para la búsqueda.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2.5">Nombre</th>
                <th className="text-left px-3 py-2.5">Email</th>
                <th className="text-left px-3 py-2.5">Club escrito</th>
                <th className="text-left px-3 py-2.5">Asignar club real</th>
                <th className="text-left px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id} className="border-t border-slate-100" data-testid={`pending-assignment-${u.id}`}>
                  <td className="px-3 py-2.5 font-semibold">{u.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-3 py-2.5"><strong>{u.requested_club_name || "—"}</strong></td>
                  <td className="px-3 py-2.5">
                    <select
                      value={picked[u.id] || ""}
                      onChange={(e) => setPicked((p) => ({ ...p, [u.id]: e.target.value }))}
                      className="px-2 py-1.5 border border-slate-200 rounded-md text-xs min-w-[200px]"
                      data-testid={`pending-assignment-select-${u.id}`}
                    >
                      <option value="">— Elegir club real —</option>
                      {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onAssign(u.id, picked[u.id])}
                      className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                      data-testid={`pending-assignment-confirm-${u.id}`}
                    >
                      Asignar y aprobar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} testIdPrefix="pending-assignments" />
    </div>
  );
}

function ClubNode({ club, users, expanded, onToggle, onApprove, onReject, onPending, onDelete, onTeamStatus, onDeletePlayer, onEditPlayer, onEditTeamName, onAssignStaff, onEditClubName, onEditStaff, onDeleteStaff, onUserStatus }) {
  const teams = useMemo(() => club.teams || [], [club.teams]);
  // Group teams by (event_type, category)
  const byEvent = useMemo(() => {
    const m = {};
    teams.forEach((t) => {
      const ev = t.event_type || "—";
      m[ev] = m[ev] || {};
      const cat = t.category || "—";
      m[ev][cat] = m[ev][cat] || [];
      m[ev][cat].push(t);
    });
    return m;
  }, [teams]);

  const status = club.status || "pendiente";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid={`club-node-${club.id}`}>
      <div className="p-4 flex items-start gap-4">
        <button onClick={onToggle} className="text-slate-500 mt-1" data-testid={`club-toggle-${club.id}`}>
          {expanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
        </button>
        {club.logo_url
          ? <img src={imgSrc(club.logo_url)} alt={club.name} className="h-14 w-14 rounded-md object-cover border border-slate-200" />
          : <div className="h-14 w-14 rounded-md bg-fsc-gris flex items-center justify-center text-fsc-azul"><Shield size={24}/></div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-xl font-black tracking-tight">{club.name}</h3>
            <button onClick={onEditClubName} className="text-slate-400 hover:text-fsc-azul p-1 rounded" title={`Editar nombre y logo del club "${club.name}"`} data-testid={`club-edit-name-${club.id}`}>
              <Edit3 size={14}/>
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_BADGE[status] || "bg-slate-100 text-slate-600"}`} data-testid={`club-status-${club.id}`}>{status}</span>
            <span className="text-xs text-slate-500">· {teams.length} equipo(s)</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {[club.city, club.country].filter(Boolean).join(" · ")}
            {club.president && <> · Presidente: <strong>{club.president}</strong></>}
            {club.manager_name && <> · DT: <strong>{club.manager_name}</strong></>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status !== "aprobado" && (
            <button onClick={onApprove} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded" title="Aprobar" data-testid={`club-approve-${club.id}`}><Check size={16}/></button>
          )}
          {status !== "rechazado" && (
            <button onClick={onReject} className="text-fsc-rojo hover:bg-red-50 p-1.5 rounded" title="Rechazar" data-testid={`club-reject-${club.id}`}><X size={16}/></button>
          )}
          {status !== "pendiente" && (
            <button onClick={onPending} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded text-xs font-bold" title="Marcar como pendiente">⏳</button>
          )}
          <ConfirmDeleteDialog
            trigger={
              <button
                className="text-fsc-rojo hover:bg-red-50 p-1.5 rounded"
                title="Eliminar club (cascada)"
                data-testid={`club-delete-${club.id}`}
              >
                <Trash2 size={16}/>
              </button>
            }
            title={`Eliminar club "${club.name}"`}
            description={
              <span>
                Se eliminarán <strong>permanentemente</strong>: el club, sus{" "}
                <strong>{teams.length} equipo(s)</strong>, todos sus{" "}
                <strong>{teams.reduce((sum, t) => sum + ((t.players || []).length), 0)} jugador(es)</strong>,
                el cuerpo técnico, y <strong>todas las cotizaciones y pagos</strong> asociados al club.
                <br/><br/>Esta acción no se puede deshacer.
              </span>
            }
            confirmLabel="Sí, eliminar todo"
            onConfirm={onDelete}
            testIdPrefix={`club-delete-modal-${club.id}`}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          {/* Usuarios registrados del club */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-fsc-azul mb-2 flex items-center gap-2"><Users size={12}/> Usuarios registrados</div>
            {!users && <div className="text-xs text-slate-400 italic">Cargando...</div>}
            {users && users.length === 0 && <div className="text-xs text-slate-400 italic">Sin usuarios asociados.</div>}
            {users && users.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2" data-testid={`club-users-${club.id}`}>
                {users.map((u) => {
                  const mr = (u.manager_role || "").trim();
                  const isCT = mr.toLowerCase() === "cuerpo técnico";
                  const isDT = mr && !isCT;
                  const badgeColor = isCT ? "bg-purple-100 text-purple-700" : isDT ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600";
                  return (
                    <div key={u.id} className="bg-white border border-slate-200 rounded-md p-2 text-xs flex items-start gap-2">
                      <div className="h-7 w-7 bg-fsc-azul/10 text-fsc-azul rounded-full flex items-center justify-center font-bold">{(u.name || "?").charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{u.name || u.email}</div>
                        <div className="text-slate-500 flex items-center gap-1"><Mail size={10}/> {u.email}</div>
                        {u.phone && <div className="text-slate-500 flex items-center gap-1"><Phone size={10}/> {u.phone}</div>}
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{u.role}</span>
                          {mr && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor}`} data-testid={`user-manager-role-${u.id}`}>{mr}</span>}
                          {isCT && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${u.status === "aprobado" ? "bg-green-100 text-green-700" : u.status === "rechazado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`} data-testid={`user-status-${u.id}`}>
                              {u.status || "aprobado"}
                            </span>
                          )}
                        </div>
                        {isCT && onUserStatus && (
                          <div className="mt-1.5 flex gap-1">
                            {u.status !== "aprobado" && (
                              <button onClick={() => onUserStatus(u.id, "aprobado", club.id)} className="text-[10px] font-bold uppercase tracking-wide bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded" data-testid={`approve-user-${u.id}`}>Aprobar</button>
                            )}
                            {u.status !== "rechazado" && (
                              <button onClick={() => onUserStatus(u.id, "rechazado", club.id)} className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 hover:bg-red-50 text-red-600 px-2 py-1 rounded" data-testid={`reject-user-${u.id}`}>Rechazar</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estructura: Evento → Categoría → Equipos */}
          {Object.keys(byEvent).length === 0 && <div className="text-xs text-slate-400 italic">Sin equipos inscritos a eventos.</div>}
          {Object.entries(byEvent).map(([evType, byCat]) => (
            <div key={evType} className="mb-4">
              <div className="text-sm font-bold uppercase tracking-wider text-fsc-rojo mb-1">📅 Evento: {evType}</div>
              {Object.entries(byCat).map(([cat, evTeams]) => (
                <div key={cat} className="ml-4 mt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">🏷 Categoría: {cat}</div>
                  <div className="ml-4 space-y-2">
                    {evTeams.map((t) => (
                      <TeamNode key={t.id} team={t} onTeamStatus={onTeamStatus} onDeletePlayer={onDeletePlayer} onEditPlayer={onEditPlayer} onEditTeamName={onEditTeamName} onAssignStaff={onAssignStaff} onEditStaff={onEditStaff} onDeleteStaff={onDeleteStaff} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamNode({ team, onTeamStatus, onDeletePlayer, onEditPlayer, onEditTeamName, onAssignStaff, onEditStaff, onDeleteStaff }) {
  const [open, setOpen] = useState(false);
  const status = team.status || "pendiente";
  const players = team.players || [];
  const staff = team.cuerpo_tecnico || [];
  return (
    <div className="bg-white border border-slate-200 rounded p-3" data-testid={`team-node-${team.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-500" data-testid={`team-toggle-${team.id}`}>
          {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </button>
        <span className="font-semibold text-sm">{team.name}</span>
        <button onClick={() => onEditTeamName(team)} className="text-slate-400 hover:text-fsc-azul p-1" title="Editar nombre del equipo" data-testid={`team-edit-name-${team.id}`}>
          <Edit3 size={12}/>
        </button>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_BADGE[status]}`}>{status}</span>
        <span className="text-xs text-slate-500">· {players.length} jugadores · {staff.length} staff</span>
        <div className="ml-auto flex items-center gap-1">
          {status !== "aprobado" && <button onClick={() => onTeamStatus(team.id, "aprobado")} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded text-xs" title="Aprobar inscripción" data-testid={`team-approve-${team.id}`}><Check size={14}/></button>}
          {status !== "rechazado" && <button onClick={() => onTeamStatus(team.id, "rechazado")} className="text-fsc-rojo hover:bg-red-50 p-1 rounded text-xs" title="Rechazar" data-testid={`team-reject-${team.id}`}><X size={14}/></button>}
          <button onClick={() => onEditPlayer(team, null)} className="text-fsc-azul hover:bg-blue-50 p-1 rounded text-xs flex items-center gap-1" title="Agregar jugador" data-testid={`team-add-player-${team.id}`}><Plus size={14}/> Jugador</button>
          <button onClick={() => onEditStaff(team, null)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded text-xs flex items-center gap-1" title="Agregar cuerpo técnico" data-testid={`team-add-staff-${team.id}`}><Plus size={14}/> Staff</button>
          <button onClick={() => onAssignStaff(team)} className="text-fsc-azul hover:bg-blue-50 p-1 rounded text-xs flex items-center gap-1" title="Elegir qué cuentas de Cuerpo Técnico pueden ver y gestionar este equipo" data-testid={`team-assign-staff-${team.id}`}><Shield size={14}/> Acceso</button>
          <button
            onClick={async () => {
              try {
                const res = await api.get(`/teams/${team.id}/roster.pdf`, { responseType: "blob" });
                const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `roster_${(team.name || "equipo").replace(/[^a-z0-9_-]/gi, "_")}.pdf`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
              } catch (e) { toast.error("No se pudo generar el PDF: " + (e?.message || "error")); }
            }}
            className="text-fsc-rojo hover:bg-rose-50 p-1 rounded text-xs flex items-center gap-1"
            title="Descargar roster PDF"
            data-testid={`team-roster-pdf-${team.id}`}
          >
            <Download size={14}/> PDF
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Jugadores ({players.length})</div>
            {players.length === 0 && <div className="text-xs text-slate-400 italic">Sin jugadores.</div>}
            <div className="space-y-1">
              {players.map((p) => (
                <div key={p.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex items-center gap-2" data-testid={`player-row-${p.id}`}>
                  {p.photo_url
                    ? <img src={imgSrc(p.photo_url)} alt="" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-fsc-gris flex items-center justify-center text-fsc-azul text-[10px] font-bold">{(p.name || "?").charAt(0)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name} <span className="text-slate-400 text-[10px]">· #{p.jersey_number || "—"}</span></div>
                    <div className="text-slate-500 text-[10px]">{p.position || "—"} · doc {p.document_id || "—"}</div>
                  </div>
                  <button onClick={() => onEditPlayer(team, p)} className="text-fsc-azul p-1" title="Editar" data-testid={`player-edit-${p.id}`}><Edit3 size={12}/></button>
                  <button onClick={() => onDeletePlayer(p.id)} className="text-fsc-rojo p-1" title="Eliminar" data-testid={`player-delete-${p.id}`}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cuerpo técnico ({staff.length})</div>
            {staff.length === 0 && <div className="text-xs text-slate-400 italic">Sin staff.</div>}
            <div className="space-y-1">
              {staff.map((s, i) => (
                <div key={s.document || `${s.name}-${i}`} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex items-center gap-2" data-testid={`staff-row-${team.id}-${i}`}>
                  {s.photo_url
                    ? <img src={imgSrc(s.photo_url)} alt="" className="h-8 w-8 rounded-full object-cover border" />
                    : <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-[10px] font-bold">{(s.name || "?").charAt(0)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-slate-500 text-[10px]">{s.role || "—"} · doc {s.document || "—"} {s.phone && <span className="ml-1 inline-flex items-center gap-0.5"><Phone size={10}/>{s.phone}</span>}</div>
                  </div>
                  <button onClick={() => onEditStaff(team, i)} className="text-fsc-azul p-1" title="Editar" data-testid={`staff-edit-${team.id}-${i}`}><Edit3 size={12}/></button>
                  <button onClick={() => onDeleteStaff(team, i)} className="text-fsc-rojo p-1" title="Eliminar" data-testid={`staff-delete-${team.id}-${i}`}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const POSITIONS_OLD = ["Arquero", "Defensa", "Mediocampista", "Delantero"];

function PlayerEditModal({ team, player, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: player?.name || "",
    team_id: team.id,
    jersey_number: player?.jersey_number || 1,
    position: player?.position || "Portero",
    birth_date: player?.birth_date || "",
    photo_url: player?.photo_url || "",
    document_id: player?.document_id || "",
    nickname: player?.nickname || "",
    gender: player?.gender || "",
    eps: player?.eps || "",
    comet_number: player?.comet_number || "",
    guardian_name: player?.guardian_name || "",
    guardian_relation: player?.guardian_relation || "",
    guardian_phone: player?.guardian_phone || "",
  }));
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const ageErr = validatePlayerBirthVsTeam(form.birth_date, team);
    if (ageErr) { toast.error(ageErr); return; }
    setSaving(true);
    try {
      const payload = { ...form, jersey_number: Number(form.jersey_number) };
      if (player?.id) {
        await api.put(`/players/${player.id}`, payload);
        toast.success("Jugador actualizado");
      } else {
        await api.post("/players", payload);
        toast.success("Jugador agregado");
      }
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !saving && onClose()} data-testid="player-edit-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-3 my-8">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">{player ? "Editar jugador" : "Agregar jugador"}</h2>
        <p className="text-xs text-slate-500">Equipo: <strong>{team.name}</strong> · Categoría: <strong>{team.category}</strong></p>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre completo *</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="player-name" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Apodo / Nick</span>
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-nickname" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Género</span>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-gender">
              <option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dorsal *</span>
            <input required type="number" min="0" value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-jersey" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Posición *</span>
            <select required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-position">
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BirthDateField
            value={form.birth_date}
            team={team}
            onChange={(v) => setForm({ ...form, birth_date: v })}
            testId="player-birth"
          />
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documento</span>
            <input value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-doc" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">EPS</span>
            <input value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-eps" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Número COMET</span>
            <input value={form.comet_number} onChange={(e) => setForm({ ...form, comet_number: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-comet" />
          </label>
        </div>

        <ImageUpload value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} label="Foto del jugador (para el carnet)" hint="Recomendado: foto vertical (retrato), proporción 3:4, ej. 600×800 px, fondo neutro. Se recorta tipo cover si la proporción no coincide." testId="player-photo" />

        <div className="border-t border-slate-200 pt-3 mt-2">
          <h4 className="font-display text-sm font-black uppercase tracking-tight mb-2">Acudiente / Contacto</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</span>
              <input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-guardian-name" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parentesco</span>
              <input value={form.guardian_relation} onChange={(e) => setForm({ ...form, guardian_relation: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-guardian-relation" />
            </label>
            <label className="block col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teléfono</span>
              <input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-guardian-phone" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="player-save">{saving ? "Guardando..." : (player ? "Guardar" : "Agregar")}</button>
        </div>
      </form>
    </div>
  );
}


function TeamNameEditModal({ team, onClose, onSaved }) {
  const [name, setName] = useState(team?.name || "");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const trimmed = (name || "").trim();
    if (!trimmed) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      await api.patch(`/teams/${team.id}/name`, { name: trimmed });
      toast.success("Nombre del equipo actualizado");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => !saving && onClose()} data-testid="team-name-edit-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h3 className="font-display text-xl font-black uppercase tracking-tight">Editar nombre del equipo</h3>
        <p className="text-xs text-slate-500">Categoría: <strong>{team?.category}</strong></p>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del equipo</span>
          <input
            autoFocus required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            data-testid="admin-team-name-input"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="admin-save-team-name-btn">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Elegir qué cuentas de Cuerpo Técnico del club, además de quien creó el equipo, pueden
// verlo y gestionarlo — un club puede tener varios Cuerpo Técnico y cada uno maneja solo
// 1 o varios equipos puntuales, no todo el club (ver PUT /teams/{id}/assigned-staff).
function TeamAssignStaffModal({ team, clubUsers, onClose, onSaved }) {
  const ctUsers = (clubUsers || []).filter((u) => (u.manager_role || "").trim().toLowerCase() === "cuerpo técnico");
  const [picked, setPicked] = useState(new Set(team?.assigned_staff_user_ids || []));
  const [saving, setSaving] = useState(false);

  const toggle = (uid) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/teams/${team.id}/assigned-staff`, { assigned_staff_user_ids: Array.from(picked) });
      toast.success("Acceso actualizado");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo actualizar el acceso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => !saving && onClose()} data-testid="team-assign-staff-modal">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h3 className="font-display text-xl font-black uppercase tracking-tight">Acceso al equipo</h3>
        <p className="text-xs text-slate-500">
          <strong>{team?.name}</strong> — elige qué cuentas de Cuerpo Técnico del club pueden ver y gestionar este equipo
          {team?.created_by_user_id ? " (además de quien lo creó)." : "."}
        </p>
        {ctUsers.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Este club no tiene cuentas de Cuerpo Técnico registradas todavía.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {ctUsers.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer" data-testid={`assign-staff-option-${u.id}`}>
                <input type="checkbox" checked={picked.has(u.id)} onChange={() => toggle(u.id)} />
                <span className="truncate">{u.name} <span className="text-slate-400">· {u.email}</span></span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="button" onClick={save} disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="admin-save-team-staff-access-btn">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClubNameEditModal({ club, onClose, onSaved }) {
  const [name, setName] = useState(club?.name || "");
  const [logoUrl, setLogoUrl] = useState(club?.logo_url || "");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const trimmed = (name || "").trim();
    if (!trimmed) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const tasks = [api.patch(`/clubs/${club.id}/name`, { name: trimmed })];
      if ((logoUrl || "") !== (club?.logo_url || "")) {
        tasks.push(api.patch(`/clubs/${club.id}/logo`, { logo_url: logoUrl || "" }));
      }
      await Promise.all(tasks);
      toast.success("Club actualizado");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => !saving && onClose()} data-testid="club-name-edit-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h3 className="font-display text-xl font-black uppercase tracking-tight">Editar club</h3>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del club</span>
          <input
            autoFocus required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            data-testid="admin-club-name-input"
          />
        </label>
        <ImageUpload value={logoUrl} onChange={setLogoUrl} label="Logo del club" hint="Recomendado: PNG con fondo transparente, cuadrado." testId="admin-club-logo-upload" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="admin-save-club-name-btn">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StaffEditModal({ team, idx, initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    role: initial?.role || "Director técnico",
    document: initial?.document || "",
    phone: initial?.phone || "",
    photo_url: initial?.photo_url || "",
  }));
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nombre obligatorio"); return; }
    setSaving(true);
    try {
      const list = Array.isArray(team.cuerpo_tecnico) ? [...team.cuerpo_tecnico] : [];
      if (idx != null) list[idx] = form;
      else list.push(form);
      await api.patch(`/teams/${team.id}/staff`, { cuerpo_tecnico: list });
      toast.success(idx != null ? "Staff actualizado" : "Staff agregado");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !saving && onClose()} data-testid="staff-edit-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3 my-8">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">{idx != null ? "Editar staff" : "Agregar cuerpo técnico"}</h2>
        <p className="text-xs text-slate-500">Equipo: <strong>{team.name}</strong></p>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre completo *</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="staff-name" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rol</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="staff-role">
            <option>Director técnico</option>
            <option>Asistente técnico</option>
            <option>Preparador físico</option>
            <option>Preparador de arqueros</option>
            <option>Médico / Fisioterapeuta</option>
            <option>Utilero</option>
            <option>Delegado</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documento</span>
            <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="staff-doc" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teléfono</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="staff-phone" />
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Número COMET</span>
          <input value={form.comet_number} onChange={(e) => setForm({ ...form, comet_number: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="staff-comet" />
        </label>
        <ImageUpload value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} label="Foto del staff (para el carnet)" hint="Recomendado: foto vertical (retrato), proporción 3:4, ej. 600×800 px, fondo neutro. Se recorta tipo cover si la proporción no coincide." testId="staff-photo" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="staff-save">{saving ? "Guardando..." : (idx != null ? "Guardar" : "Agregar")}</button>
        </div>
      </form>
    </div>
  );
}
