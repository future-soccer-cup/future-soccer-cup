import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Trash2, Edit3, Archive, ArchiveRestore, Download, Trophy, Star } from "lucide-react";
import { toast } from "sonner";
import { Modal, Field } from "./AdminTeams";
import CategorySelect from "../../components/CategorySelect";
import ImageUpload from "../../components/ImageUpload";

const EMPTY = {
  name: "",
  season: String(new Date().getFullYear()),
  category: "",
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

const EVENT_TYPES = [
  { v: "", l: "Sin tipo" },
  { v: "festival", l: "Festival (octubre)" },
  { v: "premier_par", l: "Premier Par (diciembre)" },
  { v: "premier_impar", l: "Premier Impar (diciembre)" },
];

export default function AdminTournaments() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tournaments");
      setItems(res.data);
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
      if (editing.id) {
        await api.put(`/tournaments/${editing.id}`, editing);
        toast.success("Evento actualizado");
      } else {
        await api.post("/tournaments", editing);
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Temporada</th>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-left px-4 py-2">Formato</th>
              <th className="text-left px-4 py-2">Periodo</th>
              <th className="text-center px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Cargando...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-400">Sin eventos. Crea el primero.</td></tr>}
            {items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`tour-row-${t.id}`}>
                <td className="px-4 py-2 font-semibold flex items-center gap-2">
                  <Trophy size={14} className={t.archived ? "text-slate-400" : "text-blue-700"} />
                  {t.name}
                </td>
                <td className="px-4 py-2 text-slate-600">{t.season}</td>
                <td className="px-4 py-2"><span className="text-xs uppercase font-bold tracking-wider">{t.category}</span></td>
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
                  <button onClick={() => toggleFeatured(t)} className={t.featured ? "text-fsc-dorado" : "text-slate-300 hover:text-fsc-dorado"} title={t.featured ? "Quitar destacado" : "Marcar como destacado"} data-testid={`feature-tour-${t.id}`}>
                    <Star size={16} fill={t.featured ? "currentColor" : "none"}/>
                  </button>
                  <button onClick={() => setEditing({ ...t })} className="text-blue-700" title="Editar" data-testid={`edit-tour-${t.id}`}><Edit3 size={16}/></button>
                  <button onClick={() => toggleArchive(t)} className="text-slate-600" title={t.archived ? "Reactivar" : "Archivar"} data-testid={`archive-tour-${t.id}`}>
                    {t.archived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}
                  </button>
                  <button onClick={() => remove(t.id)} className="text-red-600" title="Eliminar" data-testid={`delete-tour-${t.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                >
                  {EVENT_TYPES.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
                </select>
              </label>
            </div>
            <CategorySelect
              value={editing.category}
              onChange={(v) => setEditing({ ...editing, category: v })}
              required
              testId="tour-category"
            />
            <CategoriesFeesEditor
              categories={editing.categories || []}
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


const CATEGORY_OPTIONS = ["Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18", "Femenino"];

function CategoriesFeesEditor({ categories, onChange }) {
  const add = () => onChange([...categories, { name: "", fee: 0 }]);
  const update = (i, k, v) => {
    const next = [...categories];
    next[i] = { ...next[i], [k]: k === "fee" ? Number(v) || 0 : v };
    onChange(next);
  };
  const remove = (i) => onChange(categories.filter((_, j) => j !== i));
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 mt-2" data-testid="categories-fees-editor">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-fsc-dorado-oscuro">Categorías inscritas al evento</div>
          <div className="text-[11px] text-slate-500">Cada categoría puede tener un costo de inscripción distinto.</div>
        </div>
        <button type="button" onClick={add} className="text-xs font-bold uppercase tracking-wider text-fsc-negro border-2 border-fsc-dorado bg-fsc-dorado/10 hover:bg-fsc-dorado/20 px-3 py-1.5 rounded" data-testid="add-category-fee">+ Agregar categoría</button>
      </div>
      {categories.length === 0 && <p className="text-[11px] italic text-slate-400">Aún no hay categorías. La categoría principal del evento (arriba) se usará si dejas esta lista vacía.</p>}
      <div className="space-y-2">
        {categories.map((c, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end" data-testid={`category-fee-row-${i}`}>
            <label className="col-span-6 sm:col-span-5 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categoría</span>
              <select value={c.name} onChange={(e) => update(i, "name", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                <option value="">Selecciona...</option>
                {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
            <label className="col-span-5 sm:col-span-6 block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inscripción (COP)</span>
              <input type="number" min="0" value={c.fee} onChange={(e) => update(i, "fee", e.target.value)} className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm tabular-nums" data-testid={`category-fee-input-${i}`} />
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
