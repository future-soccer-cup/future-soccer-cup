import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";
import CategorySelect from "../../components/CategorySelect";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";
import ExportCsvButton from "../../components/ExportCsvButton";

const EMPTY = { name: "", category: "Sub-12", birth_year: null, coach: "", city: "", logo_url: "", color: "#1d4ed8", group_name: "" };

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => api.get("/teams").then((r) => setTeams(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const matchFn = useCallback((t, q) =>
    (t.name || "").toLowerCase().includes(q) ||
    (t.category || "").toLowerCase().includes(q) ||
    (t.city || "").toLowerCase().includes(q) ||
    (t.coach || "").toLowerCase().includes(q) ||
    String(t.birth_year || "").includes(q)
  , []);

  const { query, setQuery, page, setPage, totalPages, pageItems, filtered, filteredCount, totalCount } =
    usePagedSearch(teams, matchFn, 15);

  const exportColumns = [
    { key: "name", label: "Nombre" },
    { key: "category", label: "Categoría" },
    { key: "birth_year", label: "Año" },
    { key: "group_name", label: "Grupo" },
    { key: "city", label: "Ciudad" },
    { key: "country", label: "País" },
    { key: "coach", label: "DT" },
    { key: "president", label: "Presidente" },
    { key: "delegate_phone", label: "Teléfono delegado" },
    { key: "event_type", label: "Evento" },
    { key: "registration_fee", label: "Inscripción (COP)" },
    { key: "registration_payment_status", label: "Estado pago" },
    { key: "status", label: "Estado equipo" },
  ];

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.put(`/teams/${editing.id}`, editing);
        toast.success("Equipo actualizado");
      } else {
        await api.post("/teams", editing);
        toast.success("Equipo creado");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar equipo y todos sus jugadores?")) return;
    await api.delete(`/teams/${id}`);
    toast.success("Equipo eliminado");
    load();
  };

  return (
    <div data-testid="admin-teams">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter shrink-0">Equipos</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2 shrink-0" data-testid="add-team-btn"><Plus size={16}/> Nuevo</button>
      </div>

      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, categoría, ciudad, DT o año..."
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="teams"
          />
        </div>
        <ExportCsvButton rows={filtered} columns={exportColumns} filename="equipos" testId="teams-export-csv" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-left px-4 py-2">Ciudad</th>
              <th className="text-left px-4 py-2">DT</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <tr key={t.id} className="border-t border-slate-100" data-testid={`team-row-${t.id}`}>
                <td className="px-4 py-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-display font-black text-white" style={{ background: t.color }}>{t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-contain" /> : t.name[0]}</div>
                  <span className="font-semibold">{t.name}</span>
                </td>
                <td className="px-4 py-2">{t.category}</td>
                <td className="px-4 py-2">{t.city || "—"}</td>
                <td className="px-4 py-2">{t.coach || "—"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing({ ...t })} className="text-blue-700" data-testid={`edit-team-${t.id}`}><Pencil size={16}/></button>
                  <button onClick={() => remove(t.id)} className="text-red-600" data-testid={`delete-team-${t.id}`}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan="5" className="text-center py-12 text-slate-400">{teams.length === 0 ? "Sin equipos" : "Sin resultados"}</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="teams" />

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar equipo" : "Nuevo equipo"}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nombre" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <CategorySelect required value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Año de nacimiento" type="number" value={editing.birth_year || ""} onChange={(v) => setEditing({ ...editing, birth_year: v ? Number(v) : null })} />
              <Field label="Grupo" value={editing.group_name} onChange={(v) => setEditing({ ...editing, group_name: v })} />
            </div>
            <Field label="Ciudad" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
            <Field label="DT" value={editing.coach} onChange={(v) => setEditing({ ...editing, coach: v })} />
            <ImageUpload value={editing.logo_url} onChange={(v) => setEditing({ ...editing, logo_url: v })} label="Escudo" testId="team-logo-upload" />
            <Field label="Color (hex)" value={editing.color} onChange={(v) => setEditing({ ...editing, color: v })} />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-team-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Field({ label, value, onChange, required, type = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input required={required} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
    </label>
  );
}

export function Modal({ children, onClose, title }) {
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
