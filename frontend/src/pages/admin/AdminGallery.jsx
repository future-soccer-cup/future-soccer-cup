import { useCallback, useEffect, useState } from "react";
import api, { imgSrc } from "../../lib/api";
import { Trash2, Plus, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState({ title: "", caption: "", image_url: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/gallery");
      setItems(r.data || []);
    } catch {
      toast.error("Error al cargar galería");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!adding.image_url) { toast.error("Sube una imagen primero"); return; }
    setSaving(true);
    try {
      await api.post("/gallery", { ...adding, sort_order: Number(adding.sort_order) || 0 });
      toast.success("Imagen agregada");
      setAdding({ title: "", caption: "", image_url: "", sort_order: 0 });
      load();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const update = async (g) => {
    try {
      await api.put(`/gallery/${g.id}`, {
        title: g.title || "",
        image_url: g.image_url,
        caption: g.caption || "",
        sort_order: Number(g.sort_order) || 0,
      });
      toast.success("Actualizado");
      load();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const remove = async (g) => {
    if (!window.confirm("¿Eliminar imagen de la galería?")) return;
    try {
      await api.delete(`/gallery/${g.id}`);
      toast.success("Eliminada");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div data-testid="admin-gallery">
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-wider text-fsc-negro">GALERÍA</h1>
        <p className="text-sm text-slate-500 mt-1">Imágenes de ediciones pasadas mostradas en la home pública.</p>
      </div>

      {/* Nueva imagen */}
      <div className="bg-white border-2 border-fsc-negro rounded-xl p-5 mb-8 fsc-card-shadow">
        <div className="font-display text-xl tracking-wider mb-4 flex items-center gap-2"><Plus size={20}/> Agregar imagen</div>
        <div className="grid md:grid-cols-2 gap-4">
          <ImageUpload value={adding.image_url} onChange={(v) => setAdding({ ...adding, image_url: v })} label="Imagen" testId="gallery-upload" />
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Título</span>
              <input value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" data-testid="gallery-title" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción / Caption</span>
              <input value={adding.caption} onChange={(e) => setAdding({ ...adding, caption: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Orden (menor = primero)</span>
              <input type="number" value={adding.sort_order} onChange={(e) => setAdding({ ...adding, sort_order: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
            </label>
            <button onClick={add} disabled={saving} className="fsc-btn-primary w-full py-2.5 rounded-md text-sm disabled:opacity-50" data-testid="gallery-add-btn">
              {saving ? "Guardando..." : "Agregar a galería"}
            </button>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400" data-testid="gallery-empty">
            Sin imágenes en la galería aún.
          </div>
        )}
        {items.map((g) => (
          <div key={g.id} className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden" data-testid={`gallery-item-${g.id}`}>
            <div className="aspect-[4/3] bg-slate-100">
              <img src={imgSrc(g.image_url)} alt={g.title || ""} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 space-y-2">
              <input value={g.title || ""} onChange={(e) => setItems(items.map((x) => x.id === g.id ? { ...x, title: e.target.value } : x))} placeholder="Título" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              <input value={g.caption || ""} onChange={(e) => setItems(items.map((x) => x.id === g.id ? { ...x, caption: e.target.value } : x))} placeholder="Caption" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-slate-400" />
                <input type="number" value={g.sort_order ?? 0} onChange={(e) => setItems(items.map((x) => x.id === g.id ? { ...x, sort_order: e.target.value } : x))} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                <button onClick={() => update(g)} className="text-fsc-azul-oscuro hover:text-fsc-azul" title="Guardar" data-testid={`gallery-save-${g.id}`}><Save size={16}/></button>
                <button onClick={() => remove(g)} className="text-fsc-rojo" title="Eliminar" data-testid={`gallery-delete-${g.id}`}><Trash2 size={16}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
