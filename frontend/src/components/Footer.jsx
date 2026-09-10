import { useEffect, useState } from "react";
import api from "../lib/api";
import { Mail, Instagram, Facebook } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, renderPlaneCrash, RED, BLUE } from "../lib/designSystem";

/**
 * Footer global del sitio (no se aplica en /admin).
 * Replica el bloque rojo "Y SI NOS TOMAMOS UN CAFECITO JUNTOS?" del Home,
 * para que todas las páginas terminen con la misma identidad visual.
 * Editable 100% desde /admin/home (footer_heading, contact_phone, contact_email,
 * instagram, facebook, youtube, whatsapp_url).
 */
export default function Footer() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);

  const heading = s.footer_heading || "¿Y SI NOS\nTOMAMOS\nUN\nCAFECITO\nJUNTOS?";
  const phone = s.contact_phone || "+57 324 6134658";
  const email = s.contact_email || "info@futuresoccercup.com";
  const headingLines = heading.split(/\n/).filter(Boolean);

  return (
    <footer className="relative overflow-hidden" data-testid="public-footer" style={{ background: RED }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid lg:grid-cols-2 gap-10 items-center">
        {/* Izquierda: heading grunge en 4 líneas */}
        <h2 className="font-black text-white leading-[0.95] text-left" style={{ ...PLANE_CRASH, fontSize: "clamp(36px, 5vw, 72px)" }} data-testid="footer-heading">
          {headingLines.length ? headingLines.map((l, i) => (
            <span key={i} className="block">{renderPlaneCrash(l)}</span>
          )) : <span className="block">{renderPlaneCrash(heading)}</span>}
        </h2>

        {/* Derecha: contacto + redes */}
        <div className="space-y-5">
          <a href={s.whatsapp_url || `https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 hover:opacity-80" data-testid="footer-whatsapp">
            <span className="bg-white rounded-full p-3 inline-flex shadow-md" style={{ color: BLUE }}>
              <WhatsAppIcon size={28} color={BLUE} />
            </span>
            <span className="font-black tracking-wider text-lg md:text-xl lg:text-2xl text-white whitespace-nowrap" style={AGENCY_FB} data-testid="footer-phone-text">
              {phone}
            </span>
          </a>
          <a href={`mailto:${email}`} className="flex items-center gap-4 hover:opacity-80" data-testid="footer-email">
            <span className="bg-white rounded-full p-3 inline-flex shadow-md" style={{ color: BLUE }}>
              <Mail size={28} strokeWidth={2.4} />
            </span>
            <span className="font-black tracking-wider text-lg md:text-xl lg:text-2xl text-white whitespace-nowrap" style={AGENCY_FB} data-testid="footer-email-text">
              {email}
            </span>
          </a>
          <div className="flex items-center gap-3 pl-1 pt-2">
            {s.instagram && (
              <a href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition" data-testid="footer-instagram" aria-label="Instagram">
                <Instagram size={28} style={{ color: "#E4405F" }} strokeWidth={2} />
              </a>
            )}
            {s.facebook && (
              <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition" data-testid="footer-facebook" aria-label="Facebook">
                <Facebook size={28} style={{ color: BLUE }} strokeWidth={2} fill={BLUE} />
              </a>
            )}
            {s.youtube && (
              <a href={s.youtube.startsWith("http") ? s.youtube : `https://youtube.com/${s.youtube}`} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition" data-testid="footer-youtube" aria-label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.122C19.61 3.5 12 3.5 12 3.5s-7.61 0-9.388.564A2.997 2.997 0 0 0 .502 6.186C0 7.97 0 12 0 12s0 4.03.502 5.814a2.997 2.997 0 0 0 2.11 2.122C4.39 20.5 12 20.5 12 20.5s7.61 0 9.388-.564a2.997 2.997 0 0 0 2.11-2.122C24 16.03 24 12 24 12s0-4.03-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z"/></svg>
              </a>
            )}
            {s.tiktok && (
              <a href={s.tiktok.startsWith("http") ? s.tiktok : `https://tiktok.com/@${s.tiktok.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="bg-white rounded-full p-2 inline-flex shadow-md hover:scale-110 transition" data-testid="footer-tiktok" aria-label="TikTok">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#000000"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>
              </a>
            )}
          </div>
        </div>
      </div>
      {(s.somos_mas_texto || "Somos más que un Torneo") && (
        <div className="w-full text-center pb-8 -mt-2 px-4" data-testid="footer-somos-mas">
          <span className="italic text-white block" style={{ ...CURSIVE, fontStyle: "italic", fontSize: "clamp(32px, 6vw, 72px)", lineHeight: 1.1 }}>
            {s.somos_mas_texto || "Somos más que un Torneo"}
          </span>
        </div>
      )}
      <div className="bg-black/30 text-white/80 text-xs text-center py-3" style={AGENCY_FB}>
        © {new Date().getFullYear()} Future Soccer Cup · Grupo Empresarial Ancla. Todos los derechos reservados.
      </div>
    </footer>
  );
}
