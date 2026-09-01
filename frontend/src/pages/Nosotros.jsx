import { useEffect, useState } from "react";
import api from "../lib/api";
import { AGENCY_FB } from "../lib/designSystem";
import FSCHistorySection from "../components/FSCHistorySection";

export default function Nosotros() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/home-settings").then((r) => setS(r.data || {})).catch(() => {}); }, []);
  return (
    <div data-testid="nosotros-page" style={AGENCY_FB}>
      {/* FSC EN LA HISTORIA — única sección de la página (incluye la bienvenida de Kow) */}
      <FSCHistorySection settings={s} />
    </div>
  );
}
