/**
 * Página Noticias — "Mentalidad Fútbolera" (Iter62).
 * 2 secciones editables via CMS (home_settings.noticias):
 *  1. Hero azul con "MENTALIDAD" grunge + "Fútbolera" cursivo + watermark ghost.
 *  2. Grid 2 columnas de categorías (tarjeta roja con overlay + sombra azul apilada).
 * Al hacer clic en una categoría → modal con listado de sus noticias publicadas.
 * Al hacer clic en una noticia dentro del modal → expande con galería + texto completo.
 */
import { useEffect, useState } from "react";
import { X, ChevronLeft, Play } from "lucide-react";
import api, { imgSrc } from "../lib/api";
import { PLANE_CRASH, AGENCY_FB, renderPlaneCrash } from "../lib/designSystem";

const RED = "#e31f27";
const BLUE = "#0640c8";

export default function Noticias() {
  const [cfg, setCfg] = useState({});
  const [openCat, setOpenCat] = useState(null); // categoría abierta

  useEffect(() => {
    api.get("/home-settings").then((r) => setCfg(r.data?.noticias || {})).catch(() => {});
  }, []);

  const cats = cfg.categories || [];

  return (
    <div data-testid="noticias-page" className="bg-white" style={AGENCY_FB}>
      <HeroSection
        heroUrl={cfg.hero_url}
        watermark={cfg.hero_watermark || "MENTALIDAD"}
        title={cfg.hero_title || "MENTALIDAD"}
        subtitle={cfg.hero_subtitle || "Fútbolera"}
      />
      <CategoriesGrid cats={cats} onOpen={setOpenCat} />
      {openCat && <CategoryModal category={openCat} onClose={() => setOpenCat(null)} />}
    </div>
  );
}


function HeroSection({ heroUrl, watermark, title, subtitle }) {
  const titleStyle = {
    ...PLANE_CRASH,
    fontSize: "clamp(3.4rem, 10vw, 9rem)",
    letterSpacing: "0.01em",
  };
  return (
    <section
      className="relative w-full aspect-[16/5] overflow-hidden bg-slate-800"
      data-testid="noticias-hero"
    >
      {heroUrl && (
        <img src={imgSrc(heroUrl)} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      )}
      {/* Overlay azul denso y oscuro (oscurece la foto de fondo) */}
      <div className="absolute inset-0" style={{ background: "rgba(6, 20, 80, 0.82)" }} />
      {/* Título principal + ecos apilados detrás (mismo tamaño, más arriba y desvanecidos) */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
        <div className="relative leading-[0.9]">
          {/* Eco 2: más lejano, más desvanecido, más arriba */}
          <div
            className="absolute inset-x-0 -top-7 md:-top-12 leading-[0.9] pointer-events-none select-none"
            style={{ ...titleStyle, color: "rgba(255,255,255,0.14)" }}
            aria-hidden="true"
            data-testid="noticias-hero-watermark-2"
          >
            {renderPlaneCrash(title)}
          </div>
          {/* Eco 1: intermedio */}
          <div
            className="absolute inset-x-0 -top-3.5 md:-top-6 leading-[0.9] pointer-events-none select-none"
            style={{ ...titleStyle, color: "rgba(255,255,255,0.32)" }}
            aria-hidden="true"
            data-testid="noticias-hero-watermark-1"
          >
            {renderPlaneCrash(title)}
          </div>
          {/* Principal */}
          <div
            className="relative leading-[0.9]"
            style={{ ...titleStyle, color: "#ffffff", textShadow: "3px 5px 0 rgba(0,0,0,0.28)" }}
            data-testid="noticias-hero-title"
          >
            {renderPlaneCrash(title)}
          </div>
        </div>
        <div
          className="mt-1 md:mt-3"
          style={{
            ...AGENCY_FB,
            fontWeight: 800,
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            fontSize: "clamp(2.8rem, 7.5vw, 6.6rem)",
            textShadow: "2px 3px 0 rgba(0,0,0,0.4)",
            lineHeight: 1,
          }}
          data-testid="noticias-hero-subtitle"
        >
          {subtitle}
        </div>
      </div>
    </section>
  );
}


function CategoriesGrid({ cats, onOpen }) {
  if (!cats.length) {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400 italic" style={AGENCY_FB}>
        Aún no hay categorías de noticias configuradas.
      </section>
    );
  }
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="noticias-grid">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        {cats.map((c) => (
          <CategoryCard key={c.id} cat={c} onClick={() => onOpen(c)} />
        ))}
      </div>
    </section>
  );
}


