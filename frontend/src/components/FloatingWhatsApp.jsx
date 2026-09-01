import { useEffect, useState } from "react";
import api from "../lib/api";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Botón flotante de WhatsApp — visible en todas las páginas públicas del sitio. */
export default function FloatingWhatsApp() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);

  return (
    <a
      href={s.whatsapp_url || `https://wa.me/${(s.contact_phone || "573246134658").replace(/\D/g, "")}`}
      target="_blank"
      rel="noreferrer"
      className="fsc-pulse fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-full p-4 shadow-2xl"
      data-testid="floating-whatsapp"
      aria-label="WhatsApp"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}
