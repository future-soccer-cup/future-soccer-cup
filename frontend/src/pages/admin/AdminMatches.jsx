import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit3, CalendarClock, Shuffle, FileDown, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import CategorySelect from "../../components/CategorySelect";
import { formatDateTime } from "../../lib/dateFormat";
import VenuePicker from "../../components/VenuePicker";
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
  // Filtros globales del módulo (aplican a la tabla, a clasificación y a J.L)
  const [filterTid, setFilterTid] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [tab, setTab] = useState("partidos"); // partidos | clasificacion | juego_limpio
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);

  const load = useCallback(() => Promise.all([
    api.get("/matches"), api.get("/teams"), api.get("/tournaments"), api.get("/fixtures")
  ]).then(([m, t, tr, fx]) => { setMatches(m.data); setTeams(t.data); setTournaments(tr.data); setFixtures(fx.data || []); }), []);
  useEffect(() => { load(); }, [load]);

  // Cargar clasificación cuando hay filtros suficientes y se cambia a tabs de stats
  useEffect(() => {
    if (tab === "partidos") return;
    if (!filterTid || !filterCat) { setStandings([]); return; }
    const params = new URLSearchParams({ tournament_id: filterTid, category: filterCat });
    if (filterGrp) params.set("group_name", filterGrp);
    api.get(`/stats/standings?${params.toString()}`).then((r) => setStandings(r.data || []));
  }, [tab, filterTid, filterCat, filterGrp]);

  // Filtrar la lista de partidos visible
  const filteredMatches = matches.filter((m) => {
    if (filterTid && m.tournament_id !== filterTid) return false;
    if (filterGrp && (m.group_name || "") !== filterGrp) return false;
    if (filterCat) {
      // Necesitamos atar partido a categoría vía el equipo local
      const hTeam = teams.find((t) => t.id === m.home_team_id);
      if (!hTeam || hTeam.category !== filterCat) return false;
    }
    return true;
  });

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Partidos</h1>
        <div className="flex items-center gap-2 flex-wrap">
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

      <FilterAndExportBar
        tournaments={tournaments} teams={teams} fixtures={fixtures}
        tid={filterTid} setTid={setFilterTid}
        cat={filterCat} setCat={setFilterCat}
        grp={filterGrp} setGrp={setFilterGrp}
      />

      <div className="flex gap-1 mb-4 border-b border-slate-200" data-testid="matches-tabs">
        <TabBtn active={tab === "partidos"} onClick={() => setTab("partidos")} testId="tab-partidos">Partidos · {filteredMatches.length}</TabBtn>
        <TabBtn
          active={tab === "clasificacion"}
          onClick={() => setTab("clasificacion")}
          testId="tab-clasificacion"
          disabled={!filterTid || !filterCat || !hasFixtureForFilters(fixtures, filterTid, filterCat, filterGrp)}
        >Clasificación</TabBtn>
        <TabBtn
          active={tab === "juego_limpio"}
          onClick={() => setTab("juego_limpio")}
          testId="tab-juego-limpio"
          disabled={!filterTid || !filterCat || !hasFixtureForFilters(fixtures, filterTid, filterCat, filterGrp)}
        >Juego Limpio</TabBtn>
      </div>

      {tab === "partidos" && (
        <MatchesTable
          matches={filteredMatches}
          onEdit={(m) => setManualEdit({ ...m, match_date: toLocalInput(m.match_date) })}
          onScore={(m) => setScoring({ ...m, scorers: m.scorers || [] })}
          onRemove={remove}
        />
      )}
      {tab === "clasificacion" && (
        <StandingsTable rows={standings} mode="full" />
      )}
      {tab === "juego_limpio" && (
        <StandingsTable rows={standings} mode="fairplay" />
      )}

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
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cancha</span>
              <VenuePicker value={editing.venue || ""} onChange={(v) => setEditing({ ...editing, venue: v })} testId="new-match-venue" />
            </label>
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
            <CardsEditor scoring={scoring} setScoring={setScoring} teams={teams} />
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              <strong>Juego Limpio:</strong> se calcula automáticamente a partir de las tarjetas registradas y la configuración de la categoría (base − descuentos). Ya no se digita manualmente.
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
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cancha</span>
                <VenuePicker value={manualEdit.venue || ""} onChange={(v) => setManualEdit({ ...manualEdit, venue: v })} testId="manual-edit-venue" />
              </label>
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


