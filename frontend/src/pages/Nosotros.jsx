import { useEffect, useState } from "react";
import api, { imgSrc, FSC_LOGO } from "../lib/api";
import { ShieldCheck, Trophy, Users, Heart, Mail, Phone, Instagram, Facebook, Youtube } from "lucide-react";

export default function Nosotros() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);
  const img = s.about_image_url ? imgSrc(s.about_image_url) : "https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";
  return (
    <div data-testid="nosotros-page">
      {/* Hero */}
      <section className="relative bg-fsc-negro text-white overflow-hidden">
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="font-cursive text-2xl text-fsc-dorado">conócenos</div>
          <h1 className="font-display text-6xl md:text-8xl tracking-wider mt-1">NOSOTROS</h1>
          <div className="h-1 w-24 bg-fsc-dorado mt-4"/>
          <p className="text-fsc-gris mt-6 max-w-3xl text-lg leading-relaxed">
            {s.about_body || "Future Soccer Cup es una iniciativa del Grupo Empresarial Ancla que une fútbol formativo, formación humana y turismo deportivo en Colombia."}
          </p>
        </div>
      </section>

      {/* Bloque con imagen */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute -inset-3 bg-fsc-dorado rounded-2xl rotate-2" />
          <img src={img} alt="" className="relative rounded-2xl w-full h-[480px] object-cover border-2 border-fsc-negro" />
        </div>
        <div>
          <div className="font-cursive text-2xl text-fsc-dorado-oscuro">misión</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-wider text-fsc-negro">{s.about_title || "Somos más que un torneo"}</h2>
          <div className="h-1 w-16 bg-fsc-rojo mt-3 mb-6"/>
          <p className="text-slate-700 leading-relaxed">
            Convocamos clubes de toda la región en torneos certificados con experiencia integral:
            fixture profesional, transmisión de resultados en vivo, hospedaje, transporte y turismo.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Pill icon={<Trophy size={20}/>} title="Reglamento claro" body="Fair play como primer ítem de desempate." />
            <Pill icon={<Users size={20}/>} title="4 partidos mínimo" body="Cuadrangulares + intergrupos." />
            <Pill icon={<ShieldCheck size={20}/>} title="Datos en vivo" body="Posiciones y goleadores actualizados." />
            <Pill icon={<Heart size={20}/>} title="Familia FSC" body="Hospedaje, transporte, tours." />
          </div>
        </div>
      </section>

      {/* Contacto */}
      <ContactBlock s={s} />
    </div>
  );
}

function Pill({ icon, title, body }) {
  return (
    <div className="border-2 border-fsc-negro bg-white rounded-xl p-4 fsc-card-shadow">
      <div className="text-fsc-dorado">{icon}</div>
      <div className="mt-2 font-display text-lg tracking-wider text-fsc-negro">{title}</div>
      <div className="text-xs text-slate-600">{body}</div>
    </div>
  );
}

export function ContactBlock({ s = {} }) {
  return (
    <section className="bg-fsc-negro text-white py-16 border-t-4 border-fsc-dorado">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="font-cursive text-2xl text-fsc-dorado">contáctanos</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-wider">HABLEMOS</h2>
          <div className="h-1 w-16 bg-fsc-dorado mt-3 mb-6"/>
          <ul className="space-y-3">
            {s.contact_email && (
              <li className="flex items-center gap-3"><Mail size={18} className="text-fsc-dorado"/> <a href={`mailto:${s.contact_email}`} className="hover:text-fsc-dorado">{s.contact_email}</a></li>
            )}
            {s.contact_phone && (
              <li className="flex items-center gap-3"><Phone size={18} className="text-fsc-dorado"/> {s.contact_phone}</li>
            )}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            {s.instagram && <a href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md border-2 border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center"><Instagram size={18}/></a>}
            {s.facebook && <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md border-2 border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center"><Facebook size={18}/></a>}
            {s.youtube && <a href={s.youtube.startsWith("http") ? s.youtube : `https://youtube.com/${s.youtube}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md border-2 border-fsc-dorado text-fsc-dorado hover:bg-fsc-dorado hover:text-fsc-negro transition-colors flex items-center justify-center"><Youtube size={18}/></a>}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-fsc-negro border-2 border-fsc-dorado p-10 rounded-2xl">
            <img src={FSC_LOGO} alt="" className="h-48 w-48"/>
          </div>
        </div>
      </div>
    </section>
  );
}
