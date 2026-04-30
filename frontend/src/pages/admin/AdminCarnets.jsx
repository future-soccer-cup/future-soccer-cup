import { useEffect, useRef, useState } from "react";
import api, { imgSrc } from "../../lib/api";
import { Carnet } from "../PlayerDetail";
import { Download, Search, FileText, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";

export default function AdminCarnets() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [generating, setGenerating] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/players?status=aprobado"), api.get("/teams?status=aprobado")])
      .then(([p, t]) => {
        setPlayers(p.data);
        setTeams(t.data);
      })
      .catch(() => {
        // fallback: load all
        Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => {
          setPlayers(p.data);
          setTeams(t.data);
        });
      });
  }, []);

  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const filtered = players.filter((p) => {
    if (team && p.team_id !== team) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const downloadPDF = async () => {
    if (filtered.length === 0) {
      toast.error("No hay carnets para descargar. Agrega o aprueba jugadores primero.");
      return;
    }
    setGenerating(true);
    try {
      // Wait a tick for any pending image loads
      await new Promise((r) => setTimeout(r, 300));
      const cards = sheetRef.current?.querySelectorAll("[data-carnet-card]") || [];
      if (cards.length === 0) {
        toast.error("No se encontraron carnets en pantalla");
        setGenerating(false);
        return;
      }

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const cols = 2;
      const rows = 4; // 8 carnets per page (CR-80 portrait, 85.6×54)
      const cardW = (pageW - margin * 2 - 4 * (cols - 1)) / cols;
      const cardH = (pageH - margin * 2 - 4 * (rows - 1)) / rows;

      let pos = 0;
      for (let i = 0; i < cards.length; i++) {
        const canvas = await html2canvas(cards[i], { scale: 2, backgroundColor: null, useCORS: true, logging: false });
        const img = canvas.toDataURL("image/png");

        const slotIdx = pos % (cols * rows);
        if (slotIdx === 0 && pos > 0) pdf.addPage();
        const c = slotIdx % cols;
        const r = Math.floor(slotIdx / cols);
        const x = margin + c * (cardW + 4);
        const y = margin + r * (cardH + 4);

        // Preserve aspect ratio of the card (canvas)
        const ratio = canvas.width / canvas.height;
        let w = cardW, h = cardW / ratio;
        if (h > cardH) { h = cardH; w = cardH * ratio; }
        const ox = x + (cardW - w) / 2;
        const oy = y + (cardH - h) / 2;

        pdf.addImage(img, "PNG", ox, oy, w, h);
        pos++;
      }

      const teamLabel = team ? tmap[team]?.name?.replace(/[^a-z0-9]+/gi, "-") : "todos";
      pdf.save(`fsc-carnets-${teamLabel}.pdf`);
      toast.success(`PDF generado con ${cards.length} carnets`);
    } catch (e) {
      console.error(e);
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
          <p className="text-sm text-slate-500 mt-1">{filtered.length} carnet{filtered.length !== 1 ? "s" : ""} listos. Genera el PDF imprimible para entregar al club.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2" data-testid="carnet-print-btn">
            <FileText size={14}/> Vista impresión
          </button>
          <button onClick={downloadPDF} disabled={generating || filtered.length === 0} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid="carnet-pdf-btn">
            {generating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
            {generating ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugador..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-search" />
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-md" data-testid="carnet-team-filter">
          <option value="">Todos los equipos ({players.length} jugadores)</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl" data-testid="no-carnets">
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">Sin jugadores aprobados</p>
          <p className="text-sm text-slate-400 mt-2">Aprueba jugadores en /admin/aprobaciones para generar sus carnets.</p>
        </div>
      )}

      <div ref={sheetRef} className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 carnet-print">
        {filtered.map((p) => (
          <div key={p.id} data-carnet-card>
            <CarnetWrapped player={p} team={tmap[p.team_id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CarnetWrapped({ player, team }) {
  const qrValue = `${window.location.origin}/jugadores/${player.id}`;
  // Resolve photo/logo to absolute URLs (html2canvas + CORS-friendly)
  const playerImg = player.photo_url ? imgSrc(player.photo_url) : null;
  const teamLogo = team?.logo_url ? imgSrc(team.logo_url) : null;
  const merged = {
    ...player,
    photo_url: playerImg,
  };
  const tmerged = team ? { ...team, logo_url: teamLogo } : team;
  return <Carnet player={merged} team={tmerged} qrValue={qrValue} />;
}
