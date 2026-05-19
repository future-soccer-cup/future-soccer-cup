import { useEffect, useRef, useState } from "react";
import api, { imgSrc } from "../../lib/api";
import { Carnet } from "../PlayerDetail";
import { Download, Search, FileText, Loader2, Users, ShieldUser } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";

export default function AdminCarnets() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [tab, setTab] = useState("players"); // "players" | "staff"
  const [generating, setGenerating] = useState(false);
  const [individualBusy, setIndividualBusy] = useState(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/players?status=aprobado"), api.get("/teams?status=aprobado")])
      .then(([p, t]) => { setPlayers(p.data); setTeams(t.data); })
      .catch(() => {
        Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => { setPlayers(p.data); setTeams(t.data); });
      });
  }, []);

  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));

  // Build staff list across all teams (or filtered team) with team context
  const staffList = teams
    .filter((t) => !team || t.id === team)
    .flatMap((t) => (t.cuerpo_tecnico || []).map((s, idx) => ({
      ...s,
      _staff_uid: `${t.id}-${s.document || s.name}-${idx}`,
      team_id: t.id,
      name: s.name,
      document: s.document,
      photo_url: s.photo_url || "",
    })))
    .filter((s) => !q || s.name?.toLowerCase().includes(q.toLowerCase()) || s.role?.toLowerCase().includes(q.toLowerCase()));

  const filteredPlayers = players.filter((p) => {
    if (team && p.team_id !== team) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const items = tab === "players" ? filteredPlayers : staffList;

  const captureCard = async (cardEl) => {
    // Wait for image loads
    const imgs = cardEl.querySelectorAll("img");
    await Promise.all(Array.from(imgs).map((im) => im.complete ? Promise.resolve() : new Promise((res) => { im.onload = im.onerror = res; })));
    return html2canvas(cardEl, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
  };

  const downloadIndividual = async (uid, label) => {
    setIndividualBusy(uid);
    try {
      const card = sheetRef.current?.querySelector(`[data-carnet-uid="${uid}"] [data-carnet-card]`);
      if (!card) { toast.error("Carnet no encontrado"); return; }
      const canvas = await captureCard(card);
      const pdf = new jsPDF({ unit: "mm", format: [60, 95], orientation: "portrait" }); // ~CR-80 oversized
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 4, h = w / ratio;
      if (h > pageH - 4) { h = pageH - 4; w = h * ratio; }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      pdf.save(`carnet-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
      toast.success("Carnet individual descargado");
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[AdminCarnets] individual PDF failed", e);
      toast.error("Error al generar carnet individual");
    } finally {
      setIndividualBusy(null);
    }
  };

  const downloadAll = async () => {
    if (items.length === 0) { toast.error("No hay carnets para descargar."); return; }
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const cards = sheetRef.current?.querySelectorAll("[data-carnet-card]") || [];
      if (cards.length === 0) { toast.error("No se encontraron carnets en pantalla"); setGenerating(false); return; }
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const cols = 2;
      const rows = 4;
      const cardW = (pageW - margin * 2 - 4 * (cols - 1)) / cols;
      const cardH = (pageH - margin * 2 - 4 * (rows - 1)) / rows;
      let pos = 0;
      for (let i = 0; i < cards.length; i++) {
        const canvas = await captureCard(cards[i]);
        const img = canvas.toDataURL("image/png");
        const slotIdx = pos % (cols * rows);
        if (slotIdx === 0 && pos > 0) pdf.addPage();
        const c = slotIdx % cols;
        const r = Math.floor(slotIdx / cols);
        const x = margin + c * (cardW + 4);
        const y = margin + r * (cardH + 4);
        const ratio = canvas.width / canvas.height;
        let w = cardW, h = cardW / ratio;
        if (h > cardH) { h = cardH; w = cardH * ratio; }
        pdf.addImage(img, "PNG", x + (cardW - w) / 2, y + (cardH - h) / 2, w, h);
        pos++;
      }
      const teamLabel = team ? tmap[team]?.name?.replace(/[^a-z0-9]+/gi, "-") : "todos";
      pdf.save(`fsc-carnets-${tab}-${teamLabel}.pdf`);
      toast.success(`PDF generado con ${cards.length} carnets`);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[AdminCarnets] PDF generation failed", e);
      toast.error("Error al generar PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div data-testid="admin-carnets">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Carnets</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} carnet{items.length !== 1 ? "s" : ""} · color de fondo por categoría · imprime individual o descarga el lote en PDF.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2" data-testid="carnet-print-btn">
            <FileText size={14}/> Vista impresión
          </button>
          <button onClick={downloadAll} disabled={generating || items.length === 0} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid="carnet-pdf-btn">
            {generating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
            {generating ? "Generando..." : "Descargar lote PDF"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("players")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === "players" ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`} data-testid="carnet-tab-players">
          <Users size={14}/> Jugadores ({filteredPlayers.length})
        </button>
        <button onClick={() => setTab("staff")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === "staff" ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`} data-testid="carnet-tab-staff">
          <ShieldUser size={14}/> Cuerpo técnico ({staffList.length})
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "players" ? "Buscar jugador..." : "Buscar nombre o rol..."} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-search" />
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-team-filter">
          <option value="">Todos los equipos</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
        </select>
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl" data-testid="no-carnets">
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">Sin {tab === "players" ? "jugadores aprobados" : "cuerpo técnico cargado"}</p>
          <p className="text-sm text-slate-400 mt-2">{tab === "players" ? "Aprueba jugadores en /admin/aprobaciones." : "Los DTs deben subir el cuerpo técnico en /mi-equipo (planilla XLSX/CSV)."}</p>
        </div>
      )}

      <div ref={sheetRef} className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 carnet-print">
        {tab === "players" && filteredPlayers.map((p) => (
          <div key={p.id} data-carnet-uid={p.id}>
            <CarnetCard
              player={p}
              team={tmap[p.team_id]}
              busy={individualBusy === p.id}
              onDownload={() => downloadIndividual(p.id, p.name)}
            />
          </div>
        ))}
        {tab === "staff" && staffList.map((s) => (
          <div key={s._staff_uid} data-carnet-uid={s._staff_uid}>
            <CarnetCard
              player={s}
              team={tmap[s.team_id]}
              staffRole={s.role}
              busy={individualBusy === s._staff_uid}
              onDownload={() => downloadIndividual(s._staff_uid, `${s.name}-${s.role}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CarnetCard({ player, team, staffRole, busy, onDownload }) {
  const qrValue = staffRole
    ? `${window.location.origin}/staff/${team?.id}/${player.document || player.name}`
    : `${window.location.origin}/jugadores/${player.id}`;
  const playerImg = player.photo_url ? imgSrc(player.photo_url) : null;
  const teamLogo = team?.logo_url ? imgSrc(team.logo_url) : null;
  const merged = { ...player, photo_url: playerImg };
  const tmerged = team ? { ...team, logo_url: teamLogo } : team;
  return (
    <div className="relative group">
      <div data-carnet-card>
        <Carnet player={merged} team={tmerged} qrValue={qrValue} staffRole={staffRole} />
      </div>
      <button
        onClick={onDownload}
        disabled={busy}
        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-900 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 disabled:opacity-100"
        data-testid={`carnet-individual-${player.id || player._staff_uid}`}
        title="Descargar este carnet individualmente"
      >
        {busy ? <Loader2 size={10} className="animate-spin"/> : <Download size={10}/>} PDF
      </button>
    </div>
  );
}
