import { useEffect, useMemo, useState, useCallback } from "react";
import api, { formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Wand2, Save, Plus, X, Trophy, MapPin, Edit2, Trash2, ListChecks, RefreshCw, Shuffle } from "lucide-react";
import VenuePicker from "../../components/VenuePicker";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { formatDate, formatDateTime } from "../../lib/dateFormat";
import { getFixtureMatrix, withRounds } from "../../lib/fixtureMatrices";

export default function AdminFixtureGenerator() {
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [teams, setTeams] = useState([]);
  const [category, setCategory] = useState("");
  const [groupName, setGroupName] = useState("Grupo A");
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [daysBetween, setDaysBetween] = useState(1); // Iter50: semánticamente "fechas por día" (matchdays_per_day)
  const [rounds, setRounds] = useState(1);
  const [venues, setVenues] = useState([""]);
  const [slots, setSlots] = useState(["10:00"]);
  const [rules, setRules] = useState({ points_win: 3, points_draw: 1, points_loss: 0, fairplay_base: 200, fairplay_yellow: 10, fairplay_red: 20, fairplay_other: 5 });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  // Lista de fixtures ya guardados
  const [savedFixtures, setSavedFixtures] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  // Edición de un fixture guardado (cargar sus partidos)
  const [editingFixtureId, setEditingFixtureId] = useState(null);
  const [editingMatches, setEditingMatches] = useState([]);
  const [editingLoading, setEditingLoading] = useState(false);
  // Canchas persistidas en el fixture que se está editando (para el <select> del editor).
  const [editingVenues, setEditingVenues] = useState([]);
  // Iter45: modal de sorteo/asignación manual de posiciones.
  const [seedingOpen, setSeedingOpen] = useState(false);
  const [seeding, setSeeding] = useState([]); // array de team_ids por posición (índice 0-based, DESCANSA representado como string "__DESCANSA__")
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/tournaments"),
      api.get("/teams"),
    ]).then(([trs, ts]) => {
      setTournaments((trs.data || []).filter((t) => !t.archived));
      setTeams(ts.data || []);
    });
  }, []);

  const reloadFixtures = useCallback(async () => {
    setSavedLoading(true);
    try {
      const r = await api.get("/fixtures");
      setSavedFixtures(r.data || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSavedLoading(false);
    }
  }, []);
  useEffect(() => { reloadFixtures(); }, [reloadFixtures]);

  const tournament = useMemo(() => tournaments.find((t) => t.id === tournamentId), [tournaments, tournamentId]);

  useEffect(() => {
    if (!tournament || !category) return;
    const cat = (tournament.categories || []).find((c) => c.name === category);
    if (cat) {
      setRules({
        points_win: cat.points_win ?? 3,
        points_draw: cat.points_draw ?? 1,
        points_loss: cat.points_loss ?? 0,
        fairplay_base: cat.fairplay_base ?? 200,
        fairplay_yellow: cat.fairplay_yellow ?? 10,
        fairplay_red: cat.fairplay_red ?? 20,
        fairplay_other: cat.fairplay_other ?? 5,
      });
    }
  }, [tournament, category]);

  const tournamentCategories = useMemo(() => {
    if (!tournament) return [];
    const cats = (tournament.categories || []).map((c) => c.name).filter(Boolean);
    if (cats.length) return cats;
    return tournament.category ? [tournament.category] : [];
  }, [tournament]);

  // Iter49: los equipos disponibles son los que coinciden con la categoría del torneo
  // seleccionado. Si tienen `tournament_id` explícito, debe coincidir con el elegido;
  // si NO tienen `tournament_id` (típico de la carga masiva), se muestran igual —
  // así los equipos importados vía XLSX no quedan invisibles en el generador.
  const filtered = (tournamentId && category)
    ? teams.filter((t) => (t.category === category) && (!t.tournament_id || t.tournament_id === tournamentId))
    : [];

  const toggleTeam = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Iter45: abrir el sorteo/asignación manual antes de generar.
  const openSeeding = () => {
    if (!tournamentId) { toast.error("Selecciona un Evento"); return; }
    if (!category) { toast.error("Selecciona una Categoría"); return; }
    if (selectedIds.length < 2) { toast.error("Selecciona al menos 2 equipos"); return; }
    if (!startDate) { toast.error("Indica la fecha de inicio"); return; }
    if (endDate && startDate && endDate < startDate) {
      setDateError("La fecha fin no puede ser anterior a la fecha de inicio.");
      return;
    }
    setDateError("");
    // Iter47: TODAS las posiciones arrancan vacías — el admin debe elegir manualmente cada equipo.
    // Si N es impar, se agrega una posición extra "DESCANSA" (equipo sintético) al final.
    const N = selectedIds.length;
    const initial = new Array(N).fill("");
    if (N % 2 === 1) initial.push("__DESCANSA__");
    setSeeding(initial);
    setSeedingOpen(true);
  };

  const generate = async (saveIt, opts = {}) => {
    if (!tournamentId) { toast.error("Selecciona un Evento"); return; }
    if (!category) { toast.error("Selecciona una Categoría"); return; }
    setLoading(true);
    try {
      // Iter45: si el admin ya asignó posiciones (opts.matrix + opts.orderedTeamIds), usarlas.
      const teamIdsToSend = opts.orderedTeamIds || selectedIds;
      const body = {
        tournament_id: tournamentId,
        category,
        group_name: groupName,
        team_ids: teamIdsToSend,
        start_date: startDate,
        end_date: endDate || null,
        days_between_rounds: 1, // legacy — ignorado por backend cuando matchdays_per_day está presente
        matchdays_per_day: Number(daysBetween) || 1,
        rounds: Number(rounds) || 1,
        venues: venues.filter(Boolean),
        time_slots: slots.filter(Boolean),
        ...rules,
        preview: !saveIt,
      };
      if (opts.matrix) body.matrix_matches = opts.matrix;
      const res = await api.post("/fixtures/generate", body);
      setPreview(res.data);
      if (saveIt) {
        toast.success(`Fixture creado: ${res.data.matches.length} partidos en ${res.data.rounds} jornadas`);
        reloadFixtures();
      } else {
        toast.success("Vista previa generada — puedes editar cada partido antes de guardar");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const confirmSeeding = async () => {
    // Los slots vacíos (DESCANSA) NO forman parte de team_ids reales, solo de la matriz.
    const realIds = seeding.filter((s) => s && s !== "__DESCANSA__");
    if (new Set(realIds).size !== realIds.length) {
      toast.error("Hay equipos duplicados en el sorteo. Corrígelo antes de continuar.");
      return;
    }
    if (realIds.length !== selectedIds.length) {
      toast.error("Falta asignar equipos a alguna posición.");
      return;
    }
    // Construir la matriz aplicando las posiciones asignadas.
    // La matriz base usa posiciones 1..N (o 1..N+1 si hay DESCANSA).
    const totalPositions = seeding.length;
    const baseMatrix = getFixtureMatrix(seeding.filter((s) => s !== "__DESCANSA__").length);
    const matrix = withRounds(baseMatrix, rounds);
    // Enviamos team_ids en el orden del sorteo (excluyendo DESCANSA). El backend
    // ignora los partidos cuya posición supere la longitud de team_ids (o sea, los "DESCANSA").
    // Mapa posición → team_id (o null si es DESCANSA).
    const orderedTeamIds = seeding.filter((s) => s !== "__DESCANSA__");
    // Si la matriz usa una posición que apunta a DESCANSA (índice `totalPositions` cuando hay N impar),
    // esa posición es > orderedTeamIds.length y el backend la descartará automáticamente.
    setSeedingOpen(false);
    await generate(false, { matrix, orderedTeamIds });
  };

  // Editar campo de un partido en la VISTA PREVIA (en memoria, antes de guardar)
  const updatePreviewMatch = (mid, patch) => {
    setPreview((p) => p ? { ...p, matches: p.matches.map((m) => m.id === mid ? { ...m, ...patch } : m) } : p);
  };

  // Editar y guardar un partido YA persistido (fixture guardado)
  const persistMatch = async (mid, patch) => {
    try {
      // Normalizar match_date: si viene "YYYY-MM-DDTHH:MM", el backend lo acepta.
      const body = { ...patch };
      await api.put(`/matches/${mid}`, body);
      toast.success("Partido actualizado");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const openFixtureEditor = async (fix) => {
    setEditingFixtureId(fix.id);
    setEditingLoading(true);
    setEditingMatches([]);
    setEditingVenues([]);
    try {
      const r = await api.get(`/fixtures/${fix.id}/matches`);
      setEditingMatches(r.data.matches || []);
      const fx = r.data.fixture || {};
      const venuesFromFixture = Array.isArray(fx.venues) && fx.venues.length > 0
        ? fx.venues
        : Array.from(new Set((r.data.matches || []).map((m) => m.venue).filter(Boolean)));
      setEditingVenues(venuesFromFixture);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setEditingLoading(false);
    }
  };

  const deleteFixture = async (fix) => {
    try {
      const r = await api.delete(`/fixtures/${fix.id}`);
      const parts = [`${r.data.matches_deleted || 0} partidos`];
      if ((r.data.standings_deleted || 0) > 0) parts.push(`${r.data.standings_deleted} filas de tabla`);
      toast.success(`Fixture eliminado (${parts.join(", ")}). Tabla de posiciones y juego limpio reseteadas.`);
      if (editingFixtureId === fix.id) {
        setEditingFixtureId(null);
        setEditingMatches([]);
        setEditingVenues([]);
      }
      reloadFixtures();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      throw err;
    }
  };

  return (
    <div data-testid="fixture-generator">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Generar Fixture</h1>
        <p className="text-sm text-slate-500 mt-1">Selecciona un Evento activo, luego la Categoría y los equipos. La vista previa es editable: puedes ajustar fecha, hora y cancha de cada partido antes de guardar.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1"><Trophy size={12}/> Paso 1 · Evento activo</span>
            <select required value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setCategory(""); setSelectedIds([]); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-tournament">
              <option value="">Seleccionar evento...</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.season}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Paso 2 · Categoría</span>
            <select required value={category} onChange={(e) => { setCategory(e.target.value); setSelectedIds([]); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-50" disabled={!tournamentId} data-testid="fg-category">
              <option value="">{tournamentId ? "Seleccionar categoría..." : "Primero elige el evento"}</option>
              {tournamentCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Paso 3 · Grupo</span>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Grupo A / Unigrupo" data-testid="fg-group" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha inicio</span>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-start-date" />
              {startDate && <span className="text-[10px] text-slate-400 mt-0.5 block">{formatDate(startDate)}</span>}
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha fin</span>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateError(""); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-end-date" />
              {endDate && <span className="text-[10px] text-slate-400 mt-0.5 block">{formatDate(endDate)}</span>}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fechas por día</span>
              <input type="number" min="1" value={daysBetween} onChange={(e) => setDaysBetween(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-days" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vueltas</span>
              <input type="number" min="1" max="4" value={rounds} onChange={(e) => setRounds(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-rounds" />
            </label>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1"><MapPin size={12}/> Canchas</span>
            <div className="mt-1 space-y-1.5">
              {venues.map((v, i) => (
                <div key={i} className="flex items-center gap-1">
                  <VenuePicker value={v} onChange={(name) => { const next = [...venues]; next[i] = name; setVenues(next); }} testId={`fg-venue-${i}`} />
                  <button type="button" onClick={() => { const next = [...venues]; next.splice(i, 1); setVenues(next.length ? next : [""]); }} className="px-2 text-slate-400 hover:text-red-600"><X size={14}/></button>
                </div>
              ))}
              <button type="button" onClick={() => setVenues([...venues, ""])} className="text-xs font-bold text-blue-700 flex items-center gap-1" data-testid="fg-venues-add"><Plus size={12}/> Otra cancha</button>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Horarios</span>
            <div className="mt-1 space-y-1.5">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={s} onChange={(e) => { const next = [...slots]; next[i] = e.target.value; setSlots(next); }} placeholder="10:00" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm" data-testid={`fg-slot-${i}`} />
                  <button type="button" onClick={() => { const next = [...slots]; next.splice(i, 1); setSlots(next.length ? next : ["10:00"]); }} className="px-2 text-slate-400 hover:text-red-600"><X size={14}/></button>
                </div>
              ))}
              <button type="button" onClick={() => setSlots([...slots, "10:00"])} className="text-xs font-bold text-blue-700 flex items-center gap-1" data-testid="fg-slots-add"><Plus size={12}/> Agregar horario</button>
            </div>
          </div>

          <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-lg p-3" data-testid="fg-rules-box">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2">Reglas deportivas para este fixture</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <NumField label="Pts G" value={rules.points_win} onChange={(v) => setRules({ ...rules, points_win: v })} testId="fg-pts-win" />
              <NumField label="Pts E" value={rules.points_draw} onChange={(v) => setRules({ ...rules, points_draw: v })} testId="fg-pts-draw" />
              <NumField label="Pts P" value={rules.points_loss} onChange={(v) => setRules({ ...rules, points_loss: v })} testId="fg-pts-loss" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <NumField label="J.L base" value={rules.fairplay_base} onChange={(v) => setRules({ ...rules, fairplay_base: v })} testId="fg-fp-base" />
              <NumField label="− Amar." value={rules.fairplay_yellow} onChange={(v) => setRules({ ...rules, fairplay_yellow: v })} testId="fg-fp-yellow" />
              <NumField label="− Roja" value={rules.fairplay_red} onChange={(v) => setRules({ ...rules, fairplay_red: v })} testId="fg-fp-red" />
              <NumField label="− Otra" value={rules.fairplay_other} onChange={(v) => setRules({ ...rules, fairplay_other: v })} testId="fg-fp-other" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={openSeeding} disabled={loading} className="flex-1 fsc-btn-primary py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid="fg-preview-btn">
              <Wand2 size={16}/> {loading ? "..." : "Vista previa"}
            </button>
            {preview && !preview.saved && (
              <button onClick={() => generate(true)} disabled={loading} className="flex-1 fsc-btn-red py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid="fg-save-btn">
                <Save size={16}/> Guardar
              </button>
            )}
          </div>
          {dateError && (
            <p className="text-xs font-bold text-red-600 mt-1" data-testid="fg-date-error">{dateError}</p>
          )}
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Equipos {category && `(${category})`}</h3>
            <span className="text-xs font-bold text-blue-700">{selectedIds.length} seleccionados</span>
          </div>
          {(!tournamentId || !category) ? (
            <p className="text-sm text-slate-400 py-6 text-center">Selecciona Evento y Categoría primero.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No hay equipos inscritos en esta categoría para este evento.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-1.5">
              {filtered.map((t) => (
                <label key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer" data-testid={`fg-team-${t.id}`}>
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                  <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-display font-black text-white" style={{ background: t.color || "#1d4ed8" }}>
                    {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : t.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.group_name || "—"} {t.birth_year && `· ${t.birth_year}`}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-slate-900 text-white rounded-xl p-5 fsc-stripe-blue">
          <h3 className="font-display text-lg font-black uppercase tracking-tight mb-3">Resumen</h3>
          {!preview && <p className="text-sm text-slate-400">Genera una vista previa para ver los partidos.</p>}
          {preview && (
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-400">Evento</span><span className="font-display font-black text-right text-sm">{tournament?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Categoría</span><span className="font-display font-black">{category}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Equipos</span><span className="font-display text-2xl font-black">{selectedIds.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Vueltas</span><span className="font-display text-2xl font-black">{rounds}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Jornadas</span><span className="font-display text-2xl font-black">{preview.rounds}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Partidos</span><span className="font-display text-2xl font-black">{preview.matches.length}</span></div>
              {startDate && <div className="flex justify-between"><span className="text-slate-400">Inicio</span><span>{formatDate(startDate)}</span></div>}
              {endDate && <div className="flex justify-between"><span className="text-slate-400">Fin</span><span>{formatDate(endDate)}</span></div>}
              {preview.saved && <div className="mt-3 px-3 py-2 bg-green-500/20 text-green-300 rounded text-xs font-bold uppercase tracking-wider">Guardado en el sistema</div>}
            </div>
          )}
        </div>
      </div>

      {preview && !preview.saved && (
        <div className="mt-8" data-testid="fg-preview-editable">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight mb-1">Vista previa (editable)</h3>
          <p className="text-xs text-slate-500 mb-3">Ajusta fecha/hora y cancha de cada partido. Al pulsar <b>Guardar</b> arriba se persiste todo el fixture con tus cambios.</p>
          <PreviewEditableTable matches={preview.matches} venues={venues.filter(Boolean)} onChange={updatePreviewMatch} />
        </div>
      )}

      {preview && preview.saved && (
        <div className="mt-8" data-testid="fg-preview-saved">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight mb-3">Partidos generados</h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider">
                <tr><th className="text-left px-4 py-2">Jornada</th><th className="text-left px-4 py-2">Fecha</th><th className="text-right px-4 py-2">Local</th><th className="text-center px-4 py-2">vs</th><th className="text-left px-4 py-2">Visitante</th><th className="text-left px-4 py-2">Cancha</th></tr>
              </thead>
              <tbody>
                {preview.matches.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100" data-testid={`fg-match-${m.id}`}>
                    <td className="px-4 py-2 font-display font-black text-blue-700">FECHA {m.matchday}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDateTime(m.match_date)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{m.home_team_name}</td>
                    <td className="px-4 py-2 text-center text-slate-400">vs</td>
                    <td className="px-4 py-2 font-semibold">{m.away_team_name}</td>
                    <td className="px-4 py-2 text-slate-500">{m.venue || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== FIXTURES GUARDADOS ============== */}
      <div className="mt-12" data-testid="saved-fixtures-section">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <ListChecks size={22}/> Fixtures guardados ({savedFixtures.length})
          </h3>
          <button onClick={reloadFixtures} disabled={savedLoading} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50" data-testid="saved-fixtures-refresh">
            <RefreshCw size={12} className={savedLoading ? "animate-spin" : ""}/> Recargar
          </button>
        </div>
        {savedFixtures.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">Aún no hay fixtures guardados.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Evento</th>
                  <th className="text-left px-3 py-2">Categoría</th>
                  <th className="text-left px-3 py-2">Grupo</th>
                  <th className="text-left px-3 py-2">Inicio</th>
                  <th className="text-left px-3 py-2">Fin</th>
                  <th className="text-center px-3 py-2">Equipos</th>
                  <th className="text-center px-3 py-2">Partidos</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {savedFixtures.map((f) => (
                  <tr key={f.id} className="border-t border-slate-100" data-testid={`saved-fixture-${f.id}`}>
                    <td className="px-3 py-2 font-semibold">{f.tournament_name || "—"}</td>
                    <td className="px-3 py-2">{f.category}</td>
                    <td className="px-3 py-2">{f.group_name}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(f.start_date)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(f.end_date)}</td>
                    <td className="px-3 py-2 text-center">{(f.team_ids || []).length}</td>
                    <td className="px-3 py-2 text-center">{f.active_matches ?? f.matches_count ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => openFixtureEditor(f)} className="px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 mr-1" data-testid={`saved-fixture-edit-${f.id}`}><Edit2 size={12} className="inline -mt-0.5 mr-1"/>Editar</button>
                      <ConfirmDeleteDialog
                        trigger={
                          <button
                            className="px-2 py-1 text-xs font-bold rounded bg-red-50 text-red-700 hover:bg-red-100"
                            data-testid={`saved-fixture-delete-${f.id}`}
                          >
                            <Trash2 size={12} className="inline -mt-0.5"/>
                          </button>
                        }
                        title={`Eliminar fixture · ${f.category} ${f.group_name}`}
                        description={
                          <span>
                            Se eliminará el fixture <strong>"{f.tournament_name} · {f.category} · {f.group_name}"</strong>,{" "}
                            <strong>todos sus partidos</strong> ({f.matches_count ?? 0}, incluidos los finalizados),
                            y la <strong>tabla de clasificación</strong> y <strong>tabla de juego limpio</strong> de este grupo se resetearán.
                            <br/><br/>Esta acción no se puede deshacer.
                          </span>
                        }
                        onConfirm={() => deleteFixture(f)}
                        testIdPrefix={`fixture-delete-modal-${f.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingFixtureId && (
          <div className="mt-6 bg-white border border-blue-300 rounded-xl p-5" data-testid="fixture-editor">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-xl font-black uppercase tracking-tight">Editar partidos del fixture</h4>
              <button onClick={() => { setEditingFixtureId(null); setEditingMatches([]); }} className="text-slate-500 hover:text-slate-900" data-testid="fixture-editor-close"><X size={18}/></button>
            </div>
            {editingLoading ? (
              <p className="text-sm text-slate-500 py-6 text-center">Cargando...</p>
            ) : editingMatches.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Sin partidos.</p>
            ) : (
              <EditableMatchesTable matches={editingMatches} venues={(editingVenues.length > 0 ? editingVenues : venues.filter(Boolean))} onPersist={persistMatch} onLocalChange={(mid, patch) => setEditingMatches((ms) => ms.map((m) => m.id === mid ? { ...m, ...patch } : m))} />
            )}
          </div>
        )}
      </div>

      {seedingOpen && (
        <SeedingModal
          seeding={seeding}
          setSeeding={setSeeding}
          teams={teams}
          selectedIds={selectedIds}
          rounds={Number(rounds) || 1}
          onCancel={() => setSeedingOpen(false)}
          onConfirm={confirmSeeding}
        />
      )}
    </div>
  );
}


function PreviewEditableTable({ matches, venues, onChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-blue-50 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-2 py-2">FECHAS</th>
            <th className="text-left px-2 py-2">Fecha + hora</th>
            <th className="text-right px-2 py-2">Local</th>
            <th className="text-center px-1 py-2">vs</th>
            <th className="text-left px-2 py-2">Visitante</th>
            <th className="text-left px-2 py-2">Cancha</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const isBye = m.is_bye || m.status === "descansa" || m.home_team_id === "__BYE__" || m.away_team_id === "__BYE__";
            const dtVal = (m.match_date || "").slice(0, 16);
            const dateOnly = (m.match_date || "").slice(0, 10);
            return (
              <tr key={m.id} className={`border-t border-slate-100 ${isBye ? "bg-amber-50/60" : ""}`} data-testid={`fg-preview-row-${m.id}`}>
                <td className="px-2 py-2 font-display font-black text-blue-700">FECHA {m.matchday}</td>
                <td className="px-2 py-2">
                  {isBye ? (
                    <input type="date" value={dateOnly} onChange={(e) => onChange(m.id, { match_date: `${e.target.value}T00:00` })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-amber-50" data-testid={`fg-preview-date-${m.id}`} />
                  ) : (
                    <input type="datetime-local" value={dtVal} onChange={(e) => onChange(m.id, { match_date: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" data-testid={`fg-preview-date-${m.id}`} />
                  )}
                </td>
                <td className="px-2 py-2 text-right font-semibold">{m.home_team_name}</td>
                <td className="px-1 py-2 text-center text-slate-400">{isBye ? <span className="text-amber-600 uppercase text-[10px]">descansa</span> : "vs"}</td>
                <td className="px-2 py-2 font-semibold">{m.away_team_name}</td>
                <td className="px-2 py-2">
                  {isBye ? (
                    <span className="text-slate-400 text-xs italic">— sin cancha —</span>
                  ) : (
                    <select
                      value={m.venue || ""}
                      onChange={(e) => onChange(m.id, { venue: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                      data-testid={`fg-preview-venue-${m.id}`}
                    >
                      <option value="">— Sin cancha —</option>
                      {venues.map((v) => <option key={v} value={v}>{v}</option>)}
                      {m.venue && !venues.includes(m.venue) && (
                        <option value={m.venue}>{m.venue}</option>
                      )}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function EditableMatchesTable({ matches, venues, onPersist, onLocalChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-blue-50 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-2 py-2">FECHAS</th>
            <th className="text-left px-2 py-2">Fecha + hora</th>
            <th className="text-right px-2 py-2">Local</th>
            <th className="text-center px-1 py-2">vs</th>
            <th className="text-left px-2 py-2">Visitante</th>
            <th className="text-left px-2 py-2">Cancha</th>
            <th className="text-right px-2 py-2">Acción</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const dtVal = (m.match_date || "").slice(0, 16);
            return (
              <tr key={m.id} className="border-t border-slate-100" data-testid={`editor-row-${m.id}`}>
                <td className="px-2 py-2 font-display font-black text-blue-700">FECHA {m.matchday}</td>
                <td className="px-2 py-2">
                  <input type="datetime-local" value={dtVal} onChange={(e) => onLocalChange(m.id, { match_date: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" data-testid={`editor-date-${m.id}`} />
                </td>
                <td className="px-2 py-2 text-right font-semibold">{m.home_team_name}</td>
                <td className="px-1 py-2 text-center text-slate-400">vs</td>
                <td className="px-2 py-2 font-semibold">{m.away_team_name}</td>
                <td className="px-2 py-2">
                  <select
                    value={m.venue || ""}
                    onChange={(e) => onLocalChange(m.id, { venue: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                    data-testid={`editor-venue-${m.id}`}
                  >
                    <option value="">— Sin cancha —</option>
                    {venues.map((v) => <option key={v} value={v}>{v}</option>)}
                    {m.venue && !venues.includes(m.venue) && (
                      <option value={m.venue}>{m.venue}</option>
                    )}
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => onPersist(m.id, { match_date: m.match_date, venue: m.venue })} className="px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700" data-testid={`editor-save-${m.id}`}>Guardar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function NumField({ label, value, onChange, testId }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm tabular-nums"
        data-testid={testId}
      />
    </label>
  );
}


/**
 * Modal de sorteo: el admin asigna cada equipo a una posición (1..N).
 * Si N es impar, se agrega "DESCANSA" al final. A la derecha se muestra
 * la matriz en tiempo real: los números de posición se reemplazan por los
 * nombres de los equipos apenas se asignan.
 */
function SeedingModal({ seeding, setSeeding, teams, selectedIds, rounds, onCancel, onConfirm }) {
  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const totalPositions = seeding.length;
  const realCount = seeding.filter((s) => s !== "__DESCANSA__").length;
  const baseMatrix = getFixtureMatrix(realCount);
  const matrix = withRounds(baseMatrix, rounds);

  // Etiqueta de una posición (1..N) según lo que el admin haya asignado.
  const labelFor = (pos) => {
    const idx = pos - 1;
    if (idx < 0 || idx >= seeding.length) return `Pos. ${pos}`;
    const val = seeding[idx];
    if (val === "__DESCANSA__") return "DESCANSA";
    if (!val) return `Pos. ${pos}`;
    return tmap[val]?.name || `Pos. ${pos}`;
  };

  const availableForSlot = (idx) => {
    // Todos los equipos seleccionados que aún no están en otra posición (excepto la actual)
    return selectedIds.filter((id) => !seeding.includes(id) || seeding[idx] === id);
  };

  const setAtSlot = (idx, teamId) => {
    const next = [...seeding];
    next[idx] = teamId;
    setSeeding(next);
  };

  // Agrupar la matriz por matchday para mostrar preview
  const byMd = matrix.reduce((acc, it) => {
    (acc[it.matchday] = acc[it.matchday] || []).push(it);
    return acc;
  }, {});

  const readyToConfirm = seeding.every((s) => !!s);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="seeding-modal">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Shuffle size={18} className="text-fsc-azul"/> Sorteo — Asignar posiciones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Asigna cada equipo a una posición. La matriz de fixture de la derecha se actualiza en tiempo real.
              {totalPositions > realCount && <span className="text-amber-700 font-bold ml-1">Número impar: se agregó una posición "DESCANSA".</span>}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-900" data-testid="seeding-close"><X size={22}/></button>
        </div>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-0">
          {/* Panel izquierdo: asignación */}
          <div className="p-5 border-r border-slate-200">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Posiciones</h4>
            <div className="space-y-2">
              {seeding.map((val, idx) => (
                <div key={idx} className="flex items-center gap-3" data-testid={`seeding-slot-${idx + 1}`}>
                  <div className="w-16 shrink-0 font-display text-2xl font-black text-fsc-azul tabular-nums">
                    {val === "__DESCANSA__" ? "D" : idx + 1}
                  </div>
                  {val === "__DESCANSA__" ? (
                    <div className="flex-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded font-bold text-amber-700 uppercase text-sm tracking-wide">
                      DESCANSA (equipo sintético)
                    </div>
                  ) : (
                    <select
                      value={val || ""}
                      onChange={(e) => setAtSlot(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                      data-testid={`seeding-select-${idx + 1}`}
                    >
                      <option value="">— Elegir equipo —</option>
                      {availableForSlot(idx).map((id) => (
                        <option key={id} value={id}>{tmap[id]?.name || id}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho: matriz en tiempo real */}
          <div className="p-5 bg-slate-50">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Vista en tiempo real · {matrix.length} partidos en {Object.keys(byMd).length} fecha(s)
            </h4>
            <div className="space-y-4">
              {Object.entries(byMd).map(([md, items]) => (
                <div key={md} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">FECHA {md}</div>
                  <div className="space-y-1">
                    {items.map((it, i) => {
                      const homeIsBye = it.home_pos > realCount;
                      const awayIsBye = it.away_pos > realCount;
                      const skipped = homeIsBye || awayIsBye;
                      return (
                        <div key={i} className={`flex items-center gap-2 text-sm ${skipped ? "opacity-40" : ""}`} data-testid={`seeding-preview-md-${md}-${i}`}>
                          <span className="flex-1 text-right font-semibold truncate">{labelFor(it.home_pos)}</span>
                          <span className="text-xs text-slate-400 px-1">vs</span>
                          <span className="flex-1 text-left font-semibold truncate">{labelFor(it.away_pos)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button onClick={onCancel} className="px-4 py-2 border border-slate-300 rounded font-bold text-sm hover:bg-white" data-testid="seeding-cancel">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={!readyToConfirm}
            className="fsc-btn-red px-6 py-2 rounded font-bold text-sm disabled:opacity-40 flex items-center gap-2"
            data-testid="seeding-confirm"
          >
            <Wand2 size={16}/> Confirmar sorteo y generar vista previa
          </button>
        </div>
      </div>
    </div>
  );
}
