import { imgSrc } from "../lib/api";

// Banner de video/imagen de ancho completo (edge-to-edge), reutilizado en
// /mi-equipo y /cotizar, con el mismo tratamiento que el hero de Eventos.
export default function HeroVideoBanner({ videoUrl, imageUrl, testId = "hero-video-banner", heightClass = "h-[50vh] md:h-[60vh] lg:h-[68vh]" }) {
  if (!videoUrl && !imageUrl) return null;
  return (
    <div className={`relative w-full ${heightClass} overflow-hidden bg-slate-900`} data-testid={testId}>
      {videoUrl ? (
        <video
          src={imgSrc(videoUrl)}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          data-testid={`${testId}-video`}
        />
      ) : (
        <img src={imgSrc(imageUrl)} alt="" className="w-full h-full object-cover" loading="eager" />
      )}
    </div>
  );
}
