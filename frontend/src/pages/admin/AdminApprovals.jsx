import { useCallback, useEffect, useState } from "react";
import api, { imgSrc } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Check, X, Clock, Shirt, Users, Building2 } from "lucide-react";
import { usePagedSearch, SearchBar, Pagination } from "../../components/PagedTable";

const TABS = [
  { key: "clubs", label: "Clubes", icon: Building2, endpoint: "/clubs" },
  { key: "teams", label: "Equipos", icon: Shirt, endpoint: "/teams" },
  { key: "players", label: "Jugadores", icon: Users, endpoint: "/players" },
];

export default function AdminApprovals() {
  const [tab, setTab] = useState("teams");
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pendiente");

  const load = async () => {
    if (tab === "clubs") {
      const r = await api.get(`/clubs?status=${statusFilter}`);
      setItems(r.data);
    } else if (tab === "teams") {
      const r = await api.get(`/teams?status=${statusFilter}`);
      setItems(r.data);
    } else {
      const [pr, tr] = await Promise.all([
        api.get(`/players?status=${statusFilter}`),
        api.get("/teams"),
      ]);
      setItems(pr.data);
      setTeams(tr.data);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, statusFilter]);

  const tmap = Object.fromEntries(teams.map((t) => [t.id, t]));

  const matchFn = useCallback((it, q) => {
    if (tab === "clubs") {
      return (it.name || "").toLowerCase().includes(q) ||
        (it.city || "").toLowerCase().includes(q) ||
        (it.country || "").toLowerCase().includes(q) ||
        (it.email || "").toLowerCase().includes(q);
    }
    if (tab === "teams") {
      return (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q) ||
        (it.city || "").toLowerCase().includes(q) ||
        (it.coach || "").toLowerCase().includes(q) ||
        String(it.birth_year || "").includes(q);
    }
    // players
    const team = tmap[it.team_id];
    return (it.name || "").toLowerCase().includes(q) ||
      (it.position || "").toLowerCase().includes(q) ||
      (it.document_id || "").toLowerCase().includes(q) ||
      String(it.jersey_number || "").includes(q) ||
      (team?.name || "").toLowerCase().includes(q);
  }, [tab, tmap]);

  const { query, setQuery, page, setPage, totalPages, pageItems, filteredCount, totalCount } =
    usePagedSearch(items, matchFn, 15);

  const setStatus = async (id, status) => {
    const url =
      tab === "clubs" ? `/clubs/${id}/status?status=${status}` :
      tab === "teams" ? `/teams/${id}/status?status=${status}` :
      `/players/${id}/status?status=${status}`;
    try {
      await api.put(url);
      toast.success(status === "aprobado" ? "Aprobado" : "Rechazado");
      load();
    } catch (err) {
      toast.error("Error al cambiar estado");
    }
  };

  return (
    <div data-testid="admin-approvals">
      <Toaster position="top-right" />
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Aprobaciones</h1>
      <p className="text-sm text-slate-500 mt-1">Revisa y aprueba registros enviados por equipos.</p>

      <div className="flex gap-2 border-b border-slate-200 mt-6 mb-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-3 text-sm font-bold uppercase tracking-wide flex items-center gap-2 -mb-px border-b-2 ${tab === t.key ? "border-blue-700 text-blue-700" : "border-transparent text-slate-600"}`} data-testid={`approvals-tab-${t.key}`}>
            <t.icon size={16}/> {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {["pendiente", "aprobado", "rechazado"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-2 ${statusFilter === s ? (s === "aprobado" ? "bg-green-600 text-white border-green-600" : s === "rechazado" ? "bg-red-600 text-white border-red-600" : "bg-yellow-500 text-white border-yellow-500") : "bg-white text-slate-600 border-slate-200"}`} data-testid={`status-filter-${s}`}>
            {s}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={tab === "players" ? "Buscar por nombre, dorsal, documento o equipo..." : "Buscar por nombre, ciudad, categoría..."}
            filteredCount={filteredCount}
            totalCount={totalCount}
            testIdPrefix="approvals"
          />
        </div>
      </div>

      {pageItems.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Clock className="mx-auto text-slate-300" size={48} />
          <p className="mt-3 text-slate-500 font-semibold">{items.length === 0 ? "Sin registros en este estado" : "Sin resultados para la búsqueda"}</p>
        </div>
      )}

      <div className="space-y-3">
        {tab === "clubs" && pageItems.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4 grid md:grid-cols-12 gap-3 items-center" data-testid={`approval-club-${c.id}`}>
            <div className="md:col-span-1">
              <div className="h-12 w-12 rounded flex items-center justify-center text-sm font-display font-black text-white" style={{ background: c.color || "#1d4ed8" }}>
                {c.logo_url ? <img src={imgSrc(c.logo_url)} alt="" className="h-full w-full object-contain p-0.5" /> : c.name[0]}
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="font-display text-lg font-black uppercase tracking-tight">{c.name}</div>
              <div className="text-xs text-slate-500">{c.city || "—"} · {c.country || "—"}</div>
            </div>
            <div className="md:col-span-3 text-xs text-slate-600">
              {c.phone && <div>📞 {c.phone}</div>}
              {c.email && <div className="truncate">✉ {c.email}</div>}
              {c.website && <div className="truncate">🌐 {c.website}</div>}
            </div>
            <div className="md:col-span-2">
              <StatusBadge status={c.status || "pendiente"} />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              {c.status !== "aprobado" && <button onClick={() => setStatus(c.id, "aprobado")} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`approve-club-${c.id}`}><Check size={14}/> Aprobar</button>}
              {c.status !== "rechazado" && <button onClick={() => setStatus(c.id, "rechazado")} className="bg-slate-100 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`reject-club-${c.id}`}><X size={14}/> Rechazar</button>}
            </div>
          </div>
        ))}

        {tab === "teams" && pageItems.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-4 grid md:grid-cols-12 gap-3 items-center" data-testid={`approval-team-${t.id}`}>
            <div className="md:col-span-1">
              <div className="h-12 w-12 rounded flex items-center justify-center text-sm font-display font-black text-white" style={{ background: t.color || "#1d4ed8" }}>
                {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : t.name[0]}
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="font-display text-lg font-black uppercase tracking-tight">{t.name}</div>
              <div className="text-xs text-slate-500">{t.category} {t.birth_year && `· ${t.birth_year}`}</div>
            </div>
            <div className="md:col-span-3 text-sm text-slate-600">
              {t.city && <div>{t.city}</div>}
              {t.coach && <div className="text-xs">DT: {t.coach}</div>}
            </div>
            <div className="md:col-span-2">
              <StatusBadge status={t.status || "pendiente"} />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              {t.status !== "aprobado" && <button onClick={() => setStatus(t.id, "aprobado")} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`approve-team-${t.id}`}><Check size={14}/> Aprobar</button>}
              {t.status !== "rechazado" && <button onClick={() => setStatus(t.id, "rechazado")} className="bg-slate-100 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`reject-team-${t.id}`}><X size={14}/> Rechazar</button>}
            </div>
          </div>
        ))}

        {tab === "players" && pageItems.map((p) => {
          const team = tmap[p.team_id];
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4 grid md:grid-cols-12 gap-3 items-center" data-testid={`approval-player-${p.id}`}>
              <div className="md:col-span-1">
                {p.photo_url ? <img src={p.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{p.name[0]}</div>}
              </div>
              <div className="md:col-span-4">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-black text-blue-700">#{p.jersey_number}</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <div className="text-xs text-slate-500">{p.position} · {team?.name || "—"} ({team?.category || "—"})</div>
              </div>
              <div className="md:col-span-3 text-xs text-slate-600">
                <div>Doc: {p.document_id || "—"}</div>
                <div>Nac: {p.birth_date}</div>
                {p.guardian_name && <div className="mt-1 text-slate-500">Acudiente: {p.guardian_name}</div>}
              </div>
              <div className="md:col-span-2">
                <StatusBadge status={p.status || "pendiente"} />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                {p.status !== "aprobado" && <button onClick={() => setStatus(p.id, "aprobado")} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`approve-player-${p.id}`}><Check size={14}/> Aprobar</button>}
                {p.status !== "rechazado" && <button onClick={() => setStatus(p.id, "rechazado")} className="bg-slate-100 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1" data-testid={`reject-player-${p.id}`}><X size={14}/> Rechazar</button>}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} testIdPrefix="approvals" />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pendiente: "bg-yellow-100 text-yellow-800",
    aprobado: "bg-green-100 text-green-800",
    rechazado: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status] || map.pendiente}`}>{status}</span>;
}
