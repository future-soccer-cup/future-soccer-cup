import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import CategorySelect from "../../components/CategorySelect";
import { toast, Toaster } from "sonner";
import { Wand2, Save, RefreshCw, Plus, X } from "lucide-react";

export default function AdminFixtureGenerator() {
  const [teams, setTeams] = useState([]);
  const [category, setCategory] = useState("");
  const [groupName, setGroupName] = useState("Grupo A");
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [daysBetween, setDaysBetween] = useState(1);
  const [venues, setVenues] = useState(["Cancha 1"]);
  const [slots, setSlots] = useState(["10:00"]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/teams").then((r) => setTeams(r.data)); }, []);

  const filtered = category ? teams.filter((t) => t.category === category) : teams;

  const toggleTeam = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const generate = async (saveIt) => {
    if (selectedIds.length < 2) { toast.error("Selecciona al menos 2 equipos"); return; }
    if (!category || !startDate) { toast.error("Completa categoría y fecha de inicio"); return; }
    setLoading(true);
    try {
      const res = await api.post("/fixtures/generate", {
        category,
        group_name: groupName,
        team_ids: selectedIds,
        start_date: startDate,
        days_between_rounds: Number(daysBetween),
        venues: venues.filter(Boolean),
        time_slots: slots.filter(Boolean),
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
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Generador de Fixture</h1>
        <p className="text-sm text-slate-500 mt-1">Round-robin automático: todos contra todos. Si hay número impar de equipos, uno descansa por jornada.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <CategorySelect value={category} onChange={(v) => { setCategory(v); setSelectedIds([]); }} required testId="fg-category" />

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Grupo</span>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" placeholder="Grupo A / Unigrupo" data-testid="fg-group" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inicio</span>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-start-date" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días entre jornadas</span>
              <input type="number" min="1" value={daysBetween} onChange={(e) => setDaysBetween(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="fg-days" />
            </label>
          </div>

          <ListEditor label="Canchas" items={venues} setItems={setVenues} placeholder="Cancha 5.1" testId="fg-venues" />
          <ListEditor label="Horarios" items={slots} setItems={setSlots} placeholder="10:00" testId="fg-slots" />

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
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">{category ? "Sin equipos en esta categoría" : "Selecciona una categoría primero"}</p>
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
              <div className="flex justify-between"><span className="text-slate-400">Equipos</span><span className="font-display text-2xl font-black">{selectedIds.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Jornadas</span><span className="font-display text-2xl font-black">{preview.rounds}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Partidos</span><span className="font-display text-2xl font-black">{preview.matches.length}</span></div>
              {preview.byes_per_round?.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-1">Descansos</div>
                  {preview.byes_per_round.map((b) => (
                    <div key={b.round} className="text-xs">Jornada {b.round}: <span className="text-white font-semibold">{b.team_name}</span></div>
                  ))}
                </div>
              )}
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

function ListEditor({ label, items, setItems, placeholder, testId }) {
  const update = (i, v) => { const next = [...items]; next[i] = v; setItems(next); };
  const remove = (i) => { const next = [...items]; next.splice(i, 1); setItems(next.length ? next : [""]); };
  const add = () => setItems([...items, ""]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <button type="button" onClick={add} className="text-xs font-bold text-blue-700 flex items-center gap-1" data-testid={`${testId}-add`}><Plus size={12}/> Agregar</button>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-1">
            <input value={it} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm" data-testid={`${testId}-${i}`} />
            <button type="button" onClick={() => remove(i)} className="px-2 text-slate-400 hover:text-red-600"><X size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
