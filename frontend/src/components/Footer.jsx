import { useEffect, useState } from "react";
import Logo from "./Logo";
import api from "../lib/api";
import { Mail, Phone, Instagram, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  const [s, setS] = useState({
    contact_email: "info@futuresoccercup.com",
    contact_phone: "+57 (000) 000-0000",
    instagram: "@FutureSoccerCup",
    facebook: "",
    youtube: "",
  });

  useEffect(() => {
    api.get("/home-settings").then((r) => setS({ ...s, ...r.data })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <footer className="bg-fsc-negro text-fsc-gris mt-16 relative overflow-hidden">
      <div className="absolute inset-0 fsc-stripe pointer-events-none" />
      {/* Línea dorada superior */}
      <div className="h-1 bg-fsc-dorado" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="bg-fsc-negro border-2 border-fsc-dorado rounded-md p-2.5 inline-block">
              <Logo className="h-14 w-14" />
            </div>
            <div>
              <div className="font-display text-3xl tracking-wider text-white">FUTURE SOCCER CUP</div>
              <div className="font-cursive text-2xl text-fsc-dorado leading-none mt-0.5">Somos más que un torneo</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-fsc-gris/80 max-w-md mt-5">
            La copa oficial del fútbol infantil y juvenil de Colombia. Donde nace el futuro del deporte.
            Una iniciativa del Grupo Empresarial Ancla.
          </p>
        </div>

        <div>
          <h4 className="font-display tracking-widest text-white mb-4 text-base">Plataforma</h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="/" className="hover:text-fsc-dorado transition-colors">Inicio</a></li>
            <li><a href="/nosotros" className="hover:text-fsc-dorado transition-colors">Nosotros</a></li>
            <li><a href="/fixture" className="hover:text-fsc-dorado transition-colors">Fixture</a></li>
            <li><a href="/datos-estadisticas" className="hover:text-fsc-dorado transition-colors">Datos y Estadísticas</a></li>
            <li><a href="/cotizar" className="hover:text-fsc-dorado transition-colors">Cotizar</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display tracking-widest text-white mb-4 text-base">Contacto</h4>
          <ul className="space-y-2.5 text-sm">
            {s.contact_email && (
              <li className="flex items-center gap-2"><Mail size={15} className="text-fsc-dorado shrink-0"/> {s.contact_email}</li>
            )}
            {s.contact_phone && (
              <li className="flex items-center gap-2"><Phone size={15} className="text-fsc-dorado shrink-0"/> {s.contact_phone}</li>
            )}
          </ul>
          <div className="mt-5 flex items-center gap-3">
            {s.instagram && (
              <a href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-md bg-fsc-negro border border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center" data-testid="footer-ig">
                <Instagram size={16}/>
              </a>
            )}
            {s.facebook && (
              <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-md bg-fsc-negro border border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center" data-testid="footer-fb">
                <Facebook size={16}/>
              </a>
            )}
            {s.youtube && (
              <a href={s.youtube.startsWith("http") ? s.youtube : `https://youtube.com/${s.youtube}`} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-md bg-fsc-negro border border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center" data-testid="footer-yt">
                <Youtube size={16}/>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="relative border-t border-fsc-dorado/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-fsc-gris/70 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>© {new Date().getFullYear()} Future Soccer Cup · Grupo Empresarial Ancla. Todos los derechos reservados.</span>
          <span className="font-display tracking-[0.3em] text-fsc-dorado">FSC · {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
