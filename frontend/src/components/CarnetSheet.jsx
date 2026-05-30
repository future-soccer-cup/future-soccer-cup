import { useMemo, useRef, useState } from "react";
import { imgSrc } from "../lib/api";
import { Carnet } from "../pages/PlayerDetail";
import { Download, Search, FileText, Loader2, Users, ShieldUser, CheckSquare, Square } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * Componente reutilizable de hoja de carnets con selección por checkbox y descarga individual/lote.
 *
 * Props:
 *   - players: Array de jugadores (cada uno con id, name, team_id, photo_url, jersey_number, position, document_id, birth_date)
 *   - teams: Array de equipos (id, name, category, logo_url, cuerpo_tecnico[])
 *   - lockedTeamId: si está presente, oculta el selector de equipo y filtra a ese team_id (modo DT)
 *   - title: título mostrado arriba (default "Carnets")
 *   - testIdPrefix: prefijo para los data-testid (default "carnet")
 */
export default function CarnetSheet({ players, teams, lockedTeamId = null, title = "Carnets", testIdPrefix = "carnet", readonly = false, showClubFilter = false }) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState(lockedTeamId || "");
  const [club, setClub] = useState("");
  const [tab, setTab] = useState("players"); // "players" | "staff"
  const [selected, setSelected] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [individualBusy, setIndividualBusy] = useState(null);
  const sheetRef = useRef(null);

  const effectiveTeamFilter = lockedTeamId || team;
  const tmap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const clubs = useMemo(() => {
    const seen = new Set();
    return teams
      .map((t) => t.club_name || "")
      .filter((c) => c && !seen.has(c) && seen.add(c))
      .sort();
  }, [teams]);

  // Filtro de teams visibles para selector y staff: respeta club si está seteado.
  const visibleTeams = useMemo(() => teams.filter((t) => !club || t.club_name === club), [teams, club]);

  const filteredPlayers = useMemo(() => players.filter((p) => {
    if (effectiveTeamFilter && p.team_id !== effectiveTeamFilter) return false;
    if (club) {
      const t = tmap[p.team_id];
      if (!t || t.club_name !== club) return false;
    }
    if (q && !p.name?.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [players, effectiveTeamFilter, club, tmap, q]);

  const staffList = useMemo(() => visibleTeams
    .filter((t) => !effectiveTeamFilter || t.id === effectiveTeamFilter)
    .flatMap((t) => (t.cuerpo_tecnico || []).map((s, idx) => ({
      ...s,
      _staff_uid: `${t.id}-${s.document || s.name}-${idx}`,
      team_id: t.id,
      name: s.name,
      document: s.document,
      photo_url: s.photo_url || "",
    })))
    .filter((s) => !q || s.name?.toLowerCase().includes(q.toLowerCase()) || s.role?.toLowerCase().includes(q.toLowerCase())),
  [visibleTeams, effectiveTeamFilter, q]);

  const items = tab === "players" ? filteredPlayers : staffList;
  const getUid = (it) => it._staff_uid || it.id;
  const visibleUids = items.map(getUid);
  const allSelected = visibleUids.length > 0 && visibleUids.every((u) => selected.has(u));
  const someSelected = visibleUids.some((u) => selected.has(u));

  const toggleOne = (uid) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      for (const u of visibleUids) next.delete(u);
    } else {
      for (const u of visibleUids) next.add(u);
    }
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const captureCard = async (cardEl) => {
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
      const pdf = new jsPDF({ unit: "mm", format: [60, 95], orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 4, h = w / ratio;
      if (h > pageH - 4) { h = pageH - 4; w = h * ratio; }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      pdf.save(`carnet-${(label || "fsc").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
      toast.success("Carnet descargado");
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[CarnetSheet] individual PDF failed", e);
      toast.error("Error al generar carnet");
    } finally {
      setIndividualBusy(null);
    }
  };

  const buildBatchPdf = async (cards, filenameLabel) => {
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
    pdf.save(`fsc-carnets-${filenameLabel}.pdf`);
  };

  const downloadAll = async () => {
    if (items.length === 0) { toast.error("No hay carnets para descargar."); return; }
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const cards = sheetRef.current?.querySelectorAll("[data-carnet-card]") || [];
      if (cards.length === 0) { toast.error("No se encontraron carnets en pantalla"); setGenerating(false); return; }
      const teamLabel = effectiveTeamFilter ? (tmap[effectiveTeamFilter]?.name || "equipo").replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "todos";
      await buildBatchPdf(cards, `${tab}-${teamLabel}`);
      toast.success(`PDF generado con ${cards.length} carnets`);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[CarnetSheet] PDF generation failed", e);
      toast.error("Error al generar PDF");
    } finally {
      setGenerating(false);
    }
  };

  const downloadSelected = async () => {
    const sel = visibleUids.filter((u) => selected.has(u));
    if (sel.length === 0) { toast.error("No has seleccionado ningún carnet."); return; }
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const cards = sel
        .map((uid) => sheetRef.current?.querySelector(`[data-carnet-uid="${uid}"] [data-carnet-card]`))
        .filter(Boolean);
      if (cards.length === 0) { toast.error("No se encontraron carnets seleccionados en pantalla"); setGenerating(false); return; }
      await buildBatchPdf(cards, `seleccion-${sel.length}`);
      toast.success(`PDF generado con ${cards.length} carnets seleccionados`);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[CarnetSheet] selection PDF failed", e);
      toast.error("Error al generar PDF de selección");
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = visibleUids.filter((u) => selected.has(u)).length;

  return (
    <div data-testid={testIdPrefix}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tighter">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} carnet{items.length !== 1 ? "s" : ""} · color por categoría · descarga individual, por selección o lote completo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2" data-testid={`${testIdPrefix}-print-btn`}>
            <FileText size={14}/> Vista impresión
          </button>
          {!readonly && (
            <>
              <button
                onClick={downloadSelected}
                disabled={generating || selectedCount === 0}
                className="fsc-btn-primary px-4 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50"
                data-testid={`${testIdPrefix}-download-selected-btn`}
              >
                {generating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                Descargar selección {selectedCount > 0 && `(${selectedCount})`}
              </button>
              <button onClick={downloadAll} disabled={generating || items.length === 0} className="fsc-btn-red px-4 py-2 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid={`${testIdPrefix}-pdf-btn`}>
                {generating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                {generating ? "Generando..." : "Descargar todos"}
              </button>
            </>
          )}
          {readonly && (
            <span className="text-xs text-slate-500 italic px-3 py-2 bg-fsc-gris/40 rounded" data-testid={`${testIdPrefix}-readonly-note`}>Vista de solo lectura — solo el administrador puede descargar los carnets.</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setTab("players"); clearSelection(); }} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === "players" ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`} data-testid={`${testIdPrefix}-tab-players`}>
          <Users size={14}/> Jugadores ({filteredPlayers.length})
        </button>
        <button onClick={() => { setTab("staff"); clearSelection(); }} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 flex items-center gap-2 ${tab === "staff" ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200"}`} data-testid={`${testIdPrefix}-tab-staff`}>
          <ShieldUser size={14}/> Cuerpo técnico ({staffList.length})
        </button>
      </div>

      <div className={`grid ${lockedTeamId ? "sm:grid-cols-2" : showClubFilter ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3 mb-4`}>
        <div className={`${lockedTeamId ? "sm:col-span-2" : "sm:col-span-2"} relative`}>
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "players" ? "Buscar jugador..." : "Buscar nombre o rol..."} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md" data-testid={`${testIdPrefix}-search`} />
        </div>
        {showClubFilter && !lockedTeamId && (
          <select value={club} onChange={(e) => { setClub(e.target.value); setTeam(""); clearSelection(); }} className="px-3 py-2 border border-slate-200 rounded-md" data-testid={`${testIdPrefix}-club-filter`}>
            <option value="">Todos los clubes</option>
            {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {!lockedTeamId && (
          <select value={team} onChange={(e) => { setTeam(e.target.value); clearSelection(); }} className="px-3 py-2 border border-slate-200 rounded-md" data-testid={`${testIdPrefix}-team-filter`}>
            <option value="">Todos los equipos</option>
            {visibleTeams.map((t) => <option key={t.id} value={t.id}>{t.club_name ? `${t.club_name} · ` : ""}{t.name} — {t.category}</option>)}
          </select>
        )}
      </div>

      {!readonly && items.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-4 py-2 mb-4">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800"
            data-testid={`${testIdPrefix}-toggle-all`}
          >
            {allSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
            {allSelected ? "Quitar selección" : someSelected ? `Seleccionar todos (${visibleUids.length})` : `Seleccionar todos (${visibleUids.length})`}
          </button>
          <div className="text-xs text-slate-600">
            <span className="font-bold text-blue-700" data-testid={`${testIdPrefix}-selected-count`}>{selectedCount}</span> de {visibleUids.length} seleccionados
            {selectedCount > 0 && (
              <button onClick={clearSelection} className="ml-3 text-xs text-red-600 font-bold underline" data-testid={`${testIdPrefix}-clear-selection`}>
                limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl" data-testid={`${testIdPrefix}-empty`}>
          <p className="font-display text-2xl uppercase tracking-tight text-slate-500">
            Sin {tab === "players" ? "jugadores aprobados" : "cuerpo técnico cargado"}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            {tab === "players"
              ? (lockedTeamId ? "Tu equipo aún no tiene jugadores aprobados. Carga la plantilla o agrégalos individualmente." : "Aprueba jugadores en /admin/aprobaciones.")
              : (lockedTeamId ? "Aún no has cargado tu cuerpo técnico. Hazlo desde el formulario de tu equipo." : "Los DTs deben subir el cuerpo técnico en /mi-equipo (planilla XLSX/CSV).")}
          </p>
        </div>
      )}

      <div ref={sheetRef} className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 carnet-print">
        {tab === "players" && filteredPlayers.map((p) => {
          const uid = p.id;
          return (
            <div key={uid} data-carnet-uid={uid} className="relative">
              <CarnetItem
                player={p}
                team={tmap[p.team_id]}
                selected={selected.has(uid)}
                onToggle={() => toggleOne(uid)}
                busy={individualBusy === uid}
                onDownload={readonly ? null : () => downloadIndividual(uid, p.name)}
                testIdPrefix={testIdPrefix}
                readonly={readonly}
              />
            </div>
          );
        })}
        {tab === "staff" && staffList.map((s) => {
          const uid = s._staff_uid;
          return (
            <div key={uid} data-carnet-uid={uid} className="relative">
              <CarnetItem
                player={s}
                team={tmap[s.team_id]}
                staffRole={s.role}
                selected={selected.has(uid)}
                onToggle={() => toggleOne(uid)}
                busy={individualBusy === uid}
                onDownload={readonly ? null : () => downloadIndividual(uid, `${s.name}-${s.role}`)}
                testIdPrefix={testIdPrefix}
                readonly={readonly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CarnetItem({ player, team, staffRole, selected, onToggle, busy, onDownload, testIdPrefix, readonly = false }) {
  const qrValue = staffRole
    ? `${window.location.origin}/staff/${team?.id}/${player.document || player.name}`
    : `${window.location.origin}/jugadores/${player.id}`;
  const playerImg = player.photo_url ? imgSrc(player.photo_url) : null;
  const teamLogo = team?.logo_url ? imgSrc(team.logo_url) : null;
  const merged = { ...player, photo_url: playerImg };
  const tmerged = team ? { ...team, logo_url: teamLogo } : team;
  const uid = player._staff_uid || player.id;
  return (
    <div className={`relative group rounded-lg ring-2 transition-all ${selected ? "ring-blue-700 shadow-lg" : "ring-transparent"}`}>
      {/* Checkbox selector — solo si NO readonly */}
      {!readonly && (
        <button
          type="button"
          onClick={onToggle}
          className={`absolute top-2 left-2 z-10 h-7 w-7 rounded-md flex items-center justify-center transition-colors ${selected ? "bg-blue-700 text-white" : "bg-white/90 text-slate-700 border border-slate-300 hover:bg-white"}`}
          data-testid={`${testIdPrefix}-select-${uid}`}
          aria-label={selected ? "Deseleccionar" : "Seleccionar"}
        >
          {selected ? <CheckSquare size={16}/> : <Square size={16}/>}
        </button>
      )}
      <div data-carnet-card>
        <Carnet player={merged} team={tmerged} qrValue={qrValue} staffRole={staffRole} />
      </div>
      {!readonly && onDownload && (
        <button
          onClick={onDownload}
          disabled={busy}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-900 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 disabled:opacity-100"
          data-testid={`${testIdPrefix}-individual-${uid}`}
          title="Descargar este carnet individualmente"
        >
          {busy ? <Loader2 size={10} className="animate-spin"/> : <Download size={10}/>} PDF
        </button>
      )}
    </div>
  );
}
