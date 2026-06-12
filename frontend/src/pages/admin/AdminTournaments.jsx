import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit3, Archive, ArchiveRestore, Download, Trophy, Star } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";
import ImageUpload from "../../components/ImageUpload";
import CurrencyInput from "../../components/CurrencyInput";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";

const EMPTY = {
  name: "",
  season: String(new Date().getFullYear()),
  category: "",   // legacy single — se llenará con la primera de `categories` para compat backend.
  categories: [], // [{name, fee}]
  start_date: "",
  end_date: "",
  event_type: "",
  fmt: "round_robin",
  archived: false,
  featured: false,
  city: "",
  venue: "",
  cover_url: "",
};

const FORMATS = [
  { v: "round_robin", l: "Round-robin (todos vs todos)" },
  { v: "cuadrangular_x2", l: "Cuadrangulares x2 + Intergrupos (8 equipos)" },
  { v: "eliminacion", l: "Eliminación directa (bracket)" },
];

export default function AdminTournaments() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, eRes, cRes] = await Promise.all([
        api.get("/tournaments"),
        api.get("/admin/event-types"),
        api.get("/admin/categories"),
      ]);
      setItems(tRes.data);
      setEventTypes(eRes.data || []);
      setCategories(cRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Error cargando eventos");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      // Compat: el backend exige `category` (single). Tomamos la 1ª de la lista o vacía.
      const body = { ...editing };
      if (body.categories && body.categories.length > 0) {
        body.category = body.categories[0].name || body.category || "Sub-12";
      } else if (!body.category) {
        body.category = "Sub-12";
      }
      if (editing.id) {
        await api.put(`/tournaments/${editing.id}`, body);
        toast.success("Evento actualizado");
      } else {
        await api.post("/tournaments", body);
        toast.success("Evento creado");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar evento? (No borra los partidos asociados)")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      toast.success("Evento eliminado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const toggleFeatured = async (t) => {
    try {
      await api.put(`/tournaments/${t.id}`, { featured: !t.featured });
      toast.success(t.featured ? "Quitado de destacados" : "Marcado como destacado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const toggleArchive = async (t) => {
    try {
      await api.put(`/tournaments/${t.id}`, { archived: !t.archived });
      toast.success(t.archived ? "Reactivado" : "Archivado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/import/matches-template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fsc_partidos_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("No se pudo descargar la plantilla");
    }
  };

  const matchFn = useCallback((t, q) =>
    (t.name || "").toLowerCase().includes(q) ||
    String(t.season || "").includes(q) ||
    (t.category || "").toLowerCase().includes(q) ||
    (t.event_type || "").toLowerCase().includes(q) ||
    (t.city || "").toLowerCase().includes(q) ||
    ((t.categories || []).map((c) => c.name || "").join(" ").toLowerCase().includes(q))
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filteredCount, totalCount } =
    usePagedSearch(items, matchFn, 15);

  return (
    <div data-testid="admin-tournaments">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Eventos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona los eventos del calendario FSC y archiva los históricos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="download-matches-template">
            <Download size={16}/> Plantilla partidos (XLSX)
          </button>
          <button onClick={() => setEditing({ ...EMPTY })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-tournament-btn">
            <Plus size={16}/> Nuevo evento
          </button>
        </div>
      </div>

      <div className="mb-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, temporada, categoría, tipo o ciudad..."
          filteredCount={filteredCount}
          totalCount={totalCount}
          testIdPrefix="tournaments"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-fsc-azul/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Temporada</th>
              <th className="text-left px-4 py-2">Categorías</th>
              <th className="text-left px-4 py-2">Formato</th>
              <th className="text-left px-4 py-2">Periodo</th>
              <th className="text-center px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Sin eventos. Crea el primero.</td></tr>}
            {!loading && items.length > 0 && pageItems.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Sin resultados para la búsqueda.</td></tr>}
            {pageItems.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`tour-row-${t.id}`}>
                <td className="px-4 py-2 font-semibold flex items-center gap-2">
                  <Trophy size={14} className={t.archived ? "text-slate-400" : "text-fsc-azul"} />
                  {t.name}
                </td>
                <td className="px-4 py-2 text-slate-600">{t.season}</td>
                <td className="px-4 py-2 text-xs">
                  {(t.categories && t.categories.length > 0)
                    ? t.categories.map((c) => c.name).join(", ")
                    : <span className="uppercase font-bold tracking-wider">{t.category}</span>}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {FORMATS.find((f) => f.v === t.fmt)?.l || t.fmt}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{t.start_date} → {t.end_date}</td>
                <td className="px-4 py-2 text-center">
                  {t.archived
                    ? <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Archivado</span>
                    : <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Activo</span>}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => toggleFeatured(t)} className={t.featured ? "text-fsc-azul" : "text-slate-300 hover:text-fsc-azul"} title={t.featured ? "Quitar destacado" : "Marcar como destacado"} data-testid={`feature-tour-${t.id}`}>
                    <Star size={16} fill={t.featured ? "currentColor" : "none"}/>
                  </button>
                  <button onClick={() => setEditing({ ...EMPTY, ...t })} className="text-fsc-azul" title="Editar" data-testid={`edit-tour-${t.id}`}><Edit3 size={16}/></button>
                  <button onClick={() => toggleArchive(t)} className="text-slate-600" title={t.archived ? "Reactivar" : "Archivar"} data-testid={`archive-tour-${t.id}`}>
                    {t.archived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}
                  </button>
                  <button onClick={() => remove(t.id)} className="text-fsc-rojo" title="Eliminar" data-testid={`delete-tour-${t.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="tournaments" />

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar evento" : "Nuevo evento"}>
          <form onSubmit={save} className="space-y-3" data-testid="tournament-form">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Temporada" required value={editing.season} onChange={(v) => setEditing({ ...editing, season: v })} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de evento</span>
                <select
                  value={editing.event_type || ""}
                  onChange={(e) => setEditing({ ...editing, event_type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                  data-testid="tour-event-type"
                >
                  <option value="">— Sin tipo —</option>
                  {eventTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <a href="/admin/tipos-evento" className="text-[10px] text-fsc-azul underline">Gestionar tipos de evento</a>
              </label>
            </div>
            <CategoriesFeesEditor
              categories={editing.categories || []}
              catalog={categories}
              onChange={(cats) => setEditing({ ...editing, categories: cats })}
            />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Formato</span>
              <select
                value={editing.fmt || "round_robin"}
                onChange={(e) => setEditing({ ...editing, fmt: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                data-testid="tour-fmt"
              >
                {FORMATS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" type="date" required value={editing.start_date} onChange={(v) => setEditing({ ...editing, start_date: v })} />
              <Field label="Fin" type="date" required value={editing.end_date} onChange={(v) => setEditing({ ...editing, end_date: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" value={editing.city || ""} onChange={(v) => setEditing({ ...editing, city: v })} />
              <Field label="Sede / Cancha" value={editing.venue || ""} onChange={(v) => setEditing({ ...editing, venue: v })} />
            </div>
            <ImageUpload value={editing.cover_url || ""} onChange={(v) => setEditing({ ...editing, cover_url: v })} label="Imagen de portada (Home / Eventos)" testId="tour-cover" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} data-testid="tour-featured" />
              <span>Destacado — aparece como Próximo Evento Premier en el Home</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.archived} onChange={(e) => setEditing({ ...editing, archived: e.target.checked })} data-testid="tour-archived" />
              <span>Archivado (histórico — no aparece como activo en datos en vivo)</span>
            </label>
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-tournament-btn">
              {editing.id ? "Guardar cambios" : "Crear evento"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CategoriesFeesEditor({ categories, catalog, onChange }) {
  const add = () => onChange([...categories, { name: "", fee: 0, fee_usd: 0 }]);
  const update = (i, k, v) => {
    const next = [...categories];
    next[i] = { ...next[i], [k]: v };
    onChange(next);
  };
  const remove = (i) => onChange(categories.filter((_, j) => j !== i));
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 mt-2" data-testid="categories-fees-editor">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-fsc-azul">Categorías inscritas al evento</div>
          <div className="text-[11px] text-slate-500">El evento se asociará a TODAS las categorías agregadas aquí. Cada una con su costo de inscripción en COP y USD.</div>
          <a href="/admin/categorias" className="text-[10px] text-fsc-azul underline">Gestionar catálogo de categorías</a>
        </div>
        <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wider text-white bg-fsc-azul hover:bg-fsc-azul-oscuro px-3 py-1.5 rounded" data-testid="add-category-fee">+ Agregar categoría</button>
      </div>
      {categories.length === 0 && <p className="text-[11px] italic text-slate-400">Aún no hay categorías. Agrega al menos una.</p>}
      <div className="space-y-2">
        {categories.map((c, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end" data-testid={`category-fee-row-${i}`}>
            <label className="col-span-12 sm:col-span-4 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categoría</span>
              <select value={c.name} onChange={(e) => update(i, "name", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                <option value="">Selecciona...</option>
                {catalog.map((opt) => <option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}
              </select>
            </label>
            <label className="col-span-6 sm:col-span-4 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inscripción (COP)</span>
              <CurrencyInput value={c.fee} onChange={(v) => update(i, "fee", v)} className="w-full text-sm" data-testid={`category-fee-input-${i}`} />
            </label>
            <label className="col-span-5 sm:col-span-3 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inscripción (USD)</span>
              <CurrencyInput value={c.fee_usd || 0} onChange={(v) => update(i, "fee_usd", v)} className="w-full text-sm" data-testid={`category-fee-usd-input-${i}`} />
            </label>
            <button type="button" onClick={() => remove(i)} className="col-span-1 text-fsc-rojo hover:bg-red-50 p-1.5 rounded" data-testid={`remove-category-fee-${i}`}>
              <Trash2 size={14}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