function CategoryCard({ cat, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group text-left"
      data-testid={`noticias-cat-${cat.id}`}
    >
      {/* Sombra azul apilada detrás */}
      <div
        className="absolute rounded-sm"
        style={{
          background: BLUE,
          left: "10px",
          top: "10px",
          right: "-10px",
          bottom: "-10px",
          zIndex: 0,
        }}
      />
      {/* Tarjeta principal */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-sm shadow-lg bg-slate-900" style={{ zIndex: 1 }}>
        {cat.image_url ? (
          <img src={imgSrc(cat.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        ) : (
          <div className="absolute inset-0 bg-slate-700" />
        )}
        <div className="absolute inset-0" style={{ background: `${RED}CC` }} />
        <div className="absolute inset-0 flex items-end justify-center pb-6 md:pb-10 px-4 text-center">
          <div
            className="leading-tight text-white transition-transform group-hover:scale-105"
            style={{ ...PLANE_CRASH, fontSize: "clamp(1.4rem, 3vw, 2.4rem)", textShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}
          >
            {renderPlaneCrash(cat.title || "")}
          </div>
        </div>
      </div>
    </button>
  );
}


function CategoryModal({ category, onClose }) {
  const [openNews, setOpenNews] = useState(null); // noticia expandida
  const news = (category.news || []).filter((n) => n.published !== false);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && (openNews ? setOpenNews(null) : onClose());
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [openNews, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
      data-testid="noticias-modal"
    >
      <div
        className={`bg-white rounded-lg shadow-2xl w-full ${news.length === 1 && !openNews ? "max-w-5xl" : "max-w-4xl"} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 gap-3" style={{ background: BLUE }}>
          <div className="flex items-center gap-3 min-w-0">
            {openNews && (
              <button type="button" onClick={() => setOpenNews(null)} className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10 transition flex-shrink-0" aria-label="Volver" data-testid="noticias-modal-back">
                <ChevronLeft size={20} />
              </button>
            )}
            <span
              className="text-white leading-none truncate"
              style={{ ...PLANE_CRASH, fontSize: "clamp(1.2rem, 2vw, 1.9rem)" }}
              data-testid="noticias-modal-title"
            >
              {renderPlaneCrash((openNews ? openNews.title : category.title) || "")}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10 transition flex-shrink-0" aria-label="Cerrar" data-testid="noticias-modal-close">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={AGENCY_FB}>
          {openNews ? (
            <NewsDetail news={openNews} />
          ) : news.length ? (
            <div className={news.length === 1 ? "grid grid-cols-1 p-4 md:p-6" : "grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6"}>
              {news.map((n, i) => (
                <button
                  key={n.id || i}
                  type="button"
                  onClick={() => setOpenNews(n)}
                  className="text-left border border-slate-200 rounded-md overflow-hidden hover:shadow-lg transition"
                  data-testid={`noticia-item-${i}`}
                >
                  <div className="aspect-[16/9] bg-slate-900 relative">
                    {n.images?.[0] ? (
                      <img src={imgSrc(n.images[0])} alt="" className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sin imagen</div>
                    )}
                    {n.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30" data-testid={`noticia-item-video-badge-${i}`}>
                        <span className={news.length === 1 ? "bg-white/90 rounded-full p-5 shadow-lg" : "bg-white/90 rounded-full p-3 shadow-lg"}>
                          <Play size={news.length === 1 ? 34 : 22} className="text-slate-900" fill="currentColor" />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className={news.length === 1 ? "font-black text-slate-800 text-xl md:text-2xl" : "font-black text-slate-800 line-clamp-2"} style={{ color: BLUE }}>{n.title}</h3>
                    {n.body && (
                      <p className="text-sm text-slate-600 mt-1.5 line-clamp-3">{n.body}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6 text-slate-400 italic">
              Aún no hay noticias publicadas en esta categoría.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function NewsDetail({ news }) {
  const images = news.images || [];
  return (
    <article className="p-4 md:p-6" data-testid="noticia-detail">
      {news.video_url && (
        <div className="mb-5 aspect-video bg-black rounded-md overflow-hidden" data-testid="noticia-video">
          <video src={imgSrc(news.video_url)} controls playsInline className="w-full h-full object-contain" />
        </div>
      )}
      {images.length > 0 && (
        <div className="mb-5">
          <div className="aspect-[16/9] bg-slate-900 rounded-md overflow-hidden mb-2">
            <img src={imgSrc(images[0])} alt="" className="w-full h-full object-cover object-center" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1).map((im, i) => (
                <div key={i} className="aspect-square bg-slate-900 rounded overflow-hidden">
                  <img src={imgSrc(im)} alt="" className="w-full h-full object-cover object-center" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <h2 className="font-black leading-tight mb-3" style={{ color: BLUE, fontSize: "clamp(1.4rem, 2.4vw, 2rem)" }}>
        {news.title}
      </h2>
      {news.body && (
        <div className="text-slate-800 leading-relaxed whitespace-pre-line" data-testid="noticia-body">
          {news.body}
        </div>
      )}
    </article>
  );
}
