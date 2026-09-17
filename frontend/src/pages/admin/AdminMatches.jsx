import { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError, imgSrc } from "../../lib/api";
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
  // Iter53: Partidos adicionales (bonus matches). Aplican SOLO en fixtures de 3 o 4 equipos.
  const [bonusMatches, setBonusMatches] = useState([]);
  const [bonusEdit, setBonusEdit] = useState(null); // {id?, team_id, result, goals_for, ...}

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

  // Iter53: cargar partidos adicionales (bonus) del scope filtrado.
  const loadBonus = useCallback(() => {
    if (!filterTid || !filterCat) { setBonusMatches([]); return; }
    const params = new URLSearchParams({ tournament_id: filterTid, category: filterCat });
    if (filterGrp) params.set("group_name", filterGrp);
    api.get(`/bonus-matches?${params.toString()}`).then((r) => setBonusMatches(r.data || []));
  }, [filterTid, filterCat, filterGrp]);
  useEffect(() => { loadBonus(); }, [loadBonus]);

  // Fixture del scope filtrado (torneo × categoría × grupo). Se usa para decidir
  // si aplican partidos adicionales y qué equipos.
  const scopeFixture = fixtures.find((f) =>
    f.tournament_id === filterTid &&
    f.category === filterCat &&
    (!filterGrp || (f.group_name || "") === filterGrp)
  );
  const scopeTeamIds = (scopeFixture?.team_ids || []).filter((id) => id && id !== "__BYE__");
  const scopeTeamCount = scopeTeamIds.length;
  const bonusEnabled = scopeTeamCount === 3 || scopeTeamCount === 4;
  const maxBonusPerTeam = scopeTeamCount === 3 ? 2 : (scopeTeamCount === 4 ? 1 : 0);
  const bonusCountByTeam = bonusMatches.reduce((acc, b) => {
    acc[b.team_id] = (acc[b.team_id] || 0) + 1;
    return acc;
  }, {});

  // Filtrar la lista de partidos visible
  const filteredMatches = matches.filter((m) => {
    if (filterTid && m.tournament_id !== filterTid) return false;
    if (filterGrp && (m.group_name || "") !== filterGrp) return false;
    if (filterCat) {
      // Necesitamos atar partido a categoría vía el equipo local o visitante.
      // En partidos DESCANSA (BYE) uno de los ids es "__BYE__" y no está en `teams`,
      // por eso usamos el otro id como fallback para no ocultar la fila.
      const hTeam = teams.find((t) => t.id === m.home_team_id);
      const aTeam = teams.find((t) => t.id === m.away_team_id);
      const refTeam = hTeam || aTeam;
      if (!refTeam || refTeam.category !== filterCat) return false;
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

  // Iter53: crear/editar/borrar partido adicional (bonus match).
  const openNewBonus = () => {
    if (!bonusEnabled) return;
    setBonusEdit({
      id: null,
      tournament_id: filterTid,
      category: filterCat,
      group_name: filterGrp || (scopeFixture?.group_name || ""),
      team_id: "",
      result: "won",
      goals_for: 0,
      goals_against: 0,
      yellow_cards: 0,
      red_cards: 0,
      other_cards: 0,
      note: "",
    });
  };
  const saveBonus = async (e) => {
    e.preventDefault();
    try {
      const body = {
        tournament_id: bonusEdit.tournament_id,
        category: bonusEdit.category,
        group_name: bonusEdit.group_name || "",
        team_id: bonusEdit.team_id,
        result: bonusEdit.result,
        goals_for: Number(bonusEdit.goals_for) || 0,
        goals_against: Number(bonusEdit.goals_against) || 0,
        yellow_cards: Number(bonusEdit.yellow_cards) || 0,
        red_cards: Number(bonusEdit.red_cards) || 0,
        other_cards: Number(bonusEdit.other_cards) || 0,
        note: bonusEdit.note || "",
      };
      if (!body.team_id) { toast.error("Selecciona un equipo"); return; }
      if (bonusEdit.id) {
        await api.put(`/bonus-matches/${bonusEdit.id}`, body);
        toast.success("Partido adicional actualizado");
      } else {
        await api.post("/bonus-matches", body);
        toast.success("Partido adicional creado");
      }
      setBonusEdit(null);
      loadBonus();
      // También recargar standings si estamos en tab clasificación/JL
      if (tab !== "partidos") {
        const params = new URLSearchParams({ tournament_id: filterTid, category: filterCat });
        if (filterGrp) params.set("group_name", filterGrp);
        const r = await api.get(`/stats/standings?${params.toString()}`);
        setStandings(r.data || []);
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };
  const removeBonus = async (id) => {
    if (!window.confirm("¿Eliminar este partido adicional? Se descontará de la tabla de clasificación y juego limpio.")) return;
    try {
      await api.delete(`/bonus-matches/${id}`);
      toast.success("Partido adicional eliminado");
      loadBonus();
      if (tab !== "partidos") {
        const params = new URLSearchParams({ tournament_id: filterTid, category: filterCat });
        if (filterGrp) params.set("group_name", filterGrp);
        const r = await api.get(`/stats/standings?${params.toString()}`);
        setStandings(r.data || []);
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-matches">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Partidos</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {bonusEnabled && (
            <button
              onClick={openNewBonus}
              className="px-4 py-2 rounded-md text-sm flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold"
              data-testid="add-bonus-btn"
              title={`Partido adicional (fixture de ${scopeTeamCount} equipos · máx ${maxBonusPerTeam} por equipo)`}
            >
              <Plus size={16}/> Partido adicional
            </button>
          )}
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
        <TabBtn
          active={tab === "tarjetas"}
          onClick={() => setTab("tarjetas")}
          testId="tab-tarjetas"
          disabled={!filterTid || !filterCat}
        >Tarjetas</TabBtn>
      </div>

      {tab === "partidos" && (
        <>
          <MatchesTable
            matches={filteredMatches}
            onEdit={(m) => setManualEdit({ ...m, match_date: toLocalInput(m.match_date) })}
            onScore={(m) => setScoring({ ...m, scorers: m.scorers || [] })}
            onRemove={remove}
          />
          {bonusEnabled && (
            <BonusMatchesList
              bonusMatches={bonusMatches}
              scopeTeams={teams.filter((t) => scopeTeamIds.includes(t.id))}
              maxPerTeam={maxBonusPerTeam}
              teamCount={scopeTeamCount}
              onEdit={(b) => setBonusEdit({ ...b })}
              onDelete={removeBonus}
            />
          )}
        </>
      )}
      {tab === "clasificacion" && (
        <StandingsTable rows={standings} mode="full" />
      )}
      {tab === "juego_limpio" && (
        <StandingsTable rows={standings} mode="fairplay" />
      )}
      {tab === "tarjetas" && (
        <CardsReport matches={filteredMatches} teams={teams} />
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

      {bonusEdit && (
        <BonusMatchModal
          bonus={bonusEdit}
          setBonus={setBonusEdit}
          onClose={() => setBonusEdit(null)}
          onSubmit={saveBonus}
          scopeTeams={teams.filter((t) => scopeTeamIds.includes(t.id))}
          maxPerTeam={maxBonusPerTeam}
          bonusCountByTeam={bonusCountByTeam}
          teamCount={scopeTeamCount}
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
      const allPlayers = [...rs[0].data, ...rs[1].data];
      setPlayers(allPlayers);
      // Backward-compat: goleadores guardados antes de este cambio no tenían team_id propio (se
      // derivaba del jugador). Lo completamos una sola vez al cargar para que el select de equipo
      // no aparezca vacío en partidos ya cargados.
      const scorers = scoring.scorers || [];
      const needsBackfill = scorers.some((s) => s.player_id && !s.team_id);
      if (needsBackfill) {
        const pmap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
        setScoring((prev) => ({
          ...prev,
          scorers: (prev.scorers || []).map((s) => (s.player_id && !s.team_id && pmap[s.player_id]) ? { ...s, team_id: pmap[s.player_id].team_id } : s),
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoring.home_team_id, scoring.away_team_id]);

  const teamOptions = [
    { id: scoring.home_team_id, name: scoring.home_team_name || "Local" },
    { id: scoring.away_team_id, name: scoring.away_team_name || "Visitante" },
  ];

  const addScorer = () => {
    setScoring({ ...scoring, scorers: [...(scoring.scorers || []), { _uid: crypto.randomUUID(), player_id: "", team_id: "", minute: 0 }] });
  };

  const updateScorer = (i, patch) => {
    const next = [...(scoring.scorers || [])];
    next[i] = { ...next[i], ...patch };
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
      {(scoring.scorers || []).length === 0 && <p className="text-xs text-slate-400 py-1">Sin goleadores registrados</p>}
      {(scoring.scorers || []).map((s, i) => (
        <div key={s._uid || `scorer-${i}`} className="grid grid-cols-12 gap-2 mb-2 items-center" data-testid={`scorer-row-${i}`}>
          <select
            value={s.team_id || ""}
            onChange={(e) => updateScorer(i, { team_id: e.target.value, player_id: "" })}
            className="col-span-4 px-2 py-1 border border-slate-200 rounded text-sm"
            data-testid={`scorer-team-${i}`}
          >
            <option value="">Equipo...</option>
            {teamOptions.map((t) => t.id ? <option key={t.id} value={t.id}>{t.name}</option> : null)}
          </select>
          <select
            value={s.player_id}
            onChange={(e) => updateScorer(i, { player_id: e.target.value })}
            disabled={!s.team_id}
            className="col-span-4 px-2 py-1 border border-slate-200 rounded text-sm disabled:bg-slate-50"
            data-testid={`scorer-player-${i}`}
          >
            <option value="">Jugador...</option>
            {players.filter((p) => p.team_id === s.team_id).map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>)}
          </select>
          <input type="number" placeholder="Min" value={s.minute || ""} onChange={(e) => updateScorer(i, { minute: Number(e.target.value) })} className="col-span-3 px-2 py-1 border border-slate-200 rounded text-sm" />
          <button type="button" onClick={() => removeScorer(i)} className="col-span-1 text-red-600" data-testid={`scorer-remove-${i}`}>✕</button>
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
    // Iter48:
    //  - Amarilla/Roja: por defecto target_kind='player'. Se puede cambiar a 'staff'.
    //  - Otra: afecta a todo el equipo — solo pide equipo + descripción (SIN jugador ni staff).
    const base = { _uid: crypto.randomUUID(), team_id: "", type, minute: 0 };
    if (type === "other") {
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
          <button type="button" onClick={() => addCard("other")} className="text-xs font-bold text-slate-600 flex items-center gap-1" data-testid="add-other-card"><span className="inline-block w-3 h-4 bg-slate-400 rounded-sm" />+ Otra</button>
        </div>
      </div>
      {cards.length === 0 && <p className="text-xs text-slate-400 py-1">Sin tarjetas registradas</p>}
      {cards.map((c, i) => {
        const badge = c.type === "red" ? "bg-red-600" : c.type === "other" ? "bg-slate-400" : "bg-yellow-400";
        // "Otra": afecta a todo el equipo. Solo equipo + descripción, sin jugador/staff/minuto (opcional).
        if (c.type === "other") {
          return (
            <div key={c._uid || `card-${i}`} className="grid grid-cols-12 gap-2 mb-2 items-start" data-testid={`card-other-${i}`}>
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
              <button type="button" onClick={() => removeCard(i)} className="col-span-1 text-red-600 mt-2">✕</button>
            </div>
          );
        }
        // Amarilla / Roja: toggle Jugador/Cuerpo Técnico + fila alineada con Min.
        const kind = c.target_kind || "player";
        const staffForTeam = tmap[c.team_id]?.cuerpo_tecnico || [];
        return (
          <div key={c._uid || `card-${i}`} className="mb-3" data-testid={`card-${c.type}-${i}`}>
            {/* Selector de tipo (Jugador / Cuerpo técnico) — fila superior */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block w-3 h-4 rounded-sm ${badge}`} />
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
            </div>
            {/* Fila principal: Jugador/CT (grande) + Min (angosto) + eliminar — alineadas horizontalmente */}
            <div className="grid grid-cols-12 gap-2 items-center pl-5">
              {kind === "player" ? (
                <div className="col-span-12 sm:col-span-8 flex flex-col sm:flex-row gap-1">
                  <select
                    value={c.team_id || ""}
                    onChange={(e) => updateCard(i, { team_id: e.target.value, player_id: "" })}
                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    data-testid={`card-player-team-${i}`}
                  >
                    <option value="">Equipo...</option>
                    {teamOptions.map((t) => t.id ? <option key={t.id} value={t.id}>{t.name}</option> : null)}
                  </select>
                  <select
                    value={c.player_id || ""}
                    onChange={(e) => updateCard(i, { player_id: e.target.value })}
                    disabled={!c.team_id}
                    className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm disabled:bg-slate-50"
                    data-testid={`card-player-${i}`}
                  >
                    <option value="">Jugador...</option>
                    {players.filter((p) => p.team_id === c.team_id).map((p) => <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>)}
                  </select>
                </div>
              ) : (
                <div className="col-span-12 sm:col-span-8 flex flex-col sm:flex-row gap-1">
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
              <input type="number" placeholder="Min" value={c.minute || ""} onChange={(e) => updateCard(i, { minute: Number(e.target.value) })} className="col-span-8 sm:col-span-3 px-2 py-1 border border-slate-200 rounded text-sm" />
              <button type="button" onClick={() => removeCard(i)} className="col-span-4 sm:col-span-1 text-red-600">✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function CardsReport({ matches, teams }) {
  const teamIds = useMemo(() => Array.from(new Set(
    matches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter((id) => id && id !== "__BYE__")
  )), [matches]);
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    if (!teamIds.length) { setPlayers([]); return; }
    Promise.all(teamIds.map((id) => api.get(`/players?team_id=${id}`).catch(() => ({ data: [] }))))
      .then((rs) => setPlayers(rs.flatMap((r) => r.data)));
  }, [teamIds]);

  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const pmap = Object.fromEntries(players.map((p) => [p.id, p]));

  const rows = [];
  matches.forEach((m) => {
    (m.cards || []).forEach((c) => {
      const team = tmap[c.team_id];
      let who = "Equipo (otra)";
      if (c.target_kind === "staff" || c.staff_name) who = c.staff_name || "Cuerpo técnico";
      else if (c.player_id) who = pmap[c.player_id]?.name || "Jugador";
      rows.push({
        matchLabel: `${m.home_team_name} vs ${m.away_team_name}`,
        team: team?.name || "Equipo desconocido",
        team_id: c.team_id || "sin-equipo",
        type: c.type,
        who,
        minute: c.minute,
        description: c.description,
      });
    });
  });
  rows.sort((a, b) => (a.team || "").localeCompare(b.team || ""));
  const byTeam = {};
  rows.forEach((r) => { (byTeam[r.team] = byTeam[r.team] || { team_id: r.team_id, rows: [] }); byTeam[r.team].rows.push(r); });

  const yellowCount = rows.filter((r) => r.type === "yellow").length;
  const redCount = rows.filter((r) => r.type === "red").length;
  const otherCount = rows.filter((r) => r.type === "other").length;

  if (!rows.length) {
    return <p className="text-sm text-slate-400 py-8 text-center" data-testid="cards-report-empty">No hay tarjetas registradas para este filtro.</p>;
  }

  return (
    <div className="space-y-4" data-testid="cards-report">
      <div className="flex gap-4 text-sm font-bold">
        <span className="flex items-center gap-1" data-testid="cards-report-yellow-total"><span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" /> {yellowCount} amarillas</span>
        <span className="flex items-center gap-1" data-testid="cards-report-red-total"><span className="inline-block w-3 h-4 bg-red-600 rounded-sm" /> {redCount} rojas</span>
        {otherCount > 0 && (
          <span className="flex items-center gap-1" data-testid="cards-report-other-total"><span className="inline-block w-3 h-4 bg-slate-400 rounded-sm" /> {otherCount} otras</span>
        )}
      </div>
      {Object.entries(byTeam).map(([teamName, group]) => (
        <div key={teamName} className="border border-slate-200 rounded-lg overflow-hidden" data-testid={`cards-report-team-${group.team_id}`}>
          <div className="bg-slate-50 px-3 py-2 font-bold text-sm text-fsc-azul">{teamName}</div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {group.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 w-6">
                    <span
                      className={`inline-block w-3 h-4 rounded-sm ${r.type === "red" ? "bg-red-600" : r.type === "other" ? "bg-slate-400" : "bg-yellow-400"}`}
                      title={r.type === "red" ? "Roja" : r.type === "other" ? "Otra" : "Amarilla"}
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold">{r.who}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{r.description || ""}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{r.minute ? `Min ${r.minute} · ` : ""}{r.matchLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">FECHA</th>
              <th className="text-left px-4 py-2">Cuándo</th>
              <th className="text-left px-4 py-2">Local</th>
              <th className="text-center px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Visitante</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Sede</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => {
              const isBye = m.is_bye || m.status === "descansa" || m.home_team_id === "__BYE__" || m.away_team_id === "__BYE__";
              return (
              <tr key={m.id} className={`border-t border-slate-100 ${isBye ? "bg-amber-50/60" : ""}`} data-testid={`match-row-${m.id}`}>
                <td className="px-4 py-2 font-display font-black text-blue-700">FECHA {m.matchday || "?"}</td>
                <td className="px-4 py-2">{isBye ? (m.match_date ? formatDateTime(m.match_date).split(" ")[0] : "—") : (m.match_date ? formatDateTime(m.match_date) : "—")}</td>
                <td className="px-4 py-2 font-semibold">{m.home_team_name}</td>
                <td className="px-4 py-2 text-center font-display font-black tabular-nums">
                  {isBye ? <span className="text-amber-600 uppercase text-xs">Descansa</span> : (m.status === "finalizado" ? `${m.home_score} - ${m.away_score}` : "vs")}
                </td>
                <td className="px-4 py-2 font-semibold">{m.away_team_name}</td>
                <td className="px-4 py-2"><span className="text-xs uppercase tracking-wider font-bold">{m.status}</span></td>
                <td className="px-4 py-2 text-slate-500">{isBye ? "—" : (m.venue || "—")}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  {isBye ? (
                    <span className="text-[10px] text-amber-600 uppercase tracking-wider font-bold" title="Los partidos con equipo que descansa no admiten marcador ni tarjetas">Sin acciones</span>
                  ) : (
                    <>
                      <button onClick={() => onEdit(m)} className="text-slate-600 hover:text-blue-700" title="Editar fecha/hora/cancha" data-testid={`edit-match-${m.id}`}>
                        <CalendarClock size={16}/>
                      </button>
                      <button onClick={() => onScore(m)} className="text-blue-700" data-testid={`score-match-${m.id}`}><Edit3 size={16}/></button>
                    </>
                  )}
                  <button onClick={() => onRemove(m.id)} className="text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
              );
            })}
            {matches.length === 0 && <tr><td colSpan="8" className="text-center py-12 text-slate-400">Sin partidos</td></tr>}
            {matches.length > 0 && pageItems.length === 0 && <tr><td colSpan="8" className="text-center py-12 text-slate-400">Sin resultados para la búsqueda.</td></tr>}
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
  const declaredCats = tournament
    ? ((tournament.categories || []).map((c) => c.name).filter(Boolean).length
        ? (tournament.categories || []).map((c) => c.name).filter(Boolean)
        : (tournament.category ? [tournament.category] : []))
    : [];
  // Iter47: además de las categorías declaradas en el torneo, se incluyen las categorías
  // reales de los equipos inscritos — evita que un torneo con categorías desalineadas
  // (ej. declara 2010 pero sus equipos son Sub-8) quede imposible de filtrar.
  const teamCats = tid ? Array.from(new Set((teams || []).filter((t) => t.tournament_id === tid).map((t) => t.category).filter(Boolean))) : [];
  const cats = Array.from(new Set([...declaredCats, ...teamCats]));
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
        <select value={cat} onChange={(e) => { setCat(e.target.value); setGrp(""); }} className="px-2 py-1.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" disabled={!tid} data-testid="pdf-export-category">
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={grp} onChange={(e) => setGrp(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" disabled={!tid || !cat} data-testid="pdf-export-group">
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
        <table className="w-full min-w-[600px] text-sm">
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
                  {r.team_logo ? <img src={imgSrc(r.team_logo)} alt="" className="h-6 w-6 object-contain" /> : <span className="h-6 w-6 rounded bg-slate-200" />}
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
      <table className="w-full min-w-[600px] text-sm">
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
                {r.team_logo ? <img src={imgSrc(r.team_logo)} alt="" className="h-6 w-6 object-contain" /> : <span className="h-6 w-6 rounded bg-slate-200" />}
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



// Iter53: Lista de partidos adicionales (bonus) debajo de la tabla de partidos.
function BonusMatchesList({ bonusMatches, scopeTeams, maxPerTeam, teamCount, onEdit, onDelete }) {
  const RESULT_LABEL = { won: "Ganado", drawn: "Empatado", lost: "Perdido" };
  const RESULT_BADGE = { won: "bg-emerald-100 text-emerald-800", drawn: "bg-slate-100 text-slate-700", lost: "bg-red-100 text-red-800" };
  const usedByTeam = bonusMatches.reduce((acc, b) => { acc[b.team_id] = (acc[b.team_id] || 0) + 1; return acc; }, {});
  return (
    <div className="mt-6 border border-amber-200 bg-amber-50/40 rounded-lg p-4" data-testid="bonus-matches-section">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-display text-lg font-black uppercase tracking-tight text-amber-800">Partidos adicionales</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Fixture de {teamCount} equipos · máx <b>{maxPerTeam}</b> por equipo · suman directo a Clasificación y Juego Limpio.
          </p>
        </div>
        <div className="flex gap-3 text-[11px] text-slate-600">
          {scopeTeams.map((t) => {
            const used = usedByTeam[t.id] || 0;
            const remaining = Math.max(0, maxPerTeam - used);
            return (
              <span key={t.id} className={`px-2 py-1 rounded ${remaining === 0 ? "bg-slate-200 text-slate-500" : "bg-white text-slate-700 border border-slate-200"}`} data-testid={`bonus-quota-${t.id}`}>
                {t.name}: <b>{used}/{maxPerTeam}</b>
              </span>
            );
          })}
        </div>
      </div>
      {bonusMatches.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No hay partidos adicionales registrados.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-md">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-amber-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Equipo</th>
                <th className="text-left px-3 py-2">Resultado</th>
                <th className="text-center px-3 py-2">GF</th>
                <th className="text-center px-3 py-2">GC</th>
                <th className="text-center px-3 py-2" title="Amarillas"><span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" /></th>
                <th className="text-center px-3 py-2" title="Rojas"><span className="inline-block w-3 h-4 bg-red-600 rounded-sm" /></th>
                <th className="text-center px-3 py-2" title="Otras"><span className="inline-block w-3 h-4 bg-slate-400 rounded-sm" /></th>
                <th className="text-left px-3 py-2">Nota</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bonusMatches.map((b) => (
                <tr key={b.id} className="border-t border-slate-100" data-testid={`bonus-row-${b.id}`}>
                  <td className="px-3 py-2 font-semibold">{b.team_name || b.team_id}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${RESULT_BADGE[b.result]}`}>{RESULT_LABEL[b.result]}</span>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.goals_for}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.goals_against}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.yellow_cards}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.red_cards}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.other_cards}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs italic">{b.note || "—"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button onClick={() => onEdit(b)} className="text-blue-700" title="Editar" data-testid={`bonus-edit-${b.id}`}><Edit3 size={16}/></button>
                    <button onClick={() => onDelete(b.id)} className="text-red-600" title="Eliminar" data-testid={`bonus-delete-${b.id}`}><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function BonusMatchModal({ bonus, setBonus, onClose, onSubmit, scopeTeams, maxPerTeam, bonusCountByTeam, teamCount }) {
  const title = bonus.id ? "Editar partido adicional" : "Nuevo partido adicional";
  return (
    <Modal onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-3" data-testid="bonus-modal">
        <p className="text-xs text-slate-500 -mt-1">
          Fixture de {teamCount} equipos · máximo <b>{maxPerTeam}</b> por equipo.
        </p>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Equipo</span>
          <select
            required
            value={bonus.team_id}
            onChange={(e) => setBonus({ ...bonus, team_id: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
            data-testid="bonus-team"
          >
            <option value="">Seleccionar equipo...</option>
            {scopeTeams.map((t) => {
              const used = bonusCountByTeam[t.id] || 0;
              const disabled = !bonus.id && used >= maxPerTeam;
              return (
                <option key={t.id} value={t.id} disabled={disabled}>
                  {t.name} {disabled ? `(sin cupos — ${used}/${maxPerTeam})` : `(${used}/${maxPerTeam})`}
                </option>
              );
            })}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultado</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[
              { v: "won", label: "Ganado", cls: "border-emerald-500 bg-emerald-50 text-emerald-800" },
              { v: "drawn", label: "Empatado", cls: "border-slate-400 bg-slate-50 text-slate-700" },
              { v: "lost", label: "Perdido", cls: "border-red-500 bg-red-50 text-red-800" },
            ].map((o) => (
              <button
                type="button"
                key={o.v}
                onClick={() => setBonus({ ...bonus, result: o.v })}
                className={`px-3 py-2 rounded border-2 text-sm font-bold uppercase tracking-wider ${bonus.result === o.v ? o.cls : "border-slate-200 text-slate-400"}`}
                data-testid={`bonus-result-${o.v}`}
              >{o.label}</button>
            ))}
          </div>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Goles a favor</span>
            <input type="number" min="0" value={bonus.goals_for} onChange={(e) => setBonus({ ...bonus, goals_for: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="bonus-gf" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Goles en contra</span>
            <input type="number" min="0" value={bonus.goals_against} onChange={(e) => setBonus({ ...bonus, goals_against: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="bonus-ga" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" /> Amarillas</span>
            <input type="number" min="0" value={bonus.yellow_cards} onChange={(e) => setBonus({ ...bonus, yellow_cards: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="bonus-yc" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><span className="inline-block w-3 h-4 bg-red-600 rounded-sm" /> Rojas</span>
            <input type="number" min="0" value={bonus.red_cards} onChange={(e) => setBonus({ ...bonus, red_cards: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="bonus-rc" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1"><span className="inline-block w-3 h-4 bg-slate-400 rounded-sm" /> Otras</span>
            <input type="number" min="0" value={bonus.other_cards} onChange={(e) => setBonus({ ...bonus, other_cards: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md tabular-nums" data-testid="bonus-oc" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nota (opcional)</span>
          <input type="text" value={bonus.note || ""} onChange={(e) => setBonus({ ...bonus, note: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Ej: Partido amistoso reglamentario" data-testid="bonus-note" />
        </label>
        <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="bonus-save-btn">
          {bonus.id ? "Guardar cambios" : "Crear partido adicional"}
        </button>
      </form>
    </Modal>
  );
}
