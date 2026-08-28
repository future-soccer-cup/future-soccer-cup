import { Link } from "react-router-dom";
import { PLANE_CRASH, AGENCY_FB, RED, BLUE, renderPlaneCrash } from "../lib/designSystem";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20" data-testid="not-found-page">
      <div style={{ ...PLANE_CRASH, color: RED, fontSize: "clamp(4rem, 14vw, 8rem)" }} className="leading-none">
        {renderPlaneCrash("404")}
      </div>
      <div style={{ ...PLANE_CRASH, color: BLUE, fontSize: "clamp(1.4rem, 4vw, 2.2rem)" }} className="mt-2">
        {renderPlaneCrash("pagina no encontrada")}
      </div>
      <p className="mt-4 text-slate-500 max-w-md" style={AGENCY_FB}>
        La página que buscas no existe o cambió de dirección.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 rounded-md text-white font-bold uppercase tracking-wide"
        style={{ background: RED }}
        data-testid="not-found-home-link"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
