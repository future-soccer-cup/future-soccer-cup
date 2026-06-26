import { useEffect, useState } from "react";
import api, { imgSrc } from "../lib/api";
import { ShieldCheck, Trophy, Users, Heart } from "lucide-react";
import { PLANE_CRASH, AGENCY_FB, CURSIVE, planeCrashSafe, RED, BLUE } from "../lib/designSystem";
import SecondaryHero from "../components/SecondaryHero";
import AnimateIn from "../components/AnimateIn";

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
      <SecondaryHero
        kicker={s.nosotros_hero_kicker || "conócenos"}
        title={s.nosotros_hero_title || "NOSOTROS"}
        body={s.nosotros_hero_body}
        bgUrl={s.nosotros_hero_bg_url}
        overlay={s.nosotros_hero_overlay || "blue"}
        testIdPrefix="nosotros-hero"
      />

      {/* Bloque con imagen */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-2xl rotate-2" style={{ background: BLUE }} />
          <img src={img} alt="" className="relative rounded-2xl w-full h-[480px] object-cover" style={{ border: "2px solid #000000" }} />
        </div>
        <div>
          <div className="italic text-2xl" style={{ ...CURSIVE, color: "#04299e" }}>{s.nosotros_mission_kicker || "misión"}</div>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.95]" style={{ ...PLANE_CRASH, color: RED }} data-testid="nosotros-about-title">
            {planeCrashSafe(s.about_title || "SOMOS MAS QUE UN TORNEO")}
          </h2>
          <div className="h-1 w-16 mt-3 mb-6" style={{ background: RED }}/>
          <p className="text-slate-700 leading-relaxed" style={AGENCY_FB} data-testid="nosotros-mission-body">
            {s.nosotros_mission_body || "Convocamos clubes de toda la región en torneos certificados con experiencia integral: fixture profesional, transmisión de resultados en vivo, hospedaje, transporte y turismo."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4" data-testid="nosotros-pills">
            {pills.map((p, i) => (
              <AnimateIn key={i} variant="slide-up" delay={i * 0.1}>
                <Pill icon={p.icon} title={p.title} body={p.body} testId={`nosotros-pill-${i + 1}`} />
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>
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
