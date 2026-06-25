import { useEffect, useState } from "react";
import api, { imgSrc, FSC_LOGO } from "../lib/api";
import { ShieldCheck, Trophy, Users, Heart, Mail, Phone, Instagram, Facebook, Youtube } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";

export default function Nosotros() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);
  const img = s.about_image_url ? imgSrc(s.about_image_url) : "https://images.pexels.com/photos/10475538/pexels-photo-10475538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";
  const pills = [
    { icon: <Trophy size={20}/>,      title: s.nosotros_pill_1_title || "Reglamento claro", body: s.nosotros_pill_1_body || "Fair play como primer ítem de desempate." },
    { icon: <Users size={20}/>,       title: s.nosotros_pill_2_title || "4 partidos mínimo", body: s.nosotros_pill_2_body || "Cuadrangulares + intergrupos." },
    { icon: <ShieldCheck size={20}/>, title: s.nosotros_pill_3_title || "Datos en vivo",     body: s.nosotros_pill_3_body || "Posiciones y goleadores actualizados." },
    { icon: <Heart size={20}/>,       title: s.nosotros_pill_4_title || "Familia FSC",       body: s.nosotros_pill_4_body || "Hospedaje, transporte, tours." },
  ];
  return (
    <div data-testid="nosotros-page" style={AGENCY_FB}>
      {/* Hero */}
      <section className="relative text-white overflow-hidden" style={{ background: "#000000" }}>
        <div className="absolute inset-0 fsc-stripe opacity-30 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="italic text-2xl" style={{ ...CURSIVE, color: BLUE }}>{s.nosotros_hero_kicker || "conócenos"}</div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] mt-1" style={{ ...PLANE_CRASH, textShadow: "3px 3px 0 rgba(255,255,255,0.05)" }} data-testid="nosotros-hero-title">
            {planeCrashSafe(s.nosotros_hero_title || "NOSOTROS")}
          </h1>
          <div className="h-1 w-24 mt-4" style={{ background: BLUE }}/>
          <p className="text-fsc-gris mt-6 max-w-3xl text-lg leading-relaxed" style={AGENCY_FB} data-testid="nosotros-hero-body">
            {s.nosotros_hero_body || "Future Soccer Cup es una iniciativa del Grupo Empresarial Ancla que une fútbol formativo, formación humana y turismo deportivo en Colombia."}
          </p>
        </div>
      </section>

      {/* Bloque con imagen */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl rotate-2" style={{ background: BLUE }} />
          <img src={img} alt="" className="relative rounded-2xl w-full h-[480px] object-cover" style={{ border: "2px solid #000000" }} />
        </div>
        <div>
          <div className="italic text-2xl" style={{ ...CURSIVE, color: "#04299e" }}>{s.nosotros_mission_kicker || "misión"}</div>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.95]" style={{ ...PLANE_CRASH, color: "#000000" }}>
            {planeCrashSafe(s.about_title || "SOMOS MAS QUE UN TORNEO")}
          </h2>
          <div className="h-1 w-16 mt-3 mb-6" style={{ background: RED }}/>
          <p className="text-slate-700 leading-relaxed" style={AGENCY_FB} data-testid="nosotros-mission-body">
            {s.nosotros_mission_body || "Convocamos clubes de toda la región en torneos certificados con experiencia integral: fixture profesional, transmisión de resultados en vivo, hospedaje, transporte y turismo."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4" data-testid="nosotros-pills">
            {pills.map((p, i) => <Pill key={i} icon={p.icon} title={p.title} body={p.body} testId={`nosotros-pill-${i + 1}`} />)}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <ContactBlock s={s} />
    </div>
  );
}

function Pill({ icon, title, body, testId }) {
  return (
    <div className="bg-white rounded-xl p-4 fsc-card-shadow" style={{ border: "2px solid #000000" }} data-testid={testId}>
      <div style={{ color: BLUE }}>{icon}</div>
      <div className="mt-2 text-lg font-black tracking-wide" style={{ ...AGENCY_FB, color: "#000000" }}>{title}</div>
      <div className="text-xs text-slate-600" style={AGENCY_FB}>{body}</div>
    </div>
  );
}

export function ContactBlock({ s = {} }) {
  return (
    <section className="text-white py-16" style={{ background: "#000000", borderTop: `4px solid ${BLUE}` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="italic text-2xl" style={{ ...CURSIVE, color: BLUE }}>{s.hablemos_kicker || "contáctanos"}</div>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.95]" style={PLANE_CRASH} data-testid="hablemos-title">
            {planeCrashSafe(s.hablemos_title || "HABLEMOS")}
          </h2>
          <div className="h-1 w-16 mt-3 mb-6" style={{ background: BLUE }}/>
          <ul className="space-y-3 text-lg" style={AGENCY_FB}>
            {s.contact_email && (
              <li className="flex items-center gap-3"><Mail size={18} style={{ color: BLUE }}/> <a href={`mailto:${s.contact_email}`} className="hover:opacity-80">{s.contact_email}</a></li>
            )}
            {s.contact_phone && (
              <li className="flex items-center gap-3"><Phone size={18} style={{ color: BLUE }}/> {s.contact_phone}</li>
            )}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            {s.instagram && <a href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md transition-colors flex items-center justify-center" style={{ border: `2px solid ${BLUE}`, color: BLUE }}><Instagram size={18}/></a>}
            {s.facebook && <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md transition-colors flex items-center justify-center" style={{ border: `2px solid ${BLUE}`, color: BLUE }}><Facebook size={18}/></a>}
            {s.youtube && <a href={s.youtube.startsWith("http") ? s.youtube : `https://youtube.com/${s.youtube}`} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-md transition-colors flex items-center justify-center" style={{ border: `2px solid ${BLUE}`, color: BLUE }}><Youtube size={18}/></a>}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="p-10 rounded-2xl" style={{ background: "#000000", border: `2px solid ${BLUE}` }}>
            <img src={FSC_LOGO} alt="" className="h-48 w-48"/>
          </div>
        </div>
      </div>
    </section>
  );
}
