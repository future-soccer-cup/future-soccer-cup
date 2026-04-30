import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api, { FSC_LOGO } from "../lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download } from "lucide-react";

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const carnetRef = useRef(null);

  useEffect(() => {
    api.get(`/players/${id}`).then((r) => {
      setPlayer(r.data);
      api.get(`/teams/${r.data.team_id}`).then((tr) => setTeam(tr.data));
    });
  }, [id]);

  if (!player) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

  const carnetUrl = `${window.location.origin}/jugadores/${player.id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="player-detail-page">
      <Link to="/jugadores" className="text-xs uppercase tracking-widest font-bold text-blue-700">← Jugadores</Link>

      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        <div>
          <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
            {player.photo_url ? <img src={player.photo_url} alt="" className="h-32 w-32 rounded-2xl object-cover" /> : <div className="h-32 w-32 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-5xl font-display font-black">{player.name[0]}</div>}
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">{player.position}</div>
              <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter">{player.name}</h1>
              <div className="mt-2 text-sm text-slate-600">
                <span className="font-display text-2xl text-red-600 font-black mr-2">#{player.jersey_number}</span>
                {team && <Link to={`/equipos/${team.id}`} className="text-blue-700 font-semibold">{team.name}</Link>}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="border border-slate-200 rounded-lg p-3">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Fecha de nacimiento</dt>
              <dd className="mt-1 font-semibold">{player.birth_date}</dd>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Documento</dt>
              <dd className="mt-1 font-semibold">{player.document_id || "—"}</dd>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Categoría</dt>
              <dd className="mt-1 font-semibold">{team?.category || "—"}</dd>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Posición</dt>
              <dd className="mt-1 font-semibold">{player.position}</dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Carnet oficial</h2>
            <button onClick={() => window.print()} className="fsc-btn-primary px-4 py-2 rounded-md text-xs flex items-center gap-2" data-testid="print-carnet-btn">
              <Printer size={16} /> Imprimir
            </button>
          </div>

          <Carnet ref={carnetRef} player={player} team={team} qrValue={carnetUrl} />
        </div>
      </div>
    </div>
  );
}

export function Carnet({ player, team, qrValue }) {
  return (
    <div className="carnet-print bg-slate-900 text-white rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden relative" style={{ width: 380, maxWidth: "100%" }} data-testid="player-carnet">
      {/* texture */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "repeating-linear-gradient(45deg, rgba(220,38,38,0.15) 0 2px, transparent 2px 12px), repeating-linear-gradient(-45deg, rgba(29,78,216,0.2) 0 2px, transparent 2px 14px)"
      }} />
      <div className="relative px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/10">
        <img src={FSC_LOGO} alt="FSC" className="h-12 w-12 bg-white/5 rounded p-0.5" />
        <div className="text-right flex items-center gap-3">
          <div>
            <div className="font-display text-xs tracking-[0.25em] font-bold text-red-400">FUTURE SOCCER CUP</div>
            <div className="font-display text-[10px] tracking-[0.3em] text-slate-400">CARNET OFICIAL · 2025</div>
          </div>
          {team?.logo_url && (
            <img src={team.logo_url} alt={team.name} crossOrigin="anonymous" className="h-12 w-12 bg-white rounded object-contain p-0.5" />
          )}
        </div>
      </div>

      <div className="relative px-5 py-5 grid grid-cols-3 gap-4">
        <div className="col-span-1">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} crossOrigin="anonymous" className="w-full aspect-[3/4] object-cover rounded-md border-2 border-red-500" />
          ) : (
            <div className="w-full aspect-[3/4] bg-slate-800 rounded-md border-2 border-red-500 flex items-center justify-center font-display text-5xl font-black">{player.name[0]}</div>
          )}
        </div>
        <div className="col-span-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Jugador</div>
            <div className="font-display text-2xl font-black uppercase leading-tight tracking-tight">{player.name}</div>
            <div className="mt-1 text-xs text-slate-300">{player.position}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="uppercase tracking-widest text-slate-500">Dorsal</div>
              <div className="font-display text-3xl font-black text-red-500 leading-none">#{player.jersey_number}</div>
            </div>
            <div>
              <div className="uppercase tracking-widest text-slate-500">Categoría</div>
              <div className="font-bold text-sm">{team?.category || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-5 pb-5 pt-3 border-t border-white/10 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Equipo</div>
          <div className="font-display text-lg font-black uppercase truncate">{team?.name || "—"}</div>
          <div className="text-[10px] text-slate-400 mt-1">DOC: {player.document_id || "—"}</div>
          <div className="text-[10px] text-slate-400">NAC: {player.birth_date}</div>
        </div>
        <div className="bg-white p-1.5 rounded">
          <QRCodeSVG value={qrValue || player.id} size={64} />
        </div>
      </div>
    </div>
  );
}
