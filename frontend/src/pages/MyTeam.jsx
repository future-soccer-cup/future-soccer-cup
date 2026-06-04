import { useEffect, useRef, useState } from "react";
import api, { formatApiError, imgSrc } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2, Users2, CreditCard, CheckCircle2, AlertCircle, FileUp, Download, Receipt as ReceiptIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";
import CategorySelect from "../components/CategorySelect";
import PaymentForm from "../components/PaymentForm";
import PaymentsList from "../components/PaymentsList";

const EMPTY_PLAYER = { name: "", team_id: "", jersey_number: 1, position: "Mediocampista", birth_date: "", photo_url: "", document_id: "", nickname: "", gender: "", eps: "", guardian_name: "", guardian_doc: "", guardian_relation: "", guardian_phone: "" };
const EMPTY_STAFF = { name: "", document: "", role: "Director técnico", phone: "", team_id: "", photo_url: "" };
const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")} COP`;

export default function MyTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null); // {idx?, data}
  const [payingReg, setPayingReg] = useState(false);
  const [regPaymentsOpen, setRegPaymentsOpen] = useState(false);
  const [regPaymentsData, setRegPaymentsData] = useState(null);
  const [regShowForm, setRegShowForm] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [clubTeams, setClubTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [quoteTournaments, setQuoteTournaments] = useState([]); // tournaments asociados a cotizaciones aprobadas (con sus categorías cotizadas)
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ tournament_id: "", category_name: "", team_name: "" });
  const [club, setClub] = useState(null);

  const teamId = user?.team_id;

  // ===== HANDLERS (definidos antes de los early-returns para uso en ambas ramas) =====
  const savePlayer = async (e) => {
    e.preventDefault();
    try {
      const pickedTeamId = editingPlayer.team_id || teamId;
      if (!pickedTeamId) { toast.error("Selecciona un equipo para el jugador"); return; }
      const payload = { ...editingPlayer, team_id: pickedTeamId, jersey_number: Number(editingPlayer.jersey_number) };
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
  const saveStaff = async (e) => {
    e.preventDefault();
    try {
      const targetTeamId = editingStaff.data.team_id || teamId;
      if (!targetTeamId) {
        toast.error("Selecciona un equipo para el miembro del cuerpo técnico");
        return;
      }
      const targetTeam = clubTeams.find((t) => t.id === targetTeamId) || (teamId === targetTeamId ? team : null);
      if (!targetTeam) { toast.error("Equipo no encontrado"); return; }
      const list = Array.isArray(targetTeam.cuerpo_tecnico) ? [...targetTeam.cuerpo_tecnico] : [];
      const { team_id: _omit, ...staffPayload } = editingStaff.data;
      if (editingStaff.idx != null) list[editingStaff.idx] = staffPayload;
      else list.push(staffPayload);
      await api.put(`/teams/${targetTeamId}`, { ...targetTeam, cuerpo_tecnico: list });
      toast.success("Guardado");
      setEditingStaff(null);
      loadTeam();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };
  const removeStaffMember = async (memberTeamId, idx) => {
    if (!window.confirm("¿Eliminar miembro del cuerpo técnico?")) return;
    const t = clubTeams.find((x) => x.id === memberTeamId) || (memberTeamId === teamId ? team : null);
    if (!t) return;
    const list = (t.cuerpo_tecnico || []).filter((_, i) => i !== idx);
    await api.put(`/teams/${memberTeamId}`, { ...t, cuerpo_tecnico: list });
    loadTeam();
  };
  // Aggregator de cuerpo técnico de todos los equipos del club.
  const aggregatedStaff = clubTeams.flatMap((t) => (t.cuerpo_tecnico || []).map((s, idx) => ({ ...s, team_id: t.id, team_name: t.name, _idx: idx })));

  const loadTeam = async () => {
    // Caso CT sin team: cargar club + equipos + jugadores de todos los equipos.
    if (!teamId && user?.club_id) {
      try {
        const cl = await api.get(`/clubs/${user.club_id}`);
        setClub(cl.data);
        const ct = await api.get(`/clubs/${user.club_id}/teams`).catch(() => ({ data: [] }));
        setClubTeams(ct.data || []);
        // Cargar jugadores de todos los equipos del club.
        const allPlayers = [];
        for (const t of (ct.data || [])) {
          try {
            const p = await api.get(`/players?team_id=${t.id}`);
            allPlayers.push(...(p.data || []));
          } catch { /* silent */ }
        }
        setPlayers(allPlayers);
      } catch { /* silent */ }
      return;
    }
    if (!teamId) return;
    let tdata = null;
    try {
      const t = await api.get(`/teams/${teamId}`);
      tdata = t.data;
      setTeam(tdata);
      setTeamForm(tdata);
    } catch (err) {
      setTeam(null);
      return;
    }
    // Load other teams in same club + the club itself (status)
    let clubTeamsLocal = [];
    if (tdata && tdata.club_id) {
      const [ct, cl] = await Promise.all([
        api.get(`/clubs/${tdata.club_id}/teams`).catch(() => ({ data: [] })),
        api.get(`/clubs/${tdata.club_id}`).catch(() => ({ data: null })),
      ]);
      clubTeamsLocal = ct.data || [];
      setClubTeams(clubTeamsLocal);
      setClub(cl.data);
    }
    // Cargar jugadores: incluir todos los equipos del club para que Directivo y CT vean todos.
    const targetTeams = clubTeamsLocal.length > 0 ? clubTeamsLocal : (tdata ? [tdata] : []);
    const allPlayers = [];
    for (const t of targetTeams) {
      try {
        const p = await api.get(`/players?team_id=${t.id}`);
        allPlayers.push(...(p.data || []));
      } catch { /* silent */ }
    }
    setPlayers(allPlayers);
  };

  useEffect(() => {
    loadTeam();
    api.get("/event-types").then((r) => setEvents(r.data.events || [])).catch(() => {});
    // Cargar tournaments asociados a las cotizaciones del Directivo / Cuerpo Técnico.
    // - Solo cotizaciones APROBADAS (o pagadas).
    // - Solo eventos ACTIVOS (no archivados, no fuera de fecha) si tienen 'archived' o 'active' flags.
    // - Para cada evento, conservar SOLO las categorías que fueron cotizadas (subset, no todas).
    (async () => {
      try {
        const [allT, mineQ] = await Promise.all([
          api.get("/tournaments"),
          api.get("/quotes/mine").catch(() => ({ data: [] })),
        ]);
        const allActive = (allT.data || []).filter((t) => !t.archived);
        // categoriesCotizadasByTournament: { tournament_id: Set<category_name> }
        const cotizadasByT = new Map();
        for (const q of (mineQ.data || [])) {
          if (q.status !== "aprobada" && q.status !== "pagada") continue;
          for (const ev of (q.events || [])) {
            if (!ev?.tournament_id) continue;
            const s = cotizadasByT.get(ev.tournament_id) || new Set();
            for (const c of (ev.categories || [])) {
              if (c?.name) s.add(c.name);
            }
            cotizadasByT.set(ev.tournament_id, s);
          }
          if (q.tournament_id) {
            const s = cotizadasByT.get(q.tournament_id) || new Set();
            for (const c of (q.categories || [])) if (c?.name) s.add(c.name);
            if (s.size === 0 && q.category) s.add(q.category);
            cotizadasByT.set(q.tournament_id, s);
          }
        }
        // Filtramos eventos activos cuyos id están en cotizadasByT.
        const result = allActive
          .filter((t) => cotizadasByT.has(t.id))
          .map((t) => {
            const allowed = cotizadasByT.get(t.id) || new Set();
            const cats = (t.categories || []).filter((c) => allowed.has(c.name));
            return { ...t, categories: cats };
          });
        setQuoteTournaments(result);
      } catch { /* silent */ }
    })();
    /* eslint-disable-next-line */
  }, [teamId, user?.club_id]);

  if (!user) return null;
  if (user.role !== "team") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-black uppercase">No autorizado</h1>
        <p className="text-slate-500 mt-2">Solo los responsables de club pueden acceder aquí.</p>
      </div>
    );
  }

  // Pantalla específica para usuarios sin team_id (CT recién registrado o Directivo cuyo club aún no tiene equipos).
  if (!teamId) {
    const isCT = (user.manager_role || "").trim().toLowerCase() === "cuerpo técnico";
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="my-team-page">
        <Toaster position="top-right" />
        {club && (club.status || "pendiente") !== "aprobado" && (
          <div className={`mb-4 rounded-xl border-2 p-4 flex items-start gap-3 ${club.status === "rechazado" ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-amber-50 border-amber-300 text-amber-900"}`} data-testid="club-status-banner">
            <AlertCircle size={28} className="shrink-0" />
            <div>
              <div className="font-bold uppercase tracking-wider text-sm">Tu club <strong>{club.name}</strong> está en estado: {club.status || "pendiente"}</div>
              <p className="text-xs mt-1">Hasta que el administrador apruebe tu club, no podrás realizar cotizaciones ni inscribir equipos a eventos.</p>
            </div>
          </div>
        )}
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter">Mi Club</h1>
        <p className="text-slate-600 mt-2">
          {club ? <>Estás vinculado a <strong>{club.name}</strong>.</> : "Cargando información del club..."}
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {!isCT ? (
            <Link to="/cotizar" className="bg-white border-2 border-slate-900 text-slate-900 rounded-xl p-4 hover:bg-slate-900 hover:text-white transition-colors" data-testid="cta-cotizar">
              <div className="text-xs font-bold uppercase tracking-[0.2em]">Armar paquete</div>
              <div className="font-display text-2xl font-black uppercase tracking-tight">Cotizar evento →</div>
            </Link>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl p-4" data-testid="cta-cotizar-blocked">
              <div className="text-xs font-bold uppercase tracking-[0.2em]">Cotizar evento</div>
              <div className="font-display text-sm uppercase tracking-tight mt-1">Solo el Directivo del club puede cotizar.</div>
            </div>
          )}
          <Link to="/mis-cotizaciones" className="bg-slate-900 text-white rounded-xl p-4 hover:bg-slate-800 transition-colors" data-testid="cta-mis-cotizaciones">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Historial</div>
            <div className="font-display text-2xl font-black uppercase tracking-tight">Mis cotizaciones →</div>
          </Link>
        </div>

        {clubTeams.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Equipos del club</h2>
            <div className="mt-3 space-y-2">
              {clubTeams.map((t) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 text-sm" data-testid={`club-team-${t.id}`}>
                  <strong>{t.name}</strong> · {t.category} · status: <span className="uppercase font-bold text-fsc-azul">{t.status || "pendiente"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Crear primer equipo — disponible para Directivos Y Cuerpo Técnico cuando club está aprobado */}
        {user?.club_id && (club?.status === "aprobado") && (
          <FirstTeamCreator
            clubId={user.club_id}
            tournaments={quoteTournaments}
            onCreated={loadTeam}
          />
        )}

        {/* Cuerpo técnico — agregado de todos los equipos del club */}
        <div className="mt-10" data-testid="staff-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-3xl font-black uppercase tracking-tight flex items-center gap-3"><Users2 size={28}/> Cuerpo técnico ({aggregatedStaff.length})</h2>
            <button onClick={() => setEditingStaff({ idx: null, data: { ...EMPTY_STAFF, team_id: clubTeams[0]?.id || "" } })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" disabled={clubTeams.length === 0} data-testid="add-staff-btn">
              <Plus size={16}/> Agregar
            </button>
          </div>
          {clubTeams.length === 0 && (
            <p className="text-xs text-amber-700">Primero crea un equipo para poder asignar cuerpo técnico.</p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aggregatedStaff.length === 0 && clubTeams.length > 0 && <p className="col-span-full text-center text-slate-400 py-6">Aún no has agregado al cuerpo técnico.</p>}
            {aggregatedStaff.map((s) => (
              <div key={`${s.team_id}-${s._idx}`} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3" data-testid={`staff-${s.team_id}-${s._idx}`}>
                {s.photo_url ? <img src={s.photo_url} alt={s.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold uppercase">{(s.name || "?")[0]}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.role}{s.document ? ` · Doc ${s.document}` : ""}{s.phone ? ` · ${s.phone}` : ""}</div>
                  <div className="text-[10px] uppercase tracking-widest text-fsc-azul mt-0.5">Equipo: {s.team_name}</div>
                </div>
                <button onClick={() => setEditingStaff({ idx: s._idx, data: { name: s.name, document: s.document || "", role: s.role || "Director técnico", phone: s.phone || "", team_id: s.team_id, photo_url: s.photo_url || "" } })} className="text-blue-700"><Pencil size={16}/></button>
                <button onClick={() => removeStaffMember(s.team_id, s._idx)} className="text-red-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Jugadores de todos los equipos del club */}
        <div className="mt-10" data-testid="players-section-ct">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-3xl font-black uppercase tracking-tight">Jugadores ({players.length})</h2>
            <button onClick={() => setEditingPlayer({ ...EMPTY_PLAYER, team_id: clubTeams[0]?.id || "" })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" disabled={clubTeams.length === 0} data-testid="add-player-btn">
              <Plus size={16}/> Agregar jugador
            </button>
          </div>
          {clubTeams.length === 0 && (
            <p className="text-xs text-amber-700">Primero crea un equipo para inscribir jugadores.</p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.length === 0 && clubTeams.length > 0 && <p className="col-span-full text-center text-slate-400 py-6">Aún no hay jugadores.</p>}
            {players.map((p) => {
              const t = clubTeams.find((x) => x.id === p.team_id);
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`player-${p.id}`}>
                  <div className="flex items-center gap-3">
                    {p.photo_url ? <img src={p.photo_url} alt={p.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold uppercase">{(p.name || "?")[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">#{p.jersey_number} · {p.name}</div>
                      <div className="text-xs text-slate-500 truncate">{p.position}</div>
                      <div className="text-[10px] uppercase tracking-widest text-fsc-azul">Equipo: {t?.name || p.team_id} · <span className="text-amber-600">{p.status}</span></div>
                    </div>
                    <button onClick={() => setEditingPlayer({ ...p })} className="text-blue-700"><Pencil size={16}/></button>
                    <button onClick={() => removePlayer(p.id)} className="text-red-600"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modales reutilizables (player + staff) */}
        {editingPlayer && (
          <Modal title={editingPlayer.id ? "Editar jugador" : "Nuevo jugador"} onClose={() => setEditingPlayer(null)}>
            <form onSubmit={savePlayer} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo *</span>
                <select value={editingPlayer.team_id || ""} onChange={(e) => setEditingPlayer({ ...editingPlayer, team_id: e.target.value })} disabled={!!editingPlayer.id} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="player-team-select">
                  <option value="">Seleccionar equipo...</option>
                  {clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <Field label="Nombre completo" required value={editingPlayer.name} onChange={(v) => setEditingPlayer({ ...editingPlayer, name: v })} testId="player-name-input" />
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
                <Field label="Documento" value={editingPlayer.document_id} onChange={(v) => setEditingPlayer({ ...editingPlayer, document_id: v })} />
                <Field label="Fecha nacimiento" type="date" value={editingPlayer.birth_date} onChange={(v) => setEditingPlayer({ ...editingPlayer, birth_date: v })} />
              </div>
              <button className="fsc-btn-red w-full py-2 rounded-md" data-testid="save-player-btn">Guardar</button>
            </form>
          </Modal>
        )}
        {editingStaff && (
          <Modal title={editingStaff.idx != null ? "Editar miembro" : "Nuevo miembro"} onClose={() => setEditingStaff(null)}>
            <form onSubmit={saveStaff} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo *</span>
                <select value={editingStaff.data.team_id || ""} onChange={(e) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, team_id: e.target.value } })} disabled={editingStaff.idx != null} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="staff-team-select">
                  <option value="">Seleccionar equipo...</option>
                  {clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <Field label="Nombre completo" required value={editingStaff.data.name} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, name: v } })} testId="staff-name-input" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rol</span>
                <select value={editingStaff.data.role} onChange={(e) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, role: e.target.value } })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="staff-role-select">
                  <option>Director técnico</option><option>Asistente técnico</option><option>Preparador físico</option>
                  <option>Médico</option><option>Fisioterapeuta</option><option>Delegado</option><option>Utilero</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Documento" value={editingStaff.data.document} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, document: v } })} testId="staff-document-input" />
                <Field label="Teléfono" value={editingStaff.data.phone} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, phone: v } })} testId="staff-phone-input" />
              </div>
              <ImageUpload value={editingStaff.data.photo_url} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, photo_url: v } })} label="Foto para el carnet (sin fondo)" testId="staff-photo-upload" />
              <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-staff-btn">Guardar</button>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  if (!team) {
    // Si teamId existe pero el fetch falló (team huérfano), mostrar mensaje claro en vez de "Cargando..." infinito.
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center" data-testid="myteam-orphan">
        <h1 className="font-display text-3xl font-black uppercase">Tu equipo no está disponible</h1>
        <p className="text-slate-500 mt-3">No pudimos cargar la información de tu equipo. Es posible que haya sido eliminado o reasignado por el administrador.</p>
        <p className="text-slate-500 mt-2">Si crees que es un error, contacta al administrador del FSC.</p>
        <Link to="/" className="fsc-btn-primary inline-flex mt-6 px-6 py-2 rounded-md">Volver al inicio</Link>
      </div>
    );
  }

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

  const payRegistration = async () => {
    setPayingReg(true);
    try {
      const r = await api.post("/payments/registration/session", {
        team_id: teamId,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo iniciar el pago");
      setPayingReg(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const r = await api.get("/team-roster/template", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = "fsc-equipo-plantilla.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Plantilla XLSX descargada");
    } catch (e) {
      toast.error("No se pudo descargar la plantilla");
    }
  };

  const uploadBulk = async (runPreview) => {    if (!bulkFile) { toast.error("Selecciona un archivo .xlsx"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", bulkFile);
      const r = await api.post(`/team-roster/import?preview=${runPreview}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (runPreview) {
        setBulkPreview(r.data);
      } else {
        toast.success(`Importados: ${r.data.players.ok} jugadores, ${r.data.staff.ok} del cuerpo técnico`);
        setBulkPreview(null);
        setBulkFile(null);
        if (fileRef.current) fileRef.current.value = "";
        loadTeam();
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error en la importación");
    } finally {
      setUploading(false);
    }
  };

  const regPaid = team.registration_payment_status === "paid";
  const eventLabel = { festival: "Festival", premier_par: "Premier Par", premier_impar: "Premier Impar" }[team.event_type] || "—";
  const staff = aggregatedStaff;

  const loadRegPayments = async () => {
    try {
      const r = await api.get(`/payments/by-target?target_type=team_registration&target_id=${team.id}`);
      setRegPaymentsData(r.data);
    } catch (err) {
      console.error("[MyTeam] loadRegPayments failed", err);
      toast.error("No se pudieron cargar los abonos de la inscripción");
    }
  };
  const toggleRegPayments = async () => {
    const next = !regPaymentsOpen;
    setRegPaymentsOpen(next);
    if (next && !regPaymentsData) await loadRegPayments();
  };
  const onRegPaymentCreated = async () => {
    setRegShowForm(false);
    await loadRegPayments();
    await loadTeam();
  };
  const regTotal = regPaymentsData?.balance?.total ?? Number(team.registration_fee || 0);
  const regPaidAmt = regPaymentsData?.balance?.paid ?? 0;
  const regBalance = regPaymentsData?.balance?.balance ?? regTotal;

  const newTournament = quoteTournaments.find((t) => t.id === newTeam.tournament_id);
  const newCats = newTournament?.categories || [];
  const newCatMatch = newCats.find((c) => c.name === newTeam.category_name);
  const newFee = Number(newCatMatch?.fee || 0);

  const addTeamToClub = async () => {
    if (!team.club_id) return toast.error("Tu equipo aún no está vinculado a un club");
    if (!newTeam.tournament_id) return toast.error("Selecciona un evento");
    if (!newTeam.category_name) return toast.error("Selecciona una categoría");
    if (!newTeam.team_name.trim()) return toast.error("Escribe el nombre del equipo");
    try {
      await api.post(`/clubs/${team.club_id}/teams`, newTeam);
      toast.success("Equipo agregado al club");
      setShowAddTeam(false);
      setNewTeam({ tournament_id: "", category_name: "", team_name: "" });
      loadTeam();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al agregar");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="my-team-page">
      <Toaster position="top-right" />

      {/* Banner de estado del club */}
      {club && (club.status || "pendiente") !== "aprobado" && (
        <div className={`mb-4 rounded-xl border-2 p-4 flex items-start gap-3 ${club.status === "rechazado" ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-amber-50 border-amber-300 text-amber-900"}`} data-testid="club-status-banner">
          <AlertCircle size={28} className="shrink-0" />
          <div>
            <div className="font-bold uppercase tracking-wider text-sm">Tu club <strong>{club.name}</strong> está en estado: {club.status || "pendiente"}</div>
            <p className="text-xs mt-1">Hasta que el administrador apruebe tu club, no podrás <strong>realizar cotizaciones</strong> ni <strong>inscribir nuevos equipos a eventos</strong>. Sí puedes seguir editando tu plantilla y cuerpo técnico.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-6">
        <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-4xl font-display font-black overflow-hidden" style={{ background: team.color || "#1d4ed8", color: "#fff" }}>
          {team.logo_url ? <img src={imgSrc(team.logo_url)} alt={team.name} className="h-full w-full object-contain p-1" /> : team.name[0]}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{team.category} · {eventLabel}</div>
          <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter">{team.name}</h1>
          <div className="text-sm text-slate-600">{team.city || "—"} {team.coach && `· DT: ${team.coach}`}</div>
        </div>
        <button onClick={() => setEditingTeam(true)} className="fsc-btn-primary px-4 py-2 rounded-md text-sm" data-testid="edit-team-btn">Editar equipo</button>
      </div>

      {/* Banner inscripción al evento */}
      <div className={`mt-4 rounded-2xl p-5 border-2 ${regPaid ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`} data-testid="registration-banner">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {regPaid ? <CheckCircle2 className="text-green-600 shrink-0" size={32}/> : <AlertCircle className="text-amber-600 shrink-0" size={32}/>}
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Inscripción al evento</div>
            <div className="font-display text-2xl font-black uppercase tracking-tight">
              {regPaid ? "Pagada" : team.registration_payment_status === "partial" ? "Pago parcial" : "Pendiente de pago"}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {eventLabel} · {fmtCOP(team.registration_fee)}
              {!regPaid && <span className="ml-2">— El equipo será activado al confirmar el pago.</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!regPaid && (
              <button onClick={payRegistration} disabled={payingReg} className="fsc-btn-red px-5 py-3 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid="pay-registration-btn">
                <CreditCard size={16}/> {payingReg ? "Redirigiendo..." : "Pagar con Stripe"}
              </button>
            )}
            <button
              onClick={toggleRegPayments}
              className="px-4 py-3 rounded-md text-sm font-bold uppercase tracking-wide border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white flex items-center gap-2"
              data-testid="toggle-reg-payments-btn"
            >
              <ReceiptIcon size={14}/> Abonos {regPaymentsOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          </div>
        </div>

        {regPaymentsOpen && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4" data-testid="reg-payments-panel">
            <div className="grid sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
                <div className="font-display text-xl font-black tabular-nums">{fmtCOP(regTotal)}</div>
              </div>
              <div className="bg-white border border-green-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-green-600">Pagado</div>
                <div className="font-display text-xl font-black text-green-700 tabular-nums" data-testid="reg-balance-paid">{fmtCOP(regPaidAmt)}</div>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-amber-600">Saldo</div>
                <div className="font-display text-xl font-black text-amber-700 tabular-nums" data-testid="reg-balance-remaining">{fmtCOP(regBalance)}</div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Historial de abonos</h3>
              <PaymentsList items={regPaymentsData?.items || []} />
            </div>
            {!regPaid && (
              regShowForm ? (
                <PaymentForm
                  targetType="team_registration"
                  targetId={team.id}
                  suggestedAmount={regBalance}
                  onCreated={onRegPaymentCreated}
                  onCancel={() => setRegShowForm(false)}
                />
              ) : (
                <button
                  onClick={() => setRegShowForm(true)}
                  className="fsc-btn-primary px-4 py-2 rounded-md text-xs flex items-center gap-2"
                  data-testid="register-reg-payment-btn"
                >
                  <ReceiptIcon size={14}/> Registrar abono (comprobante)
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* CTAs Cotización */}
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {(user.manager_role || "").trim().toLowerCase() !== "cuerpo técnico" ? (
          <Link to="/cotizar" className="bg-white border-2 border-slate-900 text-slate-900 rounded-xl p-4 hover:bg-slate-900 hover:text-white transition-colors" data-testid="cta-cotizar">
            <div className="text-xs font-bold uppercase tracking-[0.2em]">Armar paquete</div>
            <div className="font-display text-2xl font-black uppercase tracking-tight">Cotizar evento →</div>
          </Link>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl p-4" data-testid="cta-cotizar-blocked">
            <div className="text-xs font-bold uppercase tracking-[0.2em]">Cotizar evento</div>
            <div className="font-display text-sm uppercase tracking-tight mt-1">Solo el Directivo del club puede cotizar.</div>
          </div>
        )}
        <Link to="/mis-cotizaciones" className="bg-slate-900 text-white rounded-xl p-4 hover:bg-slate-800 transition-colors" data-testid="cta-mis-cotizaciones">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Historial</div>
          <div className="font-display text-2xl font-black uppercase tracking-tight">Mis cotizaciones →</div>
        </Link>
      </div>

      {/* Equipos del club */}
      <div className="mt-10" data-testid="club-teams-section">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight">Equipos de mi club ({clubTeams.length})</h2>
            <p className="text-xs text-slate-500 mt-1">Bajo el club <strong>{team.club_name || team.name}</strong> puedes inscribir varios equipos (otros años o A/B).</p>
          </div>
          <button onClick={() => setShowAddTeam(!showAddTeam)} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-club-team-btn">
            <Plus size={16}/> {showAddTeam ? "Cerrar" : "Agregar equipo"}
          </button>
        </div>

        {showAddTeam && (
          <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-5" data-testid="add-team-form">
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evento</span>
                <select value={newTeam.tournament_id} onChange={(e) => setNewTeam({ ...newTeam, tournament_id: e.target.value, category_name: "" })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="add-team-tournament">
                  <option value="">Seleccionar...</option>
                  {quoteTournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</span>
                <select value={newTeam.category_name} onChange={(e) => setNewTeam({ ...newTeam, category_name: e.target.value })} disabled={!newTournament || newCats.length === 0} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="add-team-category">
                  <option value="">Seleccionar...</option>
                  {newCats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del equipo</span>
                <input value={newTeam.team_name} onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })} placeholder="Ej: Halcones FC A" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="add-team-name" />
              </label>
            </div>
            {quoteTournaments.length === 0 && (
              <p className="text-xs text-amber-700 mt-3">No tienes cotizaciones aprobadas con eventos. Cotiza primero y espera la aprobación del admin para inscribir equipos.</p>
            )}
            {newFee > 0 && <p className="text-xs text-slate-600 mt-3">Inscripción: <strong className="text-blue-700">{fmtCOP(newFee)}</strong></p>}
            <button onClick={addTeamToClub} className="mt-3 fsc-btn-red px-5 py-2 rounded-md text-sm" data-testid="add-team-confirm">Crear equipo</button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clubTeams.map((t) => (
            <div key={t.id} className={`border rounded-lg p-3 ${t.id === teamId ? "border-blue-700 bg-blue-50/30" : "border-slate-200 bg-white"}`} data-testid={`club-team-${t.id}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{ {festival:"Festival", premier_par:"Premier Par", premier_impar:"Premier Impar"}[t.event_type] || t.event_type }</span>
                <StatusPill status={t.status} />
              </div>
              <div className="mt-1 font-display text-lg font-black uppercase tracking-tight">Año {t.birth_year}</div>
              <div className="text-xs text-slate-500">{t.designation}</div>
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-slate-500">Inscripción</span>
                <span className={`font-bold tabular-nums ${t.registration_payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>{t.registration_payment_status === "paid" ? "Pagada" : fmtCOP(t.registration_fee)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cuerpo técnico — agregado de todos los equipos del club */}
      <div className="mt-10" data-testid="staff-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight flex items-center gap-3"><Users2 size={28}/> Cuerpo técnico ({staff.length})</h2>
          <button onClick={() => setEditingStaff({ idx: null, data: { ...EMPTY_STAFF, team_id: clubTeams[0]?.id || teamId || "" } })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" disabled={clubTeams.length === 0} data-testid="add-staff-btn">
            <Plus size={16}/> Agregar
          </button>
        </div>
        {clubTeams.length === 0 && (
          <p className="text-xs text-amber-700">Primero crea un equipo en la sección de arriba para poder asignar cuerpo técnico.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.length === 0 && clubTeams.length > 0 && <p className="col-span-full text-center text-slate-400 py-6">Aún no has agregado al cuerpo técnico.</p>}
          {staff.map((s) => (
            <div key={`${s.team_id}-${s._idx}`} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3" data-testid={`staff-${s.team_id}-${s._idx}`}>
              {s.photo_url ? <img src={s.photo_url} alt={s.name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold uppercase">{(s.name || "?")[0]}</div>}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.role}{s.document ? ` · Doc ${s.document}` : ""}{s.phone ? ` · ${s.phone}` : ""}</div>
                <div className="text-[10px] uppercase tracking-widest text-fsc-azul mt-0.5">Equipo: {s.team_name}</div>
              </div>
              <button onClick={() => setEditingStaff({ idx: s._idx, data: { name: s.name, document: s.document || "", role: s.role || "Director técnico", phone: s.phone || "", team_id: s.team_id, photo_url: s.photo_url || "" } })} className="text-blue-700" data-testid={`staff-edit-${s.team_id}-${s._idx}`}><Pencil size={16}/></button>
              <button onClick={() => removeStaffMember(s.team_id, s._idx)} className="text-red-600" data-testid={`staff-remove-${s.team_id}-${s._idx}`}><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de gestión de jugadores */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight">Plantilla ({players.length})</h2>
          <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => { setBulkFile(e.target.files?.[0] || null); if (e.target.files?.[0]) uploadBulk(true); }} data-testid="bulk-upload-input" />
        </div>

        {!bulkPreview && (
          <div className="mb-6 grid md:grid-cols-2 gap-4" data-testid="player-actions-panel">
            {/* Acción individual */}
            <button
              onClick={() => setEditingPlayer({ ...EMPTY_PLAYER, team_id: teamId })}
              data-testid="add-player-btn"
              className="text-left bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl p-6 hover:shadow-xl hover:scale-[1.01] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Plus size={24}/>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-200">Crear de a uno</div>
                  <div className="font-display text-2xl font-black uppercase tracking-tight mt-0.5">Agregar jugador</div>
                  <p className="text-xs text-red-100 mt-2 leading-relaxed">Formulario completo con foto, dorsal, posición, EPS, datos del acudiente y autorizaciones.</p>
                </div>
              </div>
            </button>

            {/* Acción masiva */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <FileUp size={24}/>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-200">Carga masiva</div>
                  <div className="font-display text-2xl font-black uppercase tracking-tight mt-0.5">Importar desde Excel</div>
                  <p className="text-xs text-blue-100 mt-2 leading-relaxed">Excel con formato profesional: hojas separadas para <strong>Jugadores</strong> y <strong>Cuerpo Técnico</strong>.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={downloadTemplate} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide px-3 py-2 bg-white text-blue-800 rounded-md hover:bg-blue-50" data-testid="download-template-btn">
                      <Download size={14}/> 1) Descargar plantilla
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md ring-1 ring-blue-400" data-testid="bulk-upload-btn">
                      <FileUp size={14}/> 2) Subir archivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {bulkPreview && (
          <div className="mb-6 bg-white border-2 border-blue-700 rounded-xl p-5" data-testid="bulk-preview">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Vista previa de importación</div>
                <div className="font-display text-xl font-black uppercase tracking-tight">{bulkFile?.name}</div>
              </div>
              <button onClick={() => { setBulkPreview(null); setBulkFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-slate-400 hover:text-slate-700 text-sm">✕ Cancelar</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Jugadores</div>
                <div className="font-display text-3xl font-black text-green-600">{bulkPreview.players.ok}<span className="text-sm text-slate-400 font-bold ml-1">/ {bulkPreview.players.total}</span></div>
                {bulkPreview.players.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer font-semibold">{bulkPreview.players.errors.length} errores</summary>
                    <ul className="text-[11px] text-red-700 mt-1 space-y-0.5 max-h-32 overflow-auto">
                      {bulkPreview.players.errors.slice(0, 20).map((er, i) => <li key={`prow-${er.row}-${i}`}>Fila {er.row}: {er.error}</li>)}
                    </ul>
                  </details>
                )}
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cuerpo técnico</div>
                <div className="font-display text-3xl font-black text-green-600">{bulkPreview.staff.ok}<span className="text-sm text-slate-400 font-bold ml-1">/ {bulkPreview.staff.total}</span></div>
                {bulkPreview.staff.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer font-semibold">{bulkPreview.staff.errors.length} errores</summary>
                    <ul className="text-[11px] text-red-700 mt-1 space-y-0.5 max-h-32 overflow-auto">
                      {bulkPreview.staff.errors.slice(0, 20).map((er, i) => <li key={`srow-${er.row}-${i}`}>Fila {er.row}: {er.error}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>
            <button onClick={() => uploadBulk(false)} disabled={uploading} className="mt-4 fsc-btn-red w-full py-2 rounded-md text-sm disabled:opacity-50" data-testid="bulk-confirm-btn">
              {uploading ? "Importando..." : `Confirmar y guardar ${bulkPreview.players.ok} jugadores + ${bulkPreview.staff.ok} del staff`}
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Aún no has agregado jugadores.</p>}
          {players.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3" data-testid={`my-team-player-${p.id}`}>
              {p.photo_url ? <img src={imgSrc(p.photo_url)} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{p.name[0]}</div>}
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

      {/* Los carnets son gestionados únicamente por el administrador en /admin/carnets.
          Los roles Directivo y Cuerpo Técnico NO tienen permitido visualizar ni descargar carnets. */}

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
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo *</span>
              <select
                value={editingPlayer.team_id || ""}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, team_id: e.target.value })}
                disabled={!!editingPlayer.id}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100"
                data-testid="player-team-select"
              >
                <option value="">Seleccionar equipo...</option>
                {clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
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

      {editingStaff && (
        <Modal title={editingStaff.idx != null ? "Editar miembro" : "Nuevo miembro del cuerpo técnico"} onClose={() => setEditingStaff(null)}>
          <form onSubmit={saveStaff} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo *</span>
              <select
                value={editingStaff.data.team_id || ""}
                onChange={(e) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, team_id: e.target.value } })}
                disabled={editingStaff.idx != null}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100"
                data-testid="staff-team-select"
              >
                <option value="">Seleccionar equipo...</option>
                {clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <Field label="Nombre completo" required value={editingStaff.data.name} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, name: v } })} testId="staff-name-input" />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rol</span>
              <select value={editingStaff.data.role} onChange={(e) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, role: e.target.value } })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="staff-role-select">
                <option>Director técnico</option>
                <option>Asistente técnico</option>
                <option>Preparador físico</option>
                <option>Médico</option>
                <option>Fisioterapeuta</option>
                <option>Delegado</option>
                <option>Utilero</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Documento" value={editingStaff.data.document} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, document: v } })} testId="staff-document-input" />
              <Field label="Teléfono" value={editingStaff.data.phone} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, phone: v } })} testId="staff-phone-input" />
            </div>
            <ImageUpload value={editingStaff.data.photo_url} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, photo_url: v } })} label="Foto para el carnet (sin fondo)" testId="staff-photo-upload" />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-staff-btn">Guardar</button>
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


function FirstTeamCreator({ clubId, tournaments, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tournament_id: "", category_name: "", team_name: "" });
  const [saving, setSaving] = useState(false);
  const sel = tournaments.find((t) => t.id === form.tournament_id);
  const cats = sel?.categories || [];

  const submit = async () => {
    if (!form.tournament_id) return toast.error("Selecciona un evento");
    if (!form.category_name) return toast.error("Selecciona una categoría");
    if (!form.team_name.trim()) return toast.error("Escribe el nombre del equipo");
    setSaving(true);
    try {
      await api.post(`/clubs/${clubId}/teams`, form);
      toast.success("Equipo creado");
      setOpen(false);
      setForm({ tournament_id: "", category_name: "", team_name: "" });
      onCreated?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al crear equipo");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-8" data-testid="first-team-cta-wrapper">
        <button onClick={() => setOpen(true)} className="fsc-btn-primary px-5 py-2.5 rounded-md text-sm inline-flex items-center gap-2" data-testid="first-team-cta">
          <Plus size={16}/> Agregar equipo
        </button>
        {tournaments.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">No hay eventos disponibles. El admin debe aprobar primero una cotización con eventos para que puedas inscribir equipos.</p>
        )}
      </div>
    );
  }
  return (
    <div className="mt-8 bg-white border-2 border-fsc-azul rounded-xl p-5" data-testid="first-team-form">
      <h3 className="font-display text-xl font-black uppercase tracking-tight mb-3">Crear equipo</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Evento</span>
          <select value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value, category_name: "" })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="first-team-tournament">
            <option value="">— Seleccionar</option>
            {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</span>
          <select value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} disabled={!sel || cats.length === 0} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="first-team-category">
            <option value="">—</option>
            {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del equipo</span>
          <input value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })} placeholder="Ej: Halcones FC Sub-12 A" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="first-team-name" />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={saving} className="fsc-btn-red px-5 py-2 rounded-md text-sm disabled:opacity-50" data-testid="first-team-confirm">{saving ? "Creando..." : "Crear equipo"}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
      </div>
    </div>
  );
}
