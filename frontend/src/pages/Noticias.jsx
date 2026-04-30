import { useEffect, useState } from "react";
import api, { imgSrc } from "../lib/api";
import { Instagram, ExternalLink } from "lucide-react";

export default function Noticias() {
  const [posts, setPosts] = useState([]);
  const [ig, setIg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/posts"), api.get("/social/instagram")])
      .then(([p, i]) => { setPosts(p.data); setIg(i.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="noticias-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-blue-700">Lo último</span>
          <h1 className="font-display text-5xl md:text-6xl font-black uppercase tracking-tighter">Noticias y eventos</h1>
        </div>
        {ig && (
          <a href={ig.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 fsc-btn-red px-5 py-3 rounded-md text-sm" data-testid="instagram-cta">
            <Instagram size={18}/> Síguenos en @{ig.handle}
          </a>
        )}
      </div>

      {loading && <p className="text-slate-500">Cargando...</p>}
      {!loading && posts.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">Aún no hay publicaciones</p>
          {ig && <a href={ig.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-blue-700 font-bold uppercase tracking-wide text-xs">Mientras tanto, síguenos en Instagram →</a>}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => (
          <article key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow" data-testid={`post-${p.id}`}>
            {p.image_url ? (
              <div className="aspect-square bg-slate-100">
                <img src={imgSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center font-display text-4xl font-black uppercase tracking-tight p-6 text-center">
                {p.title?.[0] || "FSC"}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-red-600">{p.category || "evento"}</span>
                <span className="text-[10px] text-slate-400">{new Date(p.published_at).toLocaleDateString("es", { dateStyle: "medium" })}</span>
              </div>
              <h3 className="font-display text-xl font-black uppercase tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{p.content}</p>
              {p.instagram_url && (
                <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900">
                  Ver en Instagram <ExternalLink size={12} />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
