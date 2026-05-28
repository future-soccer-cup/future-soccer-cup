import { useEffect, useState } from "react";
import api from "../lib/api";
import { ContactBlock } from "./Nosotros";

export default function Contacto() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);
  return (
    <div data-testid="contacto-page">
      <section className="bg-fsc-negro text-white relative overflow-hidden">
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="font-cursive text-2xl text-fsc-dorado">estamos aquí</div>
          <h1 className="font-display text-6xl md:text-8xl tracking-wider mt-1">CONTACTO</h1>
          <div className="h-1 w-24 bg-fsc-dorado mt-4"/>
        </div>
      </section>
      <ContactBlock s={s} />
    </div>
  );
}
