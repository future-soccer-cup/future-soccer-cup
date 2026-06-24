import { useMemo } from "react";
import { validatePlayerBirthVsTeam, teamAllowedYear } from "../lib/playerValidation";

/**
 * Input de fecha de nacimiento con validación en tiempo real contra la categoría del equipo.
 * - Muestra el año mínimo permitido como hint y, si la fecha es inválida, un mensaje rojo bajo el input.
 * - Restringe el atributo `max` del input al 31 de diciembre del año permitido si se conoce la regla del equipo,
 *   para que el selector nativo de fecha ni siquiera permita elegir un año anterior.
 */
export default function BirthDateField({ value, onChange, team, testId = "birthdate" }) {
  const allowedYear = useMemo(() => teamAllowedYear(team), [team]);
  const errorMsg = useMemo(() => validatePlayerBirthVsTeam(value, team), [value, team]);
  const minISO = allowedYear ? `${allowedYear}-01-01` : undefined;

  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
        Fecha nacimiento *
        {allowedYear && (
          <span className="text-[10px] font-normal normal-case text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5" data-testid={`${testId}-hint`}>
            Año mínimo: {allowedYear}
          </span>
        )}
      </span>
      <input
        type="date"
        value={value || ""}
        min={minISO}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full px-3 py-2 border rounded-md ${errorMsg ? "border-rose-400 bg-rose-50" : "border-slate-200"}`}
        data-testid={testId}
        aria-invalid={errorMsg ? "true" : "false"}
      />
      {errorMsg && (
        <span className="block mt-1 text-xs text-rose-700 font-bold" data-testid={`${testId}-error`}>
          {errorMsg}
        </span>
      )}
    </label>
  );
}