function CardsEditor({ scoring, setScoring, teams = [] }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const ids = [scoring.home_team_id, scoring.away_team_id];
    Promise.all(ids.map((id) => api.get(`/players?team_id=${id}`))).then((rs) => {
      setPlayers([...rs[0].data, ...rs[1].data]);
    });
  }, [scoring.home_team_id, scoring.away_team_id]);

  const teamOptions = [
    { id: scoring.home_team_id, name: scoring.home_team_name || "Local" },
    { id: scoring.away_team_id, name: scoring.away_team_name || "Visitante" },
  ];
  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const cards = scoring.cards || [];
  const addCard = (type) => {
    // Iter46:
    //  - Amarilla/Roja/Otra: por defecto target_kind='player' (comportamiento anterior). Se puede cambiar a 'staff'.
    //  - Azul: target_kind='team' (afecta a todo el equipo). Solo pide equipo + descripción.
    const base = { _uid: crypto.randomUUID(), team_id: "", type, minute: 0 };
    if (type === "blue") {
      base.target_kind = "team";
      base.description = "";
    } else {
      base.target_kind = "player";
      base.player_id = "";
      base.staff_name = "";
    }
    setScoring({ ...scoring, cards: [...cards, base] });
  };
  const updateCard = (i, patch) => {
    const next = [...cards];
    next[i] = { ...next[i], ...patch };
    // Si cambia el jugador → derivar team_id automáticamente.
    if ("player_id" in patch) {
      const p = players.find((x) => x.id === patch.player_id);
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
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tarjetas</span>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => addCard("yellow")} className="text-xs font-bold text-yellow-600 flex items-center gap-1" data-testid="add-yellow-card"><span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />+ Amarilla</button>
          <button type="button" onClick={() => addCard("red")} className="text-xs font-bold text-red-600 flex items-center gap-1" data-testid="add-red-card"><span className="inline-block w-3 h-4 bg-red-600 rounded-sm" />+ Roja</button>
          <button type="button" onClick={() => addCard("blue")} className="text-xs font-bold text-blue-600 flex items-center gap-1" data-testid="add-blue-card"><span className="inline-block w-3 h-4 bg-blue-600 rounded-sm" />+ Azul</button>
          <button type="button" onClick={() => addCard("other")} className="text-xs font-bold text-slate-600 flex items-center gap-1" data-testid="add-other-card"><span className="inline-block w-3 h-4 bg-slate-400 rounded-sm" />+ Otra</button>
        </div>
      </div>
      {cards.length === 0 && <p className="text-xs text-slate-400 py-1">Sin tarjetas registradas</p>}
      {cards.map((c, i) => {
        const badge = c.type === "red" ? "bg-red-600" : c.type === "blue" ? "bg-blue-600" : c.type === "other" ? "bg-slate-400" : "bg-yellow-400";
        // TARJETA AZUL: solo equipo + descripción, sin jugador/staff.
        if (c.type === "blue") {
          return (
            <div key={c._uid || `card-${i}`} className="grid grid-cols-12 gap-2 mb-2 items-start" data-testid={`card-blue-${i}`}>
              <span className={`col-span-1 inline-block w-3 h-4 rounded-sm mt-2 ${badge}`} />
              <div className="col-span-10 space-y-1">
                <select
                  value={c.team_id || ""}
                  onChange={(e) => updateCard(i, { team_id: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                  data-testid={`card-team-${i}`}
                >
                  <option value="">Equipo afectado...</option>
                  {teamOptions.map((t) => t.id ? <option key={t.id} value={t.id}>{t.name}</option> : null)}
                </select>
                <textarea
                  rows={2}
                  value={c.description || ""}
                  onChange={(e) => updateCard(i, { description: e.target.value })}
                  placeholder="Descripción (ej. Conducta antideportiva del banco / protesta grupal)..."
                  className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                  data-testid={`card-description-${i}`}
                />
              </div>
              <button type="button" onClick={() => removeCard(i)} className="col-span-1 text-red-600">✕</button>
            </div>
          );
        }
        // TARJETAS amarilla/roja/otra: toggle Jugador/Cuerpo técnico
        const kind = c.target_kind || "player";
        const staffForTeam = tmap[c.team_id]?.cuerpo_tecnico || [];
        return (
          <div key={c._uid || `card-${i}`} className="grid grid-cols-12 gap-2 mb-2 items-center" data-testid={`card-${c.type}-${i}`}>
            <span className={`col-span-1 inline-block w-3 h-4 rounded-sm ${badge}`} />
            <div className="col-span-7 space-y-1">
              <div className="flex gap-1 text-[10px] font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => updateCard(i, { target_kind: "player", staff_name: "" })}
                  className={`px-2 py-0.5 rounded ${kind === "player" ? "bg-fsc-azul text-white" : "bg-slate-100 text-slate-500"}`}
                  data-testid={`card-kind-player-${i}`}
                >Jugador</button>
                <button
                  type="button"
                  onClick={() => updateCard(i, { target_kind: "staff", player_id: "" })}
                  className={`px-2 py-0.5 rounded ${kind === "staff" ? "bg-fsc-azul text-white" : "bg-slate-100 text-slate-500"}`}
                  data-testid={`card-kind-staff-${i}`}
                >Cuerpo Técnico</button>
              </div>
              {kind === "player" ? (
                <select
                  value={c.player_id || ""}
                  onChange={(e) => updateCard(i, { player_id: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                  data-testid={`card-player-${i}`}
                >
                  <option value="">Jugador...</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>)}
                </select>
              ) : (
                <div className="flex gap-1">
                  <select
                    value={c.team_id || ""}
                    onChange={(e) => updateCard(i, { team_id: e.target.value, staff_name: "" })}
                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    data-testid={`card-staff-team-${i}`}
                  >
                    <option value="">Equipo...</option>
                    {teamOptions.map((t) => t.id ? <option key={t.id} value={t.id}>{t.name}</option> : null)}
                  </select>
                  <select
                    value={c.staff_name || ""}
                    onChange={(e) => updateCard(i, { staff_name: e.target.value })}
                    disabled={!c.team_id}
                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm disabled:bg-slate-50"
                    data-testid={`card-staff-name-${i}`}
                  >
                    <option value="">Cuerpo técnico...</option>
                    {staffForTeam.map((s, idx) => (
                      <option key={`${s.name}-${idx}`} value={s.name}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <input type="number" placeholder="Min" value={c.minute || ""} onChange={(e) => updateCard(i, { minute: Number(e.target.value) })} className="col-span-3 px-2 py-1 border border-slate-200 rounded text-sm" />
            <button type="button" onClick={() => removeCard(i)} className="col-span-1 text-red-600">✕</button>
          </div>
        );
      })}
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
                <td className="px-4 py-2">{m.match_date ? formatDateTime(m.match_date) : "—"}</td>
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


async function downloadPdf(url, fname) {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = fname;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);
  } catch (err) {
    toast.error("No se pudo generar el PDF: " + (err?.message || "error"));
  }
}

function hasFixtureForFilters(fixtures, tid, cat, grp) {
  if (!Array.isArray(fixtures)) return false;
  return fixtures.some((f) => {
    if (tid && f.tournament_id !== tid) return false;
    if (cat && f.category !== cat) return false;
    if (grp && (f.group_name || "") !== grp) return false;
    return true;
  });
}

function FilterAndExportBar({ tournaments, teams, fixtures = [], tid, setTid, cat, setCat, grp, setGrp }) {
  const activeTournaments = (tournaments || []).filter((t) => !t.archived);
  const tournament = activeTournaments.find((t) => t.id === tid);
  const cats = tournament
    ? ((tournament.categories || []).map((c) => c.name).filter(Boolean).length
        ? (tournament.categories || []).map((c) => c.name).filter(Boolean)
        : (tournament.category ? [tournament.category] : []))
    : [];
  // Iter44: los grupos disponibles vienen de FIXTURES existentes (no de teams sueltos),
  // así no aparece "Grupo A" cuando aún no se generó ningún fixture para ese torneo+categoría.
  const groupsAvail = Array.from(new Set(
    (fixtures || [])
      .filter((f) => (!tid || f.tournament_id === tid) && (!cat || f.category === cat))
      .map((f) => f.group_name)
      .filter(Boolean)
  )).sort();

  const params = () => {
    const p = new URLSearchParams();
    if (cat) p.set("category", cat);
    if (grp) p.set("group", grp);
    const q = p.toString();
    return q ? `?${q}` : "";
  };

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-lg p-3" data-testid="pdf-export-bar">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fsc-azul flex items-center gap-1"><FileDown size={12}/> Filtros + Exportar PDFs</span>
        <select value={tid} onChange={(e) => { setTid(e.target.value); setCat(""); setGrp(""); }} className="px-2 py-1.5 border border-slate-200 rounded text-xs" data-testid="pdf-export-tournament">
          <option value="">Evento activo...</option>
          {activeTournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.season}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" disabled={!tid} data-testid="pdf-export-category">
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={grp} onChange={(e) => setGrp(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" disabled={!tid} data-testid="pdf-export-group">
          <option value="">Todos los grupos</option>
          {groupsAvail.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {(tid || cat || grp) && (
          <button onClick={() => { setTid(""); setCat(""); setGrp(""); }} className="px-2 py-1.5 text-xs text-slate-500 hover:text-fsc-rojo" data-testid="pdf-export-clear">Limpiar</button>
        )}
        <div className="flex-1" />
        <button
          disabled={!tid}
          onClick={() => downloadPdf(`/tournaments/${tid}/fixture.pdf${params()}`, `fixture_${tid.slice(0,8)}.pdf`)}
          className="px-3 py-1.5 bg-fsc-azul hover:bg-fsc-azul-oscuro text-white rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 disabled:opacity-40"
          data-testid="pdf-fixture-btn"
        >
          <CalendarClock size={12}/> Fixture
        </button>
        <button
          disabled={!tid}
          onClick={() => downloadPdf(`/tournaments/${tid}/standings.pdf${params()}`, `clasificacion_${tid.slice(0,8)}.pdf`)}
          className="px-3 py-1.5 bg-fsc-azul hover:bg-fsc-azul-oscuro text-white rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 disabled:opacity-40"
          data-testid="pdf-standings-btn"
        >
          <FileText size={12}/> Clasificación
        </button>
        <button
          disabled={!tid}
          onClick={() => downloadPdf(`/tournaments/${tid}/fairplay.pdf${params()}`, `juego_limpio_${tid.slice(0,8)}.pdf`)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 disabled:opacity-40"
          data-testid="pdf-fairplay-btn"
        >
          <ShieldCheck size={12}/> Juego Limpio
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children, testId, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`px-4 py-2 text-sm font-bold uppercase tracking-wide rounded-t-md transition border-b-2 -mb-px ${
        active ? "border-fsc-rojo text-fsc-rojo bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function StandingsTable({ rows, mode = "full" }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center text-sm text-slate-400 py-12 bg-white border border-slate-200 rounded-lg" data-testid="standings-empty">
      Aún no hay fixture creado para el torneo, categoría y grupo seleccionados. La tabla se generará cuando cargues resultados de partidos.
    </div>;
  }
  if (mode === "fairplay") {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto" data-testid="fairplay-table">
        <table className="w-full text-sm">
          <thead className="bg-emerald-700 text-white text-xs uppercase tracking-wider">
            <tr>
              <th className="text-center px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Equipo</th>
              <th className="text-center px-3 py-2">🟨</th>
              <th className="text-center px-3 py-2">🟥</th>
              <th className="text-center px-3 py-2">Otra</th>
              <th className="text-center px-3 py-2">J.L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team_id} className="border-t border-slate-100">
                <td className="text-center px-3 py-2 font-display font-black text-emerald-700">{i + 1}</td>
                <td className="px-3 py-2 font-semibold flex items-center gap-2">
                  {r.team_logo ? <img src={r.team_logo} alt="" className="h-6 w-6 object-contain" /> : <span className="h-6 w-6 rounded bg-slate-200" />}
                  {r.team_name}
                </td>
                <td className="text-center px-3 py-2 tabular-nums">{r.yellow_cards || 0}</td>
                <td className="text-center px-3 py-2 tabular-nums">{r.red_cards || 0}</td>
                <td className="text-center px-3 py-2 tabular-nums">{r.other_cards || 0}</td>
                <td className="text-center px-3 py-2 font-display font-black text-emerald-700 tabular-nums">{r.fair_play ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto" data-testid="standings-table">
      <table className="w-full text-sm">
        <thead className="bg-fsc-azul text-white text-xs uppercase tracking-wider">
          <tr>
            <th className="text-center px-2 py-2">#</th>
            <th className="text-left px-3 py-2">Equipo</th>
            {["PJ","PG","PE","PP","GF","GC","DG","J.L","PTOS"].map((h) => (
              <th key={h} className={`text-center px-2 py-2 ${h === "PTOS" ? "bg-fsc-azul-oscuro" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team_id} className="border-t border-slate-100">
              <td className="text-center px-2 py-2 font-display font-black text-fsc-azul">{i + 1}</td>
              <td className="px-3 py-2 font-semibold flex items-center gap-2">
                {r.team_logo ? <img src={r.team_logo} alt="" className="h-6 w-6 object-contain" /> : <span className="h-6 w-6 rounded bg-slate-200" />}
                {r.team_name}
              </td>
              <td className="text-center px-2 py-2 tabular-nums">{r.played}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.won}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.drawn}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.lost}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.gf}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.ga}</td>
              <td className={`text-center px-2 py-2 tabular-nums font-bold ${r.gd > 0 ? "text-emerald-600" : r.gd < 0 ? "text-rose-600" : "text-slate-500"}`}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="text-center px-2 py-2 tabular-nums">{r.fair_play ?? 0}</td>
              <td className="text-center px-2 py-2 tabular-nums font-display font-black text-fsc-azul bg-fsc-azul/5">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
