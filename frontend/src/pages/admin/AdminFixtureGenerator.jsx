import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Wand2, Save, Plus, X, Trophy, MapPin } from "lucide-react";
import VenuePicker from "../../components/VenuePicker";

export default function AdminFixtureGenerator() {
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState("");
  const [teams, setTeams] = useState([]);
  const [category, setCategory] = useState("");
  const [groupName, setGroupName] = useState("Grupo A");
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [daysBetween, setDaysBetween] = useState(1);
  const [rounds, setRounds] = useState(1);
  const [venues, setVenues] = useState([""]);
  const [slots, setSlots] = useState(["10:00"]);
  const [doubleMatchday, setDoubleMatchday] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/tournaments"),
      api.get("/teams"),
    ]).then(([trs, ts]) => {
      // Solo eventos ACTIVOS (no archivados) pueden recibir fixtures
      setTournaments((trs.data || []).filter((t) => !t.archived));
      setTeams(ts.data || []);
    });
  }, []);

  const tournament = useMemo(() => tournaments.find((t) => t.id === tournamentId), [tournaments, tournamentId]);

  // Categorías del torneo (si tiene config en categories) o fallback a la principal
  const tournamentCategories = useMemo(() => {
    if (!tournament) return [];
    const cats = (tournament.categories || []).map((c) => c.name).filter(Boolean);
    if (cats.length) return cats;
    return tournament.category ? [tournament.category] : [];
  }, [tournament]);

  const filtered = category ? teams.filter((t) => t.category === category) : [];

  const toggleTeam = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const generate = async (saveIt) => {
    if (!tournamentId) { toast.error("Selecciona un Evento"); return; }
    if (!category) { toast.error("Selecciona una Categoría"); return; }
    if (selectedIds.length < 2) { toast.error("Selecciona al menos 2 equipos"); return; }
    if (!startDate) { toast.error("Indica la fecha de inicio"); return; }
    if (doubleMatchday && slots.filter(Boolean).length < 2) {
      toast.error("Doble jornada requiere al menos 2 horarios (mañana + tarde)");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/fixtures/generate", {
        tournament_id: tournamentId,
        category,
        group_name: groupName,
        team_ids: selectedIds,
        start_date: startDate,
        days_between_rounds: Number(daysBetween),
        rounds: Number(rounds) || 1,
        venues: venues.filter(Boolean),
        time_slots: slots.filter(Boolean),
        double_matchday: doubleMatchday,
        preview: !saveIt,
      });
      setPreview(res.data);
      if (saveIt) {
        toast.success(`Fixture creado: ${res.data.matches.length} partidos en ${res.data.rounds} jornadas`);
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
    <div data-testid="fixture-generator">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Generar Fixture</h1>
        <p className="text-sm text-slate-500 mt-1">Selecciona un Evento activo, luego la Categoría y los equipos. Todo el fixture queda asociado a esa combinación y se conserva en el histórico.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {/* Paso 1 — Evento */}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1"><Trophy size={12}/> Paso 1 · Evento activo</span>
            <select required value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setCategory(""); setSelectedIds([]); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-tournament">
              <option value="">Seleccionar evento...</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.season}</option>)}
            </select>
          </label>

          {/* Paso 2 — Categoría */}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Paso 2 · Categoría</span>
            <select required value={category} onChange={(e) => { setCategory(e.target.value); setSelectedIds([]); }} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md disabled:bg-slate-50" disabled={!tournamentId} data-testid="fg-category">
              <option value="">{tournamentId ? "Seleccionar categoría..." : "Primero elige el evento"}</option>
              {tournamentCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Paso 3 — Grupo, fecha, vueltas */}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Paso 3 · Grupo</span>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Grupo A / Unigrupo" data-testid="fg-group" />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inicio</span>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-start-date" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Días/jornada</span>
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
                  <VenuePicker
                    value={v}
                    onChange={(name) => { const next = [...venues]; next[i] = name; setVenues(next); }}
                    testId={`fg-venue-${i}`}
                  />
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

          <label className="flex items-start gap-3 p-3 rounded-md border border-blue-200 bg-blue-50/40 cursor-pointer" data-testid="fg-double-matchday-label">
            <input type="checkbox" checked={doubleMatchday} onChange={(e) => setDoubleMatchday(e.target.checked)} className="mt-1" data-testid="fg-double-matchday" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-blue-900">Doble jornada (2 jornadas por día)</span>
              <span className="block text-xs text-slate-500 mt-0.5">Cada equipo juega 2 veces el mismo día. Requiere 2+ horarios.</span>
            </span>
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={() => generate(false)} disabled={loading} className="flex-1 fsc-btn-primary py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid="fg-preview-btn">
              <Wand2 size={16}/> {loading ? "..." : "Vista previa"}
            </button>
            {preview && !preview.saved && (
              <button onClick={() => generate(true)} disabled={loading} className="flex-1 fsc-btn-red py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid="fg-save-btn">
                <Save size={16}/> Guardar
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-black uppercase tracking-tight">Equipos {category && `(${category})`}</h3>
            <span className="text-xs font-bold text-blue-700">{selectedIds.length} seleccionados</span>
          </div>
          {!category ? (
            <p className="text-sm text-slate-400 py-6 text-center">Selecciona Evento y Categoría primero.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin equipos en esta categoría.</p>
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
              {preview.saved && <div className="mt-3 px-3 py-2 bg-green-500/20 text-green-300 rounded text-xs font-bold uppercase tracking-wider">Guardado en el sistema</div>}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="mt-8">
          <h3 className="font-display text-2xl font-black uppercase tracking-tight mb-3">Partidos generados</h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">Jornada</th>
                  <th className="text-left px-4 py-2">Fecha</th>
                  <th className="text-right px-4 py-2">Local</th>
                  <th className="text-center px-4 py-2">vs</th>
                  <th className="text-left px-4 py-2">Visitante</th>
                  <th className="text-left px-4 py-2">Cancha</th>
                </tr>
              </thead>
              <tbody>
                {preview.matches.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100" data-testid={`fg-match-${m.id}`}>
                    <td className="px-4 py-2 font-display font-black text-blue-700">F{m.matchday}</td>
                    <td className="px-4 py-2 text-slate-600">{new Date(m.match_date).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</td>
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
    </div>
  );
}
