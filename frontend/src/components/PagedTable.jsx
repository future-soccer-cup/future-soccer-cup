import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

/**
 * Hook: client-side search + pagination over an array of items.
 *
 * @param {Array}  items     full list (already loaded)
 * @param {Function} matchFn (item, queryLower) => boolean — return true to keep item
 * @param {number}  pageSize default 15
 *
 * Returns { query, setQuery, page, setPage, totalPages, pageItems, filteredCount, totalCount }
 */
export function usePagedSearch(items, matchFn, pageSize = 15) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      try { return matchFn(it, q); } catch { return false; }
    });
  }, [items, query, matchFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Clamp page when filters shrink the dataset.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  // Reset to first page when query changes.
  useEffect(() => { setPage(1); }, [query]);

  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    query, setQuery,
    page, setPage,
    totalPages,
    pageItems,
    filtered,
    filteredCount: filtered.length,
    totalCount: items.length,
    pageSize,
  };
}

/**
 * Search input + count badge.
 */
export function SearchBar({ value, onChange, placeholder = "Buscar...", filteredCount, totalCount, testIdPrefix = "table" }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative flex-1 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
          data-testid={`${testIdPrefix}-search-input`}
        />
      </div>
      <div className="text-xs text-slate-500 tabular-nums" data-testid={`${testIdPrefix}-count`}>
        <span className="font-bold">{filteredCount}</span>
        {filteredCount !== totalCount && <span className="text-slate-400"> / {totalCount}</span>}
        <span className="text-slate-400 ml-1">resultados</span>
      </div>
    </div>
  );
}

/**
 * Pagination control. Renders nothing when totalPages < 2.
 */
export function Pagination({ page, totalPages, onPage, testIdPrefix = "table" }) {
  if (totalPages < 2) return null;
  const go = (p) => onPage(Math.max(1, Math.min(totalPages, p)));
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const pages = Array.from({ length: Math.min(windowSize, totalPages) }, (_, i) => start + i);
  return (
    <div className="flex items-center justify-between gap-2 mt-4 px-1" data-testid={`${testIdPrefix}-pagination`}>
      <span className="text-xs text-slate-500">Página <span className="font-bold tabular-nums">{page}</span> de <span className="tabular-nums">{totalPages}</span></span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Anterior"
          data-testid={`${testIdPrefix}-page-prev`}
        ><ChevronLeft size={14}/></button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => go(p)}
            className={`px-2.5 py-1 rounded text-xs font-bold tabular-nums ${p === page ? "bg-blue-700 text-white" : "border border-slate-200 hover:bg-slate-100"}`}
            data-testid={`${testIdPrefix}-page-${p}`}
          >{p}</button>
        ))}
        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Siguiente"
          data-testid={`${testIdPrefix}-page-next`}
        ><ChevronRight size={14}/></button>
      </div>
    </div>
  );
}
