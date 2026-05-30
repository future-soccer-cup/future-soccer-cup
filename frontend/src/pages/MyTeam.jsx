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
import CarnetSheet from "../components/CarnetSheet";

const EMPTY_PLAYER = { name: "", team_id: "", jersey_number: 1, position: "Mediocampista", birth_date: "", photo_url: "", document_id: "", nickname: "", gender: "", eps: "", guardian_name: "", guardian_doc: "", guardian_relation: "", guardian_phone: "" };
const EMPTY_STAFF = { name: "", document: "", role: "Director técnico", phone: "" };
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
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ event_type: "", birth_year: "", designation: "Único" });
  const [club, setClub] = useState(null);

  const teamId = user?.team_id;

  const loadTeam = async () => {
    if (!teamId) return;
    let tdata = null;
    try {
      const t = await api.get(`/teams/${teamId}`);
      tdata = t.data;
      setTeam(tdata);
      setTeamForm(tdata);
    } catch (err) {
      // Team huérfano (404) o cualquier otro error: mantenemos team=null y mostramos estado vacío.
      setTeam(null);
      return;
    }
    try {
      const p = await api.get(`/players?team_id=${teamId}`);
      setPlayers(p.data);
    } catch { /* silent */ }
    // Load other teams in same club + the club itself (status)
    if (tdata && tdata.club_id) {
      const [ct, cl] = await Promise.all([
        api.get(`/clubs/${tdata.club_id}/teams`).catch(() => ({ data: [] })),
        api.get(`/clubs/${tdata.club_id}`).catch(() => ({ data: null })),
      ]);
      setClubTeams(ct.data);
      setClub(cl.data);
    }
  };

  useEffect(() => {
    loadTeam();
    api.get("/event-types").then((r) => setEvents(r.data.events || [])).catch(() => {});
    /* eslint-disable-next-line */
  }, [teamId]);

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

  const saveStaff = async (e) => {
    e.preventDefault();
    try {
      const list = Array.isArray(team.cuerpo_tecnico) ? [...team.cuerpo_tecnico] : [];
      if (editingStaff.idx != null) list[editingStaff.idx] = editingStaff.data;
      else list.push(editingStaff.data);
      await api.put(`/teams/${teamId}`, { ...team, cuerpo_tecnico: list });
      toast.success("Guardado");
      setEditingStaff(null);
      loadTeam();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const removeStaff = async (idx) => {
    if (!window.confirm("¿Eliminar miembro del cuerpo técnico?")) return;
    const list = (team.cuerpo_tecnico || []).filter((_, i) => i !== idx);
    await api.put(`/teams/${teamId}`, { ...team, cuerpo_tecnico: list });
    loadTeam();
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
  const staff = Array.isArray(team.cuerpo_tecnico) ? team.cuerpo_tecnico : [];

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

  const newEvent = events.find((e) => e.id === newTeam.event_type);
  const newYears = newEvent?.birth_years || [];
  const newFee = newEvent?.fees_by_year?.[String(newTeam.birth_year)] || 0;

  const addTeamToClub = async () => {
    if (!team.club_id) return toast.error("Tu equipo aún no está vinculado a un club");
    if (!newTeam.event_type || !newTeam.birth_year) return toast.error("Completa evento y año");
    try {
      await api.post(`/clubs/${team.club_id}/teams`, { ...newTeam, birth_year: Number(newTeam.birth_year) });
      toast.success("Equipo agregado al club");
      setShowAddTeam(false);
      setNewTeam({ event_type: "", birth_year: "", designation: "Único" });
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
        <Link to="/cotizar" className="bg-white border-2 border-slate-900 text-slate-900 rounded-xl p-4 hover:bg-slate-900 hover:text-white transition-colors" data-testid="cta-cotizar">
          <div className="text-xs font-bold uppercase tracking-[0.2em]">Armar paquete</div>
          <div className="font-display text-2xl font-black uppercase tracking-tight">Cotizar evento →</div>
        </Link>
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
                <select value={newTeam.event_type} onChange={(e) => setNewTeam({ ...newTeam, event_type: e.target.value, birth_year: "" })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="add-team-event">
                  <option value="">Seleccionar...</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Año</span>
                <select value={newTeam.birth_year} onChange={(e) => setNewTeam({ ...newTeam, birth_year: e.target.value })} disabled={!newEvent} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-100" data-testid="add-team-year">
                  <option value="">Seleccionar...</option>
                  {newYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Designación</span>
                <select value={newTeam.designation} onChange={(e) => setNewTeam({ ...newTeam, designation: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="add-team-designation">
                  <option>Único</option>
                  <option>Equipo A</option>
                  <option>Equipo B</option>
                </select>
              </label>
            </div>
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

      {/* Cuerpo técnico */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight flex items-center gap-3"><Users2 size={28}/> Cuerpo técnico ({staff.length})</h2>
          <button onClick={() => setEditingStaff({ idx: null, data: { ...EMPTY_STAFF } })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-staff-btn">
            <Plus size={16}/> Agregar
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.length === 0 && <p className="col-span-full text-center text-slate-400 py-6">Aún no has agregado al cuerpo técnico.</p>}
          {staff.map((s, idx) => (
            <div key={s.document || `${s.name}-${idx}`} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3" data-testid={`staff-${idx}`}>
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold uppercase">{(s.name || "?")[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.role}{s.document ? ` · Doc ${s.document}` : ""}{s.phone ? ` · ${s.phone}` : ""}</div>
              </div>
              <button onClick={() => setEditingStaff({ idx, data: { ...s } })} className="text-blue-700"><Pencil size={16}/></button>
              <button onClick={() => removeStaff(idx)} className="text-red-600"><Trash2 size={16}/></button>
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

      {/* Carnets del equipo */}
      <div className="mt-12 border-t border-slate-200 pt-10">
        <CarnetSheet
          players={players.filter((p) => !p.status || p.status === "aprobado")}
          teams={team ? [team] : []}
          lockedTeamId={teamId}
          title="Carnets del equipo"
          testIdPrefix="myteam-carnet"
          readonly={true}
        />
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

      {editingStaff && (
        <Modal title={editingStaff.idx != null ? "Editar miembro" : "Nuevo miembro del cuerpo técnico"} onClose={() => setEditingStaff(null)}>
          <form onSubmit={saveStaff} className="space-y-3">
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
              <Field label="Documento" value={editingStaff.data.document} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, document: v } })} />
              <Field label="Teléfono" value={editingStaff.data.phone} onChange={(v) => setEditingStaff({ ...editingStaff, data: { ...editingStaff.data, phone: v } })} />
            </div>
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
