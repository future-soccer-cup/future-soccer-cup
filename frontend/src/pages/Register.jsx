import { Navigate } from "react-router-dom";

/**
 * El registro de cuentas familiares fue removido.
 * Solo los Directores Técnicos pueden registrarse, y son ellos quienes
 * cotizan y pagan las inscripciones del equipo.
 */
export default function Register() {
  return <Navigate to="/registro-equipo" replace />;
}

export function ConsentBlock({ checked, onChange, testId }) {
  return (
    <label className={`block cursor-pointer border-2 rounded-xl p-4 transition-colors ${checked ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`} data-testid={testId}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 accent-blue-700"
          data-testid={`${testId}-checkbox`}
        />
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="font-bold text-slate-900 mb-1 uppercase tracking-wider text-[11px]">Tratamiento de datos y uso de imagen</div>
          Autorizo a Future Soccer Cup el tratamiento de mis datos personales bajo la Ley 1581/2012 y el uso de fotografías y videos tomados durante los eventos y partidos para fines de promoción, redes sociales y publicidad del torneo.
        </div>
      </div>
    </label>
  );
}
