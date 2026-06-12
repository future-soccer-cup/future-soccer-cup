import { useCallback, useEffect, useState, useMemo } from "react";
import api, { formatApiError } from "../../lib/api";
import { ChevronDown, ChevronRight, Check, X, Trash2, Plus, Edit3, Users, Mail, Phone, Shield, RefreshCw } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Pagination } from "../../components/PagedTable";

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
    </div>
  );
}

function ClubNode({ club, users, expanded, onToggle, onApprove, onReject, onPending, onTeamStatus, onDeletePlayer, onEditPlayer }) {
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
                      <TeamNode key={t.id} team={t} onTeamStatus={onTeamStatus} onDeletePlayer={onDeletePlayer} onEditPlayer={onEditPlayer} />
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

function TeamNode({ team, onTeamStatus, onDeletePlayer, onEditPlayer }) {
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
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_BADGE[status]}`}>{status}</span>
        <span className="text-xs text-slate-500">· {players.length} jugadores · {staff.length} staff</span>
        <div className="ml-auto flex items-center gap-1">
          {status !== "aprobado" && <button onClick={() => onTeamStatus(team.id, "aprobado")} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded text-xs" title="Aprobar inscripción" data-testid={`team-approve-${team.id}`}><Check size={14}/></button>}
          {status !== "rechazado" && <button onClick={() => onTeamStatus(team.id, "rechazado")} className="text-fsc-rojo hover:bg-red-50 p-1 rounded text-xs" title="Rechazar" data-testid={`team-reject-${team.id}`}><X size={14}/></button>}
          <button onClick={() => onEditPlayer(team, null)} className="text-fsc-azul hover:bg-blue-50 p-1 rounded text-xs flex items-center gap-1" title="Agregar jugador" data-testid={`team-add-player-${team.id}`}><Plus size={14}/> Jugador</button>
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
                    <div className="font-semibold truncate">{p.name} <span className="text-slate-400 text-[10px]">· #{p.shirt_number || "—"}</span></div>
                    <div className="text-slate-500 text-[10px]">{p.position || "—"} · doc {p.document || "—"}</div>
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
                <div key={s.document || `${s.name}-${i}`} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-slate-500">{s.role || "—"} · doc {s.document || "—"} {s.phone && <span className="flex items-center gap-1 inline-flex"><Phone size={10}/> {s.phone}</span>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const POSITIONS = ["Arquero", "Defensa", "Mediocampista", "Delantero"];

function PlayerEditModal({ team, player, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: player?.name || "",
    shirt_number: player?.shirt_number || "",
    document: player?.document || "",
    position: player?.position || "",
    birth_date: player?.birth_date || "",
    photo_url: player?.photo_url || "",
    team_id: team.id,
    category: team.category,
  }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (player?.id) {
        await api.put(`/players/${player.id}`, form);
        toast.success("Jugador actualizado");
      } else {
        await api.post("/players", form);
        toast.success("Jugador agregado");
      }
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error");
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={onClose} data-testid="player-edit-modal">
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight">{player ? "Editar jugador" : "Agregar jugador"}</h2>
        <p className="text-xs text-slate-500">Equipo: <strong>{team.name}</strong></p>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="player-name" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dorsal</span>
            <input type="number" min="0" value={form.shirt_number} onChange={(e) => setForm({ ...form, shirt_number: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" />
          </label>
          <label className="block col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documento</span>
            <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Posición</span>
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm">
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha nac.</span>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cancelar</button>
          <button type="submit" className="fsc-btn-primary px-4 py-2 rounded-md text-xs" data-testid="player-save">{player ? "Guardar" : "Agregar"}</button>
        </div>
      </form>
    </div>
  );
}
