import { useEffect, useState } from "react";
import api, { FSC_LOGO, imgSrc } from "../lib/api";

export default function Logo({ className = "h-10 w-10", showText = false }) {
  const [src, setSrc] = useState(FSC_LOGO);

  useEffect(() => {
    // Usa el escudo configurado por el admin en Home > Navbar (nav_shield_url); si no
    // hay ninguno configurado, se mantiene el logo histórico como respaldo.
    api.get("/home-settings").then((r) => {
      const url = r.data?.nav_shield_url || r.data?.nav_logo_url;
      if (url) setSrc(imgSrc(url));
    }).catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3">
      <img src={src} alt="Future Soccer Cup" className={`${className} object-contain`} />
      {showText && (
        <div className="font-display text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
          Future Soccer<br />
          <span className="text-red-600">Cup</span>
        </div>
      )}
    </div>
  );
}
