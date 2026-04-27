import { FSC_LOGO } from "../lib/api";

export default function Logo({ className = "h-10 w-10", showText = false }) {
  return (
    <div className="flex items-center gap-3">
      <img src={FSC_LOGO} alt="Future Soccer Cup" className={className} />
      {showText && (
        <div className="font-display text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
          Future Soccer<br />
          <span className="text-red-600">Cup</span>
        </div>
      )}
    </div>
  );
}
