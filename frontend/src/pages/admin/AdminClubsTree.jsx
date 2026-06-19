import { useCallback, useEffect, useState, useMemo } from "react";
import api, { formatApiError } from "../../lib/api";
import { ChevronDown, ChevronRight, Check, X, Trash2, Plus, Edit3, Users, Mail, Phone, Shield, RefreshCw, Download } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Pagination } from "../../components/PagedTable";
import ImageUpload from "../../components/ImageUpload";

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clubUsers, setClubUsers] = useState({}); // {club_id: [users]}
  const [editingPlayer, setEditingPlayer] = useState(null); // {team_id, player|null}
  const [editingTeamName, setEditingTeamName] = useState(null); // {id, name, category, ...}
  const [editingStaff, setEditingStaff] = useState(null); // {team, idx, data}

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

  const toggle = async (cid) => {
    setExpanded((e) => ({ ...e, [cid]: !e[cid] }));
    if (!clubUsers[cid]) {
      try {
        const r = await api.get(`/admin/clubs/${cid}/users`);
        setClubUsers((cu) => ({ ...cu, [cid]: r.data || [] }));
      } catch (err) { /* silent */ }
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

  // Paginación: 10 clubes por página. Página se "clampa" automáticamente al cambiar filtros.
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setQueryReset = (v) => { setQuery(v); setPage(1); };
  const setStatusFilterReset = (v) => { setStatusFilter(v); setPage(1); };

  return (
    <div data-testid="admin-clubs-tree">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-2"><Shield/> Clubes</h1>
          <p className="text-sm text-slate-500 mt-1">Vista jerárquica: Club → Eventos inscritos → Categorías → Equipos → Jugadores y cuerpo técnico.</p>
        </div>
        <button onClick={load} className="text-xs font-bold uppercase tracking-wide px-3 py-2 border border-slate-200 rounded-md flex items-center gap-2 hover:bg-slate-50" data-testid="clubs-refresh">
          <RefreshCw size={12}/> Recargar
        </button>
      </div>

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
            onTeamStatus={setTeamStatus}
            onDeletePlayer={deletePlayer}
            onEditPlayer={(team, player) => setEditingPlayer({ team, player })}
            onEditTeamName={(team) => setEditingTeamName(team)}
            onEditStaff={(team, idx) => setEditingStaff({ team, idx, data: idx != null ? (team.cuerpo_tecnico || [])[idx] : { name: "", role: "Director técnico", document: "", phone: "", photo_url: "" } })}
            onDeleteStaff={deleteStaff}
          />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} testIdPrefix="clubs" />

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

      {editingStaff && (
        <StaffEditModal
          team={editingStaff.team}
          idx={editingStaff.idx}
          initial={editingStaff.data}
          onClose={() => setEditingStaff(null)}
          onSaved={() => { setEditingStaff(null); load(); }}
        />
      )}
    </div>
  );
}

function ClubNode({ club, users, expanded, onToggle, onApprove, onReject, onPending, onTeamStatus, onDeletePlayer, onEditPlayer, onEditTeamName, onEditStaff, onDeleteStaff }) {
  const teams = club.teams || [];
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
                        </div>
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
                      <TeamNode key={t.id} team={t} onTeamStatus={onTeamStatus} onDeletePlayer={onDeletePlayer} onEditPlayer={onEditPlayer} onEditTeamName={onEditTeamName} onEditStaff={onEditStaff} onDeleteStaff={onDeleteStaff} />
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

function TeamNode({ team, onTeamStatus, onDeletePlayer, onEditPlayer, onEditTeamName, onEditStaff, onDeleteStaff }) {
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
          <button
            onClick={async () => {
              try {
                const res = await api.get(`/teams/${team.id}/roster.pdf`, { responseType: "blob" });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement("a"); a.href = url; a.download = `roster_${team.name}.pdf`; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error("No se pudo generar el PDF"); }
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
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha nacimiento *</span>
            <input required type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="player-birth" />
          </label>
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

        <ImageUpload value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} label="Foto del jugador (para el carnet)" testId="player-photo" />

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
        <ImageUpload value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} label="Foto del staff (para el carnet)" testId="staff-photo" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="fsc-btn-primary px-4 py-2 rounded-md text-xs disabled:opacity-50" data-testid="staff-save">{saving ? "Guardando..." : (idx != null ? "Guardar" : "Agregar")}</button>
        </div>
      </form>
    </div>
  );
}
