import { useEffect, useState } from "react";
import api, { formatApiError, imgSrc } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2, Instagram } from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import { Modal, Field } from "./AdminTeams";

const EMPTY = { title: "", content: "", image_url: "", instagram_url: "", category: "evento" };
const CATS = ["evento", "resultado", "anuncio", "foto"];

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const load = () => api.get("/posts").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await api.put(`/posts/${editing.id}`, editing);
      else await api.post("/posts", editing);
      toast.success("Guardado");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar publicación?")) return;
    await api.delete(`/posts/${id}`);
    load();
  };

  const importFromUrl = async () => {
    if (!importUrl.startsWith("http")) { toast.error("URL inválida"); return; }
    setImporting(true);
    try {
      const r = await api.post("/posts/import-from-url", { url: importUrl });
      setEditing({ ...EMPTY, ...r.data, category: importUrl.includes("instagram.com") ? "foto" : "evento" });
      setImportUrl("");
      toast.success("Datos importados. Revísalos antes de guardar.");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div data-testid="admin-posts">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Noticias</h1>
          <p className="text-sm text-slate-500 mt-1">Publica eventos, resultados y fotos del torneo. Importa desde URL de Instagram para ahorrar tiempo.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2" data-testid="add-post-btn"><Plus size={16}/> Nueva</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
        <Instagram className="text-blue-700" />
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Importar desde URL</div>
          <p className="text-xs text-slate-600">Pega un link de Instagram o cualquier URL pública. Extraemos imagen y descripción.</p>
        </div>
        <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm" data-testid="import-url-input" />
        <button onClick={importFromUrl} disabled={importing || !importUrl} className="fsc-btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50" data-testid="import-url-btn">
          {importing ? "..." : "Importar"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 w-12">Imagen</th>
              <th className="text-left px-4 py-2">Título</th>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && <tr><td colSpan="5" className="text-center py-12 text-slate-400">Sin publicaciones</td></tr>}
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100" data-testid={`post-row-${p.id}`}>
                <td className="px-4 py-2">
                  {p.image_url ? <img src={imgSrc(p.image_url)} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-slate-200" />}
                </td>
                <td className="px-4 py-2 font-semibold">{p.title}</td>
                <td className="px-4 py-2 text-xs uppercase tracking-wider">{p.category}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(p.published_at).toLocaleDateString("es")}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing({ ...p })} className="text-blue-700"><Pencil size={16}/></button>
                  <button onClick={() => remove(p.id)} className="text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar publicación" : "Nueva publicación"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Título" required value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contenido</span>
              <textarea required value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" rows={5} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</span>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md">
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <ImageUpload value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} label="Imagen" testId="post-image" />
            <Field label="URL de Instagram (opcional)" value={editing.instagram_url} onChange={(v) => setEditing({ ...editing, instagram_url: v })} />
            <button className="fsc-btn-primary w-full py-2 rounded-md" data-testid="save-post-btn">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
