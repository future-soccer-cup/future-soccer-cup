import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit3, CalendarClock, Shuffle } from "lucide-react";
import { toast } from "sonner";
import CategorySelect from "../../components/CategorySelect";
import { Modal, Field } from "./AdminTeams";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";

const EMPTY = { tournament_id: "", home_team_id: "", away_team_id: "", match_date: "", venue: "", group_name: "", stage: "grupos", status: "programado", home_score: null, away_score: null };

// Convierte ISO con zona a "YYYY-MM-DDTHH:MM" para inputs datetime-local sin desplazar horas.
const toLocalInput = (iso) => {
  if (!iso) return "";
  // El backend almacena ISO sin offset (naive) o con offset; tomamos los primeros 16 chars del ISO local.
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return (iso || "").slice(0, 16);
  }
};

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [editing, setEditing] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [manualEdit, setManualEdit] = useState(null);
  const [intergroupOpen, setIntergroupOpen] = useState(false);

  const load = useCallback(() => Promise.all([
    api.get("/matches"), api.get("/teams"), api.get("/tournaments")
  ]).then(([m, t, tr]) => { setMatches(m.data); setTeams(t.data); setTournaments(tr.data); }), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editing };
      // Ensure tournament exists - create default if none
      if (!payload.tournament_id) {
        if (tournaments.length === 0) {
          const tr = await api.post("/tournaments", { name: "FSC 2025", season: "2025", category: "General", start_date: "2025-01-01", end_date: "2025-12-31" });
          payload.tournament_id = tr.data.id;
          setTournaments([tr.data]);
        } else {
          payload.tournament_id = tournaments[0].id;
        }
      }
      await api.post("/matches", payload);
      toast.success("Partido programado");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const submitResult = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/matches/${scoring.id}/result`, {
        home_score: Number(scoring.home_score),
        away_score: Number(scoring.away_score),
        scorers: scoring.scorers || [],
        cards: scoring.cards || [],
        home_fair_play: Number(scoring.home_fair_play || 0),
        away_fair_play: Number(scoring.away_fair_play || 0),
      });
      toast.success("Resultado registrado");
      setScoring(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar partido?")) return;
    await api.delete(`/matches/${id}`);
    load();
  };

  const saveManual = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        match_date: manualEdit.match_date,
        venue: manualEdit.venue || "",
        matchday: manualEdit.matchday != null && manualEdit.matchday !== "" ? Number(manualEdit.matchday) : null,
        group_name: manualEdit.group_name || "",
        stage: manualEdit.stage || "grupos",
      };
      await api.put(`/matches/${manualEdit.id}`, payload);
      toast.success("Partido actualizado");
      setManualEdit(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-matches">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Partidos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIntergroupOpen(true)}
            className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2"
            data-testid="open-intergroup-btn"
            title="Sortear intergrupos (cuadrangulares x2)"
          >
            <Shuffle size={16}/> Sortear intergrupos
          </button>
          <button onClick={() => setEditing({ ...EMPTY })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-match-btn">
            <Plus size={16}/> Programar
          </button>
        </div>
      </div>

      <MatchesTable
        matches={matches}
        onEdit={(m) => setManualEdit({ ...m, match_date: toLocalInput(m.match_date) })}
        onScore={(m) => setScoring({ ...m, scorers: m.scorers || [] })}
        onRemove={remove}
      />

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Programar partido">
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Local</span>
              <select required value={editing.home_team_id} onChange={(e) => setEditing({ ...editing, home_team_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                <option value="">Seleccionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Visitante</span>
              <select required value={editing.away_team_id} onChange={(e) => setEditing({ ...editing, away_team_id: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                <option value="">Seleccionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </label>
            <Field label="Fecha y hora" type="datetime-local" required value={editing.match_date} onChange={(v) => setEditing({ ...editing, match_date: v })} />
            <Field label="Sede" value={editing.venue} onChange={(v) => setEditing({ ...editing, venue: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Grupo" value={editing.group_name} onChange={(v) => setEditing({ ...editing, group_name: v })} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fase</span>
                <select value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                  <option value="grupos">Grupos</option><option value="octavos">Octavos</option><option value="cuartos">Cuartos</option><option value="semis">Semifinal</option><option value="final">Final</option>
                </select>
              </label>
            </div>
            <button className="fsc-btn-primary w-full py-2 rounded-md">Guardar</button>
          </form>
        </Modal>
      )}

      {scoring && (
        <Modal onClose={() => setScoring(null)} title="Cargar resultado">
          <form onSubmit={submitResult} className="space-y-4">
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{scoring.home_team_name}</span>
                <input required type="number" min="0" value={scoring.home_score ?? 0} onChange={(e) => setScoring({ ...scoring, home_score: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-2xl font-display font-black" data-testid="home-score-input" />
              </div>
              <div className="text-center font-display text-3xl font-black text-slate-300">vs</div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{scoring.away_team_name}</span>
                <input required type="number" min="0" value={scoring.away_score ?? 0} onChange={(e) => setScoring({ ...scoring, away_score: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-2xl font-display font-black" data-testid="away-score-input" />
              </div>
            </div>
            <ScorersEditor scoring={scoring} setScoring={setScoring} teams={teams} />
            <CardsEditor scoring={scoring} setScoring={setScoring} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Juego Limpio Local</span>
                <input type="number" min="0" max="10" value={scoring.home_fair_play ?? 0} onChange={(e) => setScoring({ ...scoring, home_fair_play: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="home-fairplay-input" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Juego Limpio Visitante</span>
                <input type="number" min="0" max="10" value={scoring.away_fair_play ?? 0} onChange={(e) => setScoring({ ...scoring, away_fair_play: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="away-fairplay-input" />
              </label>
            </div>
            <button className="fsc-btn-red w-full py-2 rounded-md" data-testid="save-result-btn">Guardar resultado</button>
          </form>
        </Modal>
      )}
      {manualEdit && (
        <Modal onClose={() => setManualEdit(null)} title="Editar fecha y cancha">
          <form onSubmit={saveManual} className="space-y-3" data-testid="manual-edit-form">
            <div className="text-xs text-slate-500 border border-slate-200 rounded p-2 bg-slate-50">
              <div className="font-semibold text-slate-700">{manualEdit.home_team_name} vs {manualEdit.away_team_name}</div>
              <div>Jornada actual: F{manualEdit.matchday ?? "—"}</div>
            </div>
            <Field
              label="Fecha y hora"
              type="datetime-local"
              required
              value={manualEdit.match_date}
              onChange={(v) => setManualEdit({ ...manualEdit, match_date: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Cancha"
                value={manualEdit.venue || ""}
                onChange={(v) => setManualEdit({ ...manualEdit, venue: v })}
              />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Jornada</span>
                <input
                  type="number"
                  min="1"
                  value={manualEdit.matchday ?? ""}
                  onChange={(e) => setManualEdit({ ...manualEdit, matchday: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                  data-testid="manual-edit-matchday"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Grupo"
                value={manualEdit.group_name || ""}
                onChange={(v) => setManualEdit({ ...manualEdit, group_name: v })}
              />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fase</span>
                <select
                  value={manualEdit.stage || "grupos"}
                  onChange={(e) => setManualEdit({ ...manualEdit, stage: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                >
                  <option value="grupos">Grupos</option>
                  <option value="octavos">Octavos</option>
                  <option value="cuartos">Cuartos</option>
                  <option value="semis">Semifinal</option>
                  <option value="final">Final</option>
                </select>
              </label>
            </div>
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="manual-edit-save">Guardar cambios</button>
          </form>
        </Modal>
      )}

      {intergroupOpen && (
        <IntergroupModal
          tournaments={tournaments}
          onClose={() => setIntergroupOpen(false)}
          onDone={() => { setIntergroupOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function IntergroupModal({ tournaments, onClose, onDone }) {
  const [form, setForm] = useState({
    tournament_id: tournaments[0]?.id || "",
    category: "",
    group_a: "Grupo A",
    group_b: "Grupo B",
    match_date: "",
    pairing: "standings",
    venues: ["Cancha 1"],
    time_slots: ["10:00"],
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (saveIt) => {
    if (!form.tournament_id || !form.category || !form.match_date) {
      toast.error("Completa torneo, categoría y fecha");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/fixtures/intergroup", { ...form, preview: !saveIt });
      setPreview(res.data);
      if (saveIt) {
        toast.success(`Intergrupos guardados (${res.data.count} partidos)`);
        onDone();
      } else {
        toast.success("Vista previa generada");
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Sortear intergrupos (cuadrangulares × 2)">
      <div className="space-y-3" data-testid="intergroup-form">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Torneo</span>
          <select
            value={form.tournament_id}
            onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            data-testid="ig-tournament"
          >
            {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.season}</option>)}
          </select>
        </label>
        <CategorySelect
          value={form.category}
          onChange={(v) => setForm({ ...form, category: v })}
          testId="ig-category"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupo A" value={form.group_a} onChange={(v) => setForm({ ...form, group_a: v })} />
          <Field label="Grupo B" value={form.group_b} onChange={(v) => setForm({ ...form, group_b: v })} />
        </div>
        <Field label="Fecha del intergrupo" type="date" required value={form.match_date} onChange={(v) => setForm({ ...form, match_date: v })} />
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Emparejamiento</span>
          <select
            value={form.pairing}
            onChange={(e) => setForm({ ...form, pairing: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            data-testid="ig-pairing"
          >
            <option value="standings">Por posición en la tabla (1°A vs 1°B, 2°A vs 2°B...)</option>
            <option value="seed">Por orden de inscripción</option>
            <option value="random">Aleatorio (sorteo)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Canchas (sep. coma)</span>
            <input
              value={form.venues.join(", ")}
              onChange={(e) => setForm({ ...form, venues: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Horarios (sep. coma)</span>
            <input
              value={form.time_slots.join(", ")}
              onChange={(e) => setForm({ ...form, time_slots: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            />
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => submit(false)} disabled={loading} className="flex-1 fsc-btn-primary py-2 rounded-md text-sm disabled:opacity-50" data-testid="ig-preview-btn">
            {loading ? "..." : "Vista previa"}
          </button>
          <button onClick={() => submit(true)} disabled={loading || !preview} className="flex-1 fsc-btn-red py-2 rounded-md text-sm disabled:opacity-50" data-testid="ig-save-btn">
            Guardar partidos
          </button>
        </div>
        {preview && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cruces ({preview.count})</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {preview.matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border-l-4 border-red-500 pl-3 py-1.5 bg-red-50">
                  <span className="font-semibold">{m.home_team_name}</span>
                  <span className="text-slate-400 text-xs">vs</span>
                  <span className="font-semibold">{m.away_team_name}</span>
                  <span className="text-xs text-slate-500">{m.venue || "—"} · {(m.match_date || "").slice(11, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ScorersEditor({ scoring, setScoring, teams }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const ids = [scoring.home_team_id, scoring.away_team_id];
    Promise.all(ids.map((id) => api.get(`/players?team_id=${id}`))).then((rs) => {
      setPlayers([...rs[0].data, ...rs[1].data]);
    });
  }, [scoring.home_team_id, scoring.away_team_id]);

  const addScorer = () => {
    setScoring({ ...scoring, scorers: [...(scoring.scorers || []), { _uid: crypto.randomUUID(), player_id: "", team_id: "", minute: 0 }] });
  };

  const updateScorer = (i, field, val) => {
    const next = [...(scoring.scorers || [])];
    next[i] = { ...next[i], [field]: val };
    if (field === "player_id") {
      const p = players.find((x) => x.id === val);
      if (p) next[i].team_id = p.team_id;
    }
    setScoring({ ...scoring, scorers: next });
  };

  const removeScorer = (i) => {
    const next = [...(scoring.scorers || [])];
    next.splice(i, 1);
    setScoring({ ...scoring, scorers: next });
  };

  return (
    <div className="border border-slate-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Goleadores</span>
        <button type="button" onClick={addScorer} className="text-xs font-bold text-blue-700">+ Agregar</button>
      </div>
      {(scoring.scorers || []).map((s, i) => (
        <div key={s._uid || `scorer-${i}`} className="grid grid-cols-12 gap-2 mb-2">
          <select value={s.player_id} onChange={(e) => updateScorer(i, "player_id", e.target.value)} className="col-span-8 px-2 py-1 border border-slate-200 rounded text-sm">
            <option value="">Jugador...</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>)}
          </select>
          <input type="number" placeholder="Min" value={s.minute || ""} onChange={(e) => updateScorer(i, "minute", Number(e.target.value))} className="col-span-3 px-2 py-1 border border-slate-200 rounded text-sm" />
          <button type="button" onClick={() => removeScorer(i)} className="col-span-1 text-red-600">✕</button>
        </div>
      ))}
    </div>
  );
}


function CardsEditor({ scoring, setScoring }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const ids = [scoring.home_team_id, scoring.away_team_id];
    Promise.all(ids.map((id) => api.get(`/players?team_id=${id}`))).then((rs) => {
      setPlayers([...rs[0].data, ...rs[1].data]);
    });
  }, [scoring.home_team_id, scoring.away_team_id]);

  const cards = scoring.cards || [];
  const addCard = (type) => {
    setScoring({ ...scoring, cards: [...cards, { _uid: crypto.randomUUID(), player_id: "", team_id: "", type, minute: 0 }] });
  };
  const updateCard = (i, field, val) => {
    const next = [...cards];
    next[i] = { ...next[i], [field]: val };
    if (field === "player_id") {
      const p = players.find((x) => x.id === val);
      if (p) next[i].team_id = p.team_id;
    }
    setScoring({ ...scoring, cards: next });
  };
  const removeCard = (i) => {
    const next = [...cards];
    next.splice(i, 1);
    setScoring({ ...scoring, cards: next });
  };

  return (
    <div className="border border-slate-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tarjetas</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => addCard("yellow")} className="text-xs font-bold text-yellow-600 flex items-center gap-1" data-testid="add-yellow-card"><span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />+ Amarilla</button>
          <button type="button" onClick={() => addCard("red")} className="text-xs font-bold text-red-600 flex items-center gap-1" data-testid="add-red-card"><span className="inline-block w-3 h-4 bg-red-600 rounded-sm" />+ Roja</button>
        </div>
      </div>
      {cards.length === 0 && <p className="text-xs text-slate-400 py-1">Sin tarjetas registradas</p>}
      {cards.map((c, i) => (
        <div key={c._uid || `card-${i}`} className="grid grid-cols-12 gap-2 mb-2 items-center">
          <span className={`col-span-1 inline-block w-3 h-4 rounded-sm ${c.type === "red" ? "bg-red-600" : "bg-yellow-400"}`} />
          <select value={c.player_id} onChange={(e) => updateCard(i, "player_id", e.target.value)} className="col-span-7 px-2 py-1 border border-slate-200 rounded text-sm">
            <option value="">Jugador...</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>)}
          </select>
          <input type="number" placeholder="Min" value={c.minute || ""} onChange={(e) => updateCard(i, "minute", Number(e.target.value))} className="col-span-3 px-2 py-1 border border-slate-200 rounded text-sm" />
          <button type="button" onClick={() => removeCard(i)} className="col-span-1 text-red-600">✕</button>
        </div>
      ))}
    </div>
  );
}


function MatchesTable({ matches, onEdit, onScore, onRemove }) {
  const matchFn = useCallback((m, q) =>
    (m.home_team_name || "").toLowerCase().includes(q) ||
    (m.away_team_name || "").toLowerCase().includes(q) ||
    (m.venue || "").toLowerCase().includes(q) ||
    (m.status || "").toLowerCase().includes(q) ||
    (m.match_date || "").toLowerCase().includes(q) ||
    (m.group_name || "").toLowerCase().includes(q) ||
    (m.stage || "").toLowerCase().includes(q)
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filteredCount, totalCount } =
    usePagedSearch(matches, matchFn, 20);

  return (
    <>
      <div className="mb-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Buscar por equipo, sede, estado o fecha..."
          filteredCount={filteredCount}
          totalCount={totalCount}
          testIdPrefix="matches"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Local</th>
              <th className="text-center px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Visitante</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Sede</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => (
              <tr key={m.id} className="border-t border-slate-100" data-testid={`match-row-${m.id}`}>
                <td className="px-4 py-2">{m.match_date ? new Date(m.match_date).toLocaleString("es") : "—"}</td>
                <td className="px-4 py-2 font-semibold">{m.home_team_name}</td>
                <td className="px-4 py-2 text-center font-display font-black tabular-nums">
                  {m.status === "finalizado" ? `${m.home_score} - ${m.away_score}` : "vs"}
                </td>
                <td className="px-4 py-2 font-semibold">{m.away_team_name}</td>
                <td className="px-4 py-2"><span className="text-xs uppercase tracking-wider font-bold">{m.status}</span></td>
                <td className="px-4 py-2 text-slate-500">{m.venue || "—"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onEdit(m)} className="text-slate-600 hover:text-blue-700" title="Editar fecha/hora/cancha" data-testid={`edit-match-${m.id}`}>
                    <CalendarClock size={16}/>
                  </button>
                  <button onClick={() => onScore(m)} className="text-blue-700" data-testid={`score-match-${m.id}`}><Edit3 size={16}/></button>
                  <button onClick={() => onRemove(m.id)} className="text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {matches.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Sin partidos</td></tr>}
            {matches.length > 0 && pageItems.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Sin resultados para la búsqueda.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="matches" />
    </>
  );
}
