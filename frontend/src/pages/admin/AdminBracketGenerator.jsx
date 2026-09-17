import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, imgSrc } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Plus, X, Eye, Save, Trophy, Trash2, Edit2 } from "lucide-react";
import { formatDateTime } from "../../lib/dateFormat";
import CategorySelect from "../../components/CategorySelect";
import VenuePicker from "../../components/VenuePicker";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

const SIZES = [4, 8, 16, 32];

export default function AdminBracketGenerator() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "Sub-12",
    size: 8,
    include_third_place: true,
    start_date: new Date().toISOString().slice(0, 10),
    days_between_rounds: 7,
    venues: [""],           // ahora es array; cada slot usa VenuePicker (dropdown)
    time_slots: "10:00, 12:00",
  });
  const [seeds, setSeeds] = useState([]); // team_ids in seed order
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  // Editor de un bracket ya guardado
  const [editingBracketId, setEditingBracketId] = useState(null);
  const [editingMatches, setEditingMatches] = useState([]);
  const [editingVenues, setEditingVenues] = useState([]);
  const [editingLoading, setEditingLoading] = useState(false);

  const loadTeams = () => api.get("/teams").then((r) => setTeams(r.data.filter((t) => (t.status || "aprobado") === "aprobado")));
  const loadBrackets = () => api.get("/brackets").then((r) => setBrackets(r.data));
  useEffect(() => { loadTeams(); loadBrackets(); }, []);

  const filteredTeams = teams.filter((t) => t.category === form.category && !seeds.includes(t.id));

  const addSeed = (id) => {
    if (seeds.length >= form.size) { toast.error(`Solo ${form.size} equipos en este bracket`); return; }
    setSeeds([...seeds, id]);
  };
  const removeSeed = (id) => setSeeds(seeds.filter((s) => s !== id));
  const moveSeed = (idx, dir) => {
    const next = [...seeds];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSeeds(next);
  };

  const setVenueAt = (i, name) => {
    const next = [...(form.venues || [])];
    next[i] = name;
    setForm({ ...form, venues: next });
  };
  const addVenueSlot = () => setForm({ ...form, venues: [...(form.venues || []), ""] });
  const removeVenueSlot = (i) => {
    const next = [...(form.venues || [])];
    next.splice(i, 1);
    setForm({ ...form, venues: next.length ? next : [""] });
  };

  const buildPayload = (asPreview) => ({
    name: form.name || `Copa ${form.category}`,
    category: form.category,
    size: Number(form.size),
    team_ids: seeds,
    include_third_place: form.include_third_place,
    start_date: form.start_date,
    days_between_rounds: Number(form.days_between_rounds),
    venues: (form.venues || []).map((s) => (s || "").trim()).filter(Boolean),
    time_slots: form.time_slots.split(",").map((s) => s.trim()).filter(Boolean),
    preview: asPreview,
  });

  const doPreview = async () => {
    if (seeds.length !== Number(form.size)) { toast.error(`Selecciona exactamente ${form.size} equipos`); return; }
    try {
      const r = await api.post("/brackets", buildPayload(true));
      setPreview(r.data);
      toast.success("Vista previa lista");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error generando vista previa");
    }
  };

  const doSave = async () => {
    if (seeds.length !== Number(form.size)) { toast.error(`Selecciona exactamente ${form.size} equipos`); return; }
    setSaving(true);
    try {
      const r = await api.post("/brackets", buildPayload(false));
      toast.success("Bracket creado");
      loadBrackets();
      // Abrir el editor inmediatamente para que el admin ajuste fechas/canchas.
      openBracketEditor({ id: r.data.id });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const openBracketEditor = async (b) => {
    setEditingBracketId(b.id);
    setEditingLoading(true);
    setEditingMatches([]);
    setEditingVenues([]);
    try {
      const r = await api.get(`/brackets/${b.id}`);
      const bd = r.data || {};
      setEditingMatches(bd.matches || []);
      const vs = Array.isArray(bd.venues) && bd.venues.length > 0
        ? bd.venues
        : Array.from(new Set((bd.matches || []).map((m) => m.venue).filter(Boolean)));
      setEditingVenues(vs);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setEditingLoading(false);
    }
  };

  const persistBracketMatch = async (mid, patch) => {
    try {
      await api.put(`/matches/${mid}`, patch);
      toast.success("Partido actualizado");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const removeBracket = async (b) => {
    try {
      await api.delete(`/brackets/${b.id}`);
      toast.success("Bracket eliminado");
      if (editingBracketId === b.id) {
        setEditingBracketId(null);
        setEditingMatches([]);
        setEditingVenues([]);
      }
      loadBrackets();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      throw err;
    }
  };

  return (
    <div data-testid="admin-bracket-generator">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter flex items-center gap-3"><Trophy size={32}/> Bracket eliminación directa</h1>
          <p className="text-sm text-slate-500 mt-1">Diseña la fase final del torneo. Los ganadores avanzan automáticamente al cargar resultados.</p>
        </div>
      </div>

      {/* Brackets existentes */}
      {brackets.length > 0 && (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-3">Brackets existentes</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {brackets.map((b) => (
              <div key={b.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2" data-testid={`bracket-card-${b.id}`}>
                <div>
                  <div className="font-display text-lg font-black uppercase tracking-tight">{b.name}</div>
                  <div className="text-xs text-slate-500">{b.category} · {b.size} equipos {b.include_third_place ? "· con 3er puesto" : ""}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openBracketEditor(b)} className="px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100" data-testid={`edit-bracket-${b.id}`}><Edit2 size={12} className="inline -mt-0.5 mr-1"/>Editar</button>
                  <button onClick={() => navigate(`/bracket?id=${b.id}`)} className="text-blue-700 hover:underline text-xs font-bold uppercase" data-testid={`view-bracket-${b.id}`}>Ver</button>
                  <ConfirmDeleteDialog
                    trigger={
                      <button className="text-red-600 hover:underline" data-testid={`delete-bracket-${b.id}`}><Trash2 size={14}/></button>
                    }
                    title={`Eliminar bracket "${b.name}"`}
                    description={
                      <span>Se eliminará el bracket <strong>"{b.name}"</strong> ({b.size} equipos) y <strong>todos sus partidos</strong>. Esta acción no se puede deshacer.</span>
                    }
                    onConfirm={() => removeBracket(b)}
                    testIdPrefix={`bracket-delete-modal-${b.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Configuración</h3>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del bracket</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Copa Sub-12 Premier" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="bracket-name-input" />
          </label>
          <CategorySelect value={form.category} onChange={(v) => { setForm({ ...form, category: v }); setSeeds([]); }} />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tamaño del bracket</span>
            <select value={form.size} onChange={(e) => { setForm({ ...form, size: Number(e.target.value) }); setSeeds([]); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md bg-white" data-testid="bracket-size-select">
              {SIZES.map((s) => <option key={s} value={s}>{s} equipos ({Math.log2(s)} rondas)</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha 1ª ronda</span>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="bracket-start-date" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días entre rondas</span>
              <input type="number" min="1" value={form.days_between_rounds} onChange={(e) => setForm({ ...form, days_between_rounds: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Canchas disponibles</span>
            <div className="mt-1 space-y-2" data-testid="bracket-venues-picker">
              {(form.venues || []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <VenuePicker value={v} onChange={(name) => setVenueAt(i, name)} testId={`bracket-venue-${i}`} className="flex-1" />
                  <button type="button" onClick={() => removeVenueSlot(i)} className="px-2 text-slate-400 hover:text-red-600" data-testid={`bracket-venue-remove-${i}`}><X size={14}/></button>
                </div>
              ))}
              <button type="button" onClick={addVenueSlot} className="text-xs font-bold text-blue-700 flex items-center gap-1" data-testid="bracket-venues-add">
                <Plus size={12}/> Agregar cancha
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Horarios (separados por coma)</span>
            <input value={form.time_slots} onChange={(e) => setForm({ ...form, time_slots: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-100">
            <input type="checkbox" checked={form.include_third_place} onChange={(e) => setForm({ ...form, include_third_place: e.target.checked })} data-testid="bracket-third-place-toggle" />
            <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Incluir partido por el 3er puesto</span>
          </label>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button onClick={doPreview} className="flex-1 px-4 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2 justify-center" data-testid="bracket-preview-btn">
              <Eye size={14}/> Vista previa
            </button>
            <button onClick={doSave} disabled={saving} className="flex-1 fsc-btn-primary rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2 justify-center disabled:opacity-50" data-testid="bracket-save-btn">
              <Save size={14}/> {saving ? "Guardando..." : "Guardar bracket"}
            </button>
          </div>
        </div>

        {/* Seeds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-black uppercase tracking-tight">Sembrado</h3>
            <span className={`text-xs font-bold uppercase tracking-wide ${seeds.length === Number(form.size) ? "text-green-700" : "text-amber-600"}`} data-testid="bracket-seed-count">
              {seeds.length} / {form.size}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Orden = siembra (1 vs último, 2 vs penúltimo...). Reordena con las flechas.</p>

          {/* Selected seeds */}
          <div className="mt-4 space-y-1.5" data-testid="bracket-seeds-list">
            {seeds.length === 0 && <p className="text-xs text-slate-400 italic">Selecciona equipos de la lista de abajo.</p>}
            {seeds.map((tid, i) => {
              const t = teams.find((x) => x.id === tid);
              return (
                <div key={tid} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5" data-testid={`seed-row-${i + 1}`}>
                  <span className="font-display text-lg font-black text-blue-700 w-7 text-center tabular-nums">{i + 1}</span>
                  <div className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-display font-black text-white" style={{ background: t?.color || "#1d4ed8" }}>{t?.logo_url ? <img src={imgSrc(t.logo_url)} alt="" className="h-full w-full object-contain" /> : (t?.name?.[0] || "?")}</div>
                  <span className="text-sm font-semibold flex-1 truncate">{t?.name || tid}</span>
                  <button onClick={() => moveSeed(i, -1)} disabled={i === 0} className="text-slate-500 disabled:opacity-30 px-1 text-xs">▲</button>
                  <button onClick={() => moveSeed(i, 1)} disabled={i === seeds.length - 1} className="text-slate-500 disabled:opacity-30 px-1 text-xs">▼</button>
                  <button onClick={() => removeSeed(tid)} className="text-red-600 hover:bg-red-50 rounded p-1"><X size={12}/></button>
                </div>
              );
            })}
          </div>

          {/* Available */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Equipos disponibles en {form.category} ({filteredTeams.length})</h4>
            <div className="max-h-72 overflow-y-auto space-y-1" data-testid="bracket-available-teams">
              {filteredTeams.length === 0 && <p className="text-xs text-slate-400 italic">No hay más equipos aprobados en esta categoría.</p>}
              {filteredTeams.map((t) => (
                <button key={t.id} onClick={() => addSeed(t.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-50 text-left" data-testid={`add-seed-${t.id}`}>
                  <Plus size={12} className="text-blue-700"/>
                  <div className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-display font-black text-white" style={{ background: t.color || "#1d4ed8" }}>{t.name[0]}</div>
                  <span className="text-sm flex-1 truncate">{t.name}</span>
                  {t.birth_year && <span className="text-[10px] text-slate-400">{t.birth_year}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5" data-testid="bracket-preview">
          <h3 className="font-display text-xl font-black uppercase tracking-tight">Vista previa · {preview.size} equipos · {preview.total_rounds} rondas{preview.include_third_place ? " + 3er puesto" : ""}</h3>
          <div className="mt-3 text-xs text-slate-500">{preview.matches.length} partidos serán creados.</div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {preview.matches.map((m) => {
              const homeT = teams.find((x) => x.id === m.home_team_id);
              const awayT = teams.find((x) => x.id === m.away_team_id);
              return (
                <div key={m.id} className="border border-slate-200 rounded-lg p-3 text-xs">
                  <div className="font-bold uppercase tracking-wider text-slate-500">{m.is_third_place ? "3er puesto" : `${m.stage.toUpperCase()} · R${m.bracket_round}P${m.bracket_position}`}</div>
                  <div className="mt-1 font-semibold">{homeT?.name || "Por definir"}</div>
                  <div className="text-slate-400">vs</div>
                  <div className="font-semibold">{awayT?.name || "Por definir"}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(m.match_date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor de un bracket YA guardado */}
      {editingBracketId && (
        <div className="mt-6 bg-white border border-blue-300 rounded-xl p-5" data-testid="bracket-editor">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display text-xl font-black uppercase tracking-tight">Editar partidos del bracket</h4>
            <button onClick={() => { setEditingBracketId(null); setEditingMatches([]); setEditingVenues([]); }} className="text-slate-500 hover:text-slate-900" data-testid="bracket-editor-close"><X size={18}/></button>
          </div>
          {editingLoading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Cargando...</p>
          ) : editingMatches.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin partidos.</p>
          ) : (
            <BracketMatchesTable
              matches={editingMatches}
              teams={teams}
              venues={editingVenues}
              onPersist={persistBracketMatch}
              onLocalChange={(mid, patch) => setEditingMatches((ms) => ms.map((m) => m.id === mid ? { ...m, ...patch } : m))}
            />
          )}
        </div>
      )}
    </div>
  );
}


function BracketMatchesTable({ matches, teams, venues, onPersist, onLocalChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-blue-50 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-2 py-2">Ronda</th>
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
            const homeT = teams.find((x) => x.id === m.home_team_id);
            const awayT = teams.find((x) => x.id === m.away_team_id);
            const round = m.is_third_place ? "3er puesto" : `R${m.bracket_round}P${m.bracket_position}`;
            return (
              <tr key={m.id} className="border-t border-slate-100" data-testid={`br-editor-row-${m.id}`}>
                <td className="px-2 py-2 font-display font-black text-blue-700">{round}</td>
                <td className="px-2 py-2">
                  <input type="datetime-local" value={dtVal} onChange={(e) => onLocalChange(m.id, { match_date: e.target.value })} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" data-testid={`br-editor-date-${m.id}`} />
                </td>
                <td className="px-2 py-2 text-right font-semibold">{homeT?.name || m.home_team_name || "Por definir"}</td>
                <td className="px-1 py-2 text-center text-slate-400">vs</td>
                <td className="px-2 py-2 font-semibold">{awayT?.name || m.away_team_name || "Por definir"}</td>
                <td className="px-2 py-2">
                  <select
                    value={m.venue || ""}
                    onChange={(e) => onLocalChange(m.id, { venue: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                    data-testid={`br-editor-venue-${m.id}`}
                  >
                    <option value="">— Sin cancha —</option>
                    {venues.map((v) => <option key={v} value={v}>{v}</option>)}
                    {m.venue && !venues.includes(m.venue) && (
                      <option value={m.venue}>{m.venue}</option>
                    )}
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => onPersist(m.id, { match_date: m.match_date, venue: m.venue })} className="px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700" data-testid={`br-editor-save-${m.id}`}>Guardar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
